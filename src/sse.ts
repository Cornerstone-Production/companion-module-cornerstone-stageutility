import { randomUUID } from 'node:crypto'
import { EventSource } from 'eventsource'

// Event names emitted by Stage Utility on GET /api/events that this module cares
// about. The app also emits integrations:state-changed / display:refresh /
// update:status, which we intentionally ignore: the first carries connection
// and config state for the settings panel, while the live status a button
// needs — is OBS rolling, is Resi on air — arrives on the per-integration
// channels below.
export const SSE_EVENTS = [
	'server:hello',
	'stage:state-changed',
	'pco:live',
	'propresenter:status',
	'prodcom:transcript',
	'wireless:connections-changed',
	'people:count',
	'companion:signals',
	'obs:status',
	'reaper:status',
	'resi:status',
	'youtube:status',
] as const

export type SseEventName = (typeof SSE_EVENTS)[number]

export interface SseHandlers {
	onOpen: () => void
	onError: () => void
	onEvent: (name: SseEventName, data: unknown) => void
}

// Wraps an EventSource to the app's /api/events stream. The `eventsource`
// package auto-reconnects per the SSE spec; we surface open/error so the module
// can flip connection status and re-hydrate after a drop.
export class SseClient {
	private es: EventSource | null = null
	/** Identifies this stream so the server can attach a channel filter to it. */
	private readonly cid = `companion-${randomUUID()}`

	constructor(
		private readonly base: string,
		private readonly handlers: SseHandlers,
	) {}

	start(): void {
		this.stop()
		// ?client=companion marks this stream so the server counts it as a
		// connected Companion client (shown in the app's integration panel).
		// ?cid identifies it so the subscribe call below can narrow what it
		// receives — without one the server has no filter to attach and falls
		// back to sending every channel.
		const es = new EventSource(`${this.base}/api/events?client=companion&cid=${encodeURIComponent(this.cid)}`)
		this.es = es

		es.addEventListener('open', () => {
			// Report the channels this module actually reads. The server skips
			// everything else for this connection — most importantly the 4 Hz
			// spl:metrics stream, which was arriving on every stage and being
			// discarded here.
			//
			// Sent on every open, not just the first: the server holds the filter
			// in memory against the cid, so a restart of the app would otherwise
			// leave this stream unfiltered until Companion reconnected.
			void this.reportChannels()
			this.handlers.onOpen()
		})
		es.addEventListener('error', () => this.handlers.onError())

		for (const name of SSE_EVENTS) {
			es.addEventListener(name, (ev: MessageEvent) => {
				let parsed: unknown
				try {
					parsed = ev.data ? JSON.parse(ev.data as string) : null
				} catch {
					parsed = null
				}
				this.handlers.onEvent(name, parsed)
			})
		}
	}

	/**
	 * Tell the server which channels to send.
	 *
	 * Best-effort: filtering is an optimisation, never a correctness dependency.
	 * An older server without the route, or a failed request, simply means the
	 * stream stays unfiltered — which is what happened before this existed.
	 */
	private async reportChannels(): Promise<void> {
		try {
			await fetch(`${this.base}/api/events/subscribe`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cid: this.cid, channels: [...SSE_EVENTS] }),
			})
		} catch {
			// Unfiltered is correct, just noisier.
		}
	}

	stop(): void {
		if (this.es) {
			this.es.close()
			this.es = null
		}
	}
}
