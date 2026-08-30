import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { ApiClient } from './api.js'
import { baseUrl, GetConfigFields, type ModuleConfig } from './config.js'
import { StateCache } from './state.js'
import { SseClient, type SseEventName } from './sse.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { SetVariableValues, UpdateVariableDefinitions } from './variables.js'
import { UpdatePresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import type {
	ObsStatusDTO,
	PcoLiveDTO,
	PeopleCountDTO,
	ProPresenterStatusDTO,
	ReaperStatusDTO,
	SignalStateDTO,
	StageStateDTO,
	StreamStatusDTO,
	TranscriptLineDTO,
	StageUtilityInstanceTypes,
} from './types.js'

const RETRY_MS = 5000

const ALL_FEEDBACKS = [
	'countdown_overtime',
	'mic_battery_low',
	'mic_offline',
	'propresenter_disconnected',
	'plan_mode_manual',
	'output_shows_view',
	'output_blackout',
	'captions_idle',
	'occupancy_over',
	'people_count_text',
	'obs_active',
	'reaper_recording',
	'stream_live',
	'integration_disconnected',
] as const

export default class ModuleInstance extends InstanceBase<StageUtilityInstanceTypes> {
	config!: ModuleConfig
	api!: ApiClient
	state = new StateCache()

	private sse: SseClient | null = null
	private ticker: ReturnType<typeof setInterval> | null = null
	private retryTimer: ReturnType<typeof setTimeout> | null = null
	private pollTimer: ReturnType<typeof setInterval> | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.api = new ApiClient(baseUrl(config))
		this.updateStatus(InstanceStatus.Connecting)

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()

		this.startTicker()
		if (config.pollFallbackSec > 0) this.startPoll(config.pollFallbackSec)
		await this.connect()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.teardown()
		this.config = config
		this.api = new ApiClient(baseUrl(config))
		this.updateStatus(InstanceStatus.Connecting)
		this.startTicker()
		if (config.pollFallbackSec > 0) this.startPoll(config.pollFallbackSec)
		await this.connect()
	}

	async destroy(): Promise<void> {
		this.teardown()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}
	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}
	updatePresets(): void {
		UpdatePresets(this)
	}
	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	// ── Connection ──────────────────────────────────────────────────────────

	private async connect(): Promise<void> {
		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the Stage Utility host')
			return
		}
		try {
			const health = await this.api.health()
			if (!health.ok || (health.app && health.app !== 'stage-utility')) {
				throw new Error('Not a Stage Utility server')
			}
			await this.hydrate()
			this.refreshDefinitions()
			SetVariableValues(this)
			this.refreshFeedbacks()
			this.updateStatus(InstanceStatus.Ok, health.name ?? undefined)
			this.startSse()
		} catch (err) {
			this.updateStatus(InstanceStatus.ConnectionFailure, err instanceof Error ? err.message : String(err))
			this.scheduleRetry()
		}
	}

	/** Pull every list + live snapshot into the cache. */
	private async hydrate(): Promise<void> {
		const [
			stage,
			views,
			outputs,
			serviceTypes,
			presets,
			channels,
			pcoLive,
			propresenter,
			peopleCount,
			obs,
			reaper,
			resi,
			youtube,
		] = await Promise.all([
			this.api.getState(),
			this.api.getViews(),
			this.api.getOutputs(),
			this.api.getServiceTypes(),
			this.api.getPresets(),
			this.api.getChannels(),
			this.api.getPcoLive().catch(() => null),
			this.api.getProPresenter().catch(() => null),
			this.api.getPeopleCount().catch(() => null),
			// Status endpoints an older server may not have: a missing one leaves
			// that integration's cache as it was rather than failing the hydrate.
			this.api.getObs().catch(() => null),
			this.api.getReaper().catch(() => null),
			this.api.getResi().catch(() => null),
			this.api.getYouTube().catch(() => null),
		])
		this.state.stage = stage
		this.state.views = views
		this.state.outputs = outputs
		this.state.serviceTypes = serviceTypes
		this.state.presets = presets
		this.state.channels = channels
		if (pcoLive) this.applyPcoLive(pcoLive)
		if (propresenter) this.state.propresenter = propresenter
		if (peopleCount) this.state.peopleCount = peopleCount
		if (obs) this.state.obs = obs
		if (reaper) this.state.reaper = reaper
		if (resi) this.state.resi = resi
		if (youtube) this.state.youtube = youtube
		if (stage.serviceTypeId) {
			this.state.plans = await this.api.getPlans(stage.serviceTypeId).catch(() => [])
		}
	}

	private scheduleRetry(): void {
		if (this.retryTimer) return
		this.retryTimer = setTimeout(() => {
			this.retryTimer = null
			void this.connect()
		}, RETRY_MS)
	}

	private startSse(): void {
		this.sse = new SseClient(baseUrl(this.config), {
			onOpen: () => this.updateStatus(InstanceStatus.Ok),
			onError: () => this.updateStatus(InstanceStatus.ConnectionFailure, 'Event stream lost — retrying'),
			onEvent: (name, data) => this.onSseEvent(name, data),
		})
		this.sse.start()
	}

	private onSseEvent(name: SseEventName, data: unknown): void {
		switch (name) {
			case 'server:hello':
				// Re-hydrate so we catch anything missed while disconnected.
				void this.hydrate().then(() => {
					this.refreshDefinitions()
					SetVariableValues(this)
					this.refreshFeedbacks()
				})
				break
			case 'stage:state-changed': {
				const stage = data as StageStateDTO
				this.state.stage = stage
				this.state.views = stage.views
				this.state.outputs = stage.outputs
				this.refreshDefinitions()
				SetVariableValues(this)
				this.checkFeedbacks('plan_mode_manual', 'output_shows_view', 'output_blackout')
				break
			}
			case 'pco:live':
				this.applyPcoLive(data as PcoLiveDTO)
				SetVariableValues(this)
				this.checkFeedbacks('countdown_overtime')
				break
			case 'propresenter:status':
				this.state.propresenter = data as ProPresenterStatusDTO
				SetVariableValues(this)
				this.checkFeedbacks('propresenter_disconnected')
				break
			case 'prodcom:transcript': {
				const line = data as TranscriptLineDTO
				if (line && line.isFinal) {
					this.state.lastCaptionText = line.text
					this.state.lastCaptionSpeaker = line.channelName ?? line.channel ?? ''
					this.state.lastCaptionAt = Date.now()
					SetVariableValues(this)
					this.checkFeedbacks('captions_idle')
				}
				break
			}
			case 'people:count': {
				const people = data as PeopleCountDTO
				const prevZones = this.state.peopleCount?.zones.length ?? 0
				this.state.peopleCount = people
				// Per-zone variables are dynamic — re-declare them when the zone set changes.
				if (people.zones.length !== prevZones) this.updateVariableDefinitions()
				SetVariableValues(this)
				this.checkFeedbacks('occupancy_over', 'people_count_text')
				break
			}
			case 'companion:signals': {
				const next = data as Record<string, SignalStateDTO>
				const changed = Object.keys(next).length !== Object.keys(this.state.signals).length
				this.state.signals = next
				// A new signal name needs a new variable declared before it can hold a value.
				if (changed) this.updateVariableDefinitions()
				SetVariableValues(this)
				this.checkFeedbacks('signal_is', 'signal_error')
				break
			}
			case 'obs:status':
				this.state.obs = data as ObsStatusDTO
				SetVariableValues(this)
				this.checkFeedbacks('obs_active', 'integration_disconnected')
				break
			case 'reaper:status':
				this.state.reaper = data as ReaperStatusDTO
				SetVariableValues(this)
				this.checkFeedbacks('reaper_recording', 'integration_disconnected')
				break
			case 'resi:status':
				this.state.resi = data as StreamStatusDTO
				SetVariableValues(this)
				this.checkFeedbacks('stream_live', 'integration_disconnected')
				break
			case 'youtube:status':
				this.state.youtube = data as StreamStatusDTO
				SetVariableValues(this)
				this.checkFeedbacks('stream_live', 'integration_disconnected')
				break
			case 'wireless:connections-changed':
				void this.api
					.getChannels()
					.then((channels) => {
						this.state.channels = channels
						this.refreshDefinitions()
						SetVariableValues(this)
						this.checkFeedbacks('mic_battery_low', 'mic_offline')
					})
					.catch(() => undefined)
				break
		}
	}

	private applyPcoLive(live: PcoLiveDTO): void {
		this.state.pcoLive = live
		const serverNow = Date.parse(live.serverNow)
		if (Number.isFinite(serverNow)) this.state.clockOffsetMs = serverNow - Date.now()
	}

	// ── Timers ────────────────────────────────────────────────────────────────

	private startTicker(): void {
		this.stopTicker()
		// Tick the countdown locally between ~1.5s pco:live updates and re-check
		// the time-relative feedbacks.
		this.ticker = setInterval(() => {
			SetVariableValues(this)
			this.checkFeedbacks('countdown_overtime', 'captions_idle')
		}, 1000)
	}
	private stopTicker(): void {
		if (this.ticker) clearInterval(this.ticker)
		this.ticker = null
	}

	private startPoll(seconds: number): void {
		this.pollTimer = setInterval(() => {
			void this.hydrate()
				.then(() => {
					this.refreshDefinitions()
					SetVariableValues(this)
					this.refreshFeedbacks()
				})
				.catch(() => undefined)
		}, seconds * 1000)
	}

	private refreshDefinitions(): void {
		// Re-run action/feedback definitions so dropdown choices reflect the cache.
		this.updateActions()
		this.updateFeedbacks()
	}

	// Renamed: v2 gives InstanceBase its own checkAllFeedbacks, and a private
	// method of the same name collides with it.
	private refreshFeedbacks(): void {
		this.checkFeedbacks(...ALL_FEEDBACKS)
	}

	private teardown(): void {
		this.sse?.stop()
		this.sse = null
		this.stopTicker()
		if (this.retryTimer) clearTimeout(this.retryTimer)
		this.retryTimer = null
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.pollTimer = null
	}
}

// v2 removed runEntrypoint. Companion now imports the class as the default
// export and the upgrade scripts as a named one — so the scripts that migrate a
// user's saved config between module versions still have to be exported here,
// or an upgrade silently drops their settings.
export { UpgradeScripts }
