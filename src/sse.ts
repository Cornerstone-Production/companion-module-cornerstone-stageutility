import { EventSource } from 'eventsource'

// Event names emitted by Stage Utility on GET /api/events that this module cares
// about. The app also emits integrations:state-changed / display:refresh /
// update:status, which we intentionally ignore.
export const SSE_EVENTS = [
	'server:hello',
	'stage:state-changed',
	'pco:live',
	'propresenter:status',
	'prodcom:transcript',
	'wireless:connections-changed',
	'people:count',
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

	constructor(
		private readonly base: string,
		private readonly handlers: SseHandlers,
	) {}

	start(): void {
		this.stop()
		// ?client=companion marks this stream so the server counts it as a
		// connected Companion client (shown in the app's integration panel).
		const es = new EventSource(`${this.base}/api/events?client=companion`)
		this.es = es

		es.addEventListener('open', () => this.handlers.onOpen())
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

	stop(): void {
		if (this.es) {
			this.es.close()
			this.es = null
		}
	}
}
