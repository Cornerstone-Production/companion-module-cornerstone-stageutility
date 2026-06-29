import { InstanceBase, InstanceStatus, runEntrypoint, type SomeCompanionConfigField } from '@companion-module/base'
import { ApiClient } from './api.js'
import { baseUrl, GetConfigFields, type ModuleConfig } from './config.js'
import { StateCache } from './state.js'
import { SseClient, type SseEventName } from './sse.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { SetVariableValues, UpdateVariableDefinitions } from './variables.js'
import { UpdatePresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import type { PcoLiveDTO, PeopleCountDTO, ProPresenterStatusDTO, StageStateDTO, TranscriptLineDTO } from './types.js'

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
]

export default class ModuleInstance extends InstanceBase<ModuleConfig> {
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
			this.checkAllFeedbacks()
			this.updateStatus(InstanceStatus.Ok, health.name ?? undefined)
			this.startSse()
		} catch (err) {
			this.updateStatus(InstanceStatus.ConnectionFailure, err instanceof Error ? err.message : String(err))
			this.scheduleRetry()
		}
	}

	/** Pull every list + live snapshot into the cache. */
	private async hydrate(): Promise<void> {
		const [stage, views, outputs, serviceTypes, presets, channels, pcoLive, propresenter, peopleCount] =
			await Promise.all([
				this.api.getState(),
				this.api.getViews(),
				this.api.getOutputs(),
				this.api.getServiceTypes(),
				this.api.getPresets(),
				this.api.getChannels(),
				this.api.getPcoLive().catch(() => null),
				this.api.getProPresenter().catch(() => null),
				this.api.getPeopleCount().catch(() => null),
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
					this.checkAllFeedbacks()
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
					this.checkAllFeedbacks()
				})
				.catch(() => undefined)
		}, seconds * 1000)
	}

	private refreshDefinitions(): void {
		// Re-run action/feedback definitions so dropdown choices reflect the cache.
		this.updateActions()
		this.updateFeedbacks()
	}

	private checkAllFeedbacks(): void {
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

runEntrypoint(ModuleInstance, UpgradeScripts)
