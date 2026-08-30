import type {
	DeviceStatusDTO,
	ObsStatusDTO,
	OutputDTO,
	PcoLiveDTO,
	PeopleCountDTO,
	PlanDTO,
	PresetDTO,
	SignalStateDTO,
	ProPresenterStatusDTO,
	ReaperStatusDTO,
	ServiceTypeDTO,
	StageStateDTO,
	StreamStatusDTO,
	ViewDTO,
} from './types.js'

// Single source of truth the SSE stream writes to; actions/feedbacks/variables
// read from here. Everything is nullable until the first hydrate completes.
export class StateCache {
	stage: StageStateDTO | null = null
	pcoLive: PcoLiveDTO | null = null
	propresenter: ProPresenterStatusDTO | null = null
	peopleCount: PeopleCountDTO | null = null
	obs: ObsStatusDTO | null = null
	reaper: ReaperStatusDTO | null = null
	resi: StreamStatusDTO | null = null
	youtube: StreamStatusDTO | null = null

	// Named signals from automation rules, keyed by signal name. Each becomes a
	// $(stage:signal_<name>) variable a Companion Trigger can act on.
	signals: Record<string, SignalStateDTO> = {}

	// Enumeration lists for action dropdowns (fetched on connect + on change).
	views: ViewDTO[] = []
	outputs: OutputDTO[] = []
	serviceTypes: ServiceTypeDTO[] = []
	plans: PlanDTO[] = []
	presets: PresetDTO[] = []
	channels: DeviceStatusDTO[] = []

	// Last final caption line + when we saw it (for the captions-idle feedback).
	lastCaptionText = ''
	lastCaptionSpeaker = ''
	lastCaptionAt = 0

	// Server/client clock skew (ms) recorded from each pco:live serverNow, so the
	// countdown can tick locally between the ~1.5s live updates.
	clockOffsetMs = 0

	/** Adjusted "server now" in epoch ms, using the last recorded skew. */
	serverNowMs(): number {
		return Date.now() + this.clockOffsetMs
	}

	/** Remaining countdown seconds (negative = overtime), or null when idle. */
	countdownSeconds(): number | null {
		const live = this.pcoLive
		if (!live || live.mode === 'none' || !live.targetAt) return null
		const target = Date.parse(live.targetAt)
		if (!Number.isFinite(target)) return null
		return Math.round((target - this.serverNowMs()) / 1000)
	}

	/**
	 * Is a service actually live?
	 *
	 * PCO Services Live is the only signal here that means "a service is running":
	 * `item` is a live item on the plan, driven by whoever is running Live in PCO.
	 * `preservice` is the countdown BEFORE it starts -- a walk-in loop is not the
	 * service -- and `none` is nothing at all.
	 *
	 * Deliberately not a stream or a recorder. Resi reports its ENCODER, which is
	 * started for a soundcheck an hour early; OBS reports that OBS is recording.
	 * Both answer a different question, and using either as "are we live" is what
	 * makes an indicator lie.
	 */
	liveMode(): 'item' | 'preservice' | 'none' {
		return this.pcoLive?.mode ?? 'none'
	}

	/** True while PCO Live is running an item. */
	isServiceLive(): boolean {
		return this.liveMode() === 'item'
	}

	/** True while a live item's countdown has passed zero. */
	isOvertime(): boolean {
		const s = this.countdownSeconds()
		return this.pcoLive?.mode === 'item' && s !== null && s < 0
	}

	/** Seconds a platform has been live, or null when it is not live or the
	 *  platform never said when it started. */
	streamElapsedSeconds(stream: StreamStatusDTO | null): number | null {
		if (!stream?.live || !stream.startedAt) return null
		const started = Date.parse(stream.startedAt)
		if (!Number.isFinite(started)) return null
		return Math.max(0, Math.round((this.serverNowMs() - started) / 1000))
	}

	onlineChannels(): DeviceStatusDTO[] {
		return this.channels.filter((c) => c.online)
	}

	lowestBattery(): { pct: number; channel: string } | null {
		let best: { pct: number; channel: string } | null = null
		for (const c of this.channels) {
			if (!c.online || c.battery == null) continue
			if (best === null || c.battery < best.pct) {
				best = { pct: c.battery, channel: c.name ?? c.channelId }
			}
		}
		return best
	}
}
