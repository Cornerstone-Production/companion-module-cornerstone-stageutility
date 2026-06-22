import type {
	DeviceStatusDTO,
	OutputDTO,
	PcoLiveDTO,
	PlanDTO,
	PresetDTO,
	ProPresenterStatusDTO,
	ServiceTypeDTO,
	StageStateDTO,
	ViewDTO,
} from './types.js'

// Single source of truth the SSE stream writes to; actions/feedbacks/variables
// read from here. Everything is nullable until the first hydrate completes.
export class StateCache {
	stage: StageStateDTO | null = null
	pcoLive: PcoLiveDTO | null = null
	propresenter: ProPresenterStatusDTO | null = null

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

	/** True while a live item's countdown has passed zero. */
	isOvertime(): boolean {
		const s = this.countdownSeconds()
		return this.pcoLive?.mode === 'item' && s !== null && s < 0
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
