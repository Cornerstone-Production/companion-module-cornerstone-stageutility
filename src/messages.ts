// Stage messages: the pure parts. What the variables read off a messages:state
// frame, which alerts a feedback counts, and the body a send posts. Nothing here
// touches the module instance, so each rule can be tested without one.

import type { StateCache } from './state.js'
import type { MessageGroupDTO, MessagesStateDTO, MessagingConfigDTO, StageMessageDTO } from './types.js'

/** The built-in target that reaches every screen. Mirrors the app's EVERYONE. */
export const EVERYONE = 'everyone'

/** Who the app records as the sender of anything this module posts. */
export const FROM = 'Companion'

/** What a `to` entry reads as once its group has been deleted. */
const REMOVED_GROUP = '(removed group)'

/** A message's groups by name, comma separated; "Everyone" for Everyone. */
export function messageTargets(message: StageMessageDTO, groups: MessageGroupDTO[]): string {
	if (message.to.includes(EVERYONE)) return 'Everyone'
	return message.to.map((id) => groups.find((g) => g.id === id)?.name ?? REMOVED_GROUP).join(', ')
}

/** The entry with the greatest `at`; the last one wins a tie. Null for none. */
function newest<T extends { at: number }>(list: T[]): T | null {
	let best: T | null = null
	for (const item of list) if (best === null || item.at >= best.at) best = item
	return best
}

/** Every variable the messages state feeds. Empty strings while there is nothing. */
export function messageVariableValues(state: MessagesStateDTO | null): Record<string, string | boolean> {
	const last = newest(state?.messages ?? [])
	const reply = newest((state?.messages ?? []).flatMap((m) => m.replies))
	const alert = newest(state?.alerts ?? [])
	return {
		message_last_text: last?.text ?? '',
		message_last_from: last?.from ?? '',
		message_last_to: last ? messageTargets(last, state?.groups ?? []) : '',
		message_reply_text: reply?.text ?? '',
		message_reply_from: reply?.from ?? '',
		message_alert_active: String(alert !== null),
		message_alert_text: alert?.text ?? '',
	}
}

/**
 * Is an alert running that this group's screens would show? A screen shows the
 * alerts sent to one of its groups and the ones sent to Everyone. With no group
 * given, any running alert counts.
 */
export function alertRunning(state: MessagesStateDTO | null, groupId: string | null): boolean {
	const alerts = state?.alerts ?? []
	if (groupId === null) return alerts.length > 0
	return alerts.some((a) => a.to.includes(EVERYONE) || a.to.includes(groupId))
}

/** What a groups option arrives as: a list, or a bare id from an expression. */
export type Picked = string | number | (string | number)[]

/**
 * The `to` a send posts. Everyone on its own: the server takes it as the whole
 * list or not at all, and a button that ticked Everyone and a group means
 * Everyone. Nothing picked is left as an empty list for the server to refuse
 * with its reason.
 */
export function sendTargets(picked: Picked): string[] {
	const ids = [...new Set((Array.isArray(picked) ? picked : [picked]).map(String))]
	return ids.includes(EVERYONE) ? [EVERYONE] : ids
}

/** A messages:state frame, or the answer to GET /api/messages: anything else
 *  (a null payload that failed to parse) is not applied. */
export function isMessagesFrame(data: unknown): data is MessagesStateDTO {
	const frame = data as Partial<MessagesStateDTO> | null
	return (
		!!frame &&
		typeof frame === 'object' &&
		Array.isArray(frame.groups) &&
		Array.isArray(frame.messages) &&
		Array.isArray(frame.alerts)
	)
}

/** The instance methods the messages handlers call, and no more, so each can be
 *  tested without a running module. */
export interface HydrateHost {
	state: StateCache
	updatePresets: () => void
}
export interface FrameHost extends HydrateHost {
	refreshDefinitions: () => void
	refreshVariables: () => void
	checkFeedbacks: (id: 'message_alert_running') => void
}

/**
 * A messages:state frame. Dropdowns are redefined only when a group or the quick
 * list moved, presets only when the quick list did; variables and the alert light
 * follow every frame.
 */
export function applyMessagesFrame(host: FrameHost, data: unknown): void {
	if (!isMessagesFrame(data)) return
	host.state.messagesFrames++
	const { choicesChanged, presetsChanged } = host.state.applyMessages(data)
	if (choicesChanged) host.refreshDefinitions()
	if (presetsChanged) host.updatePresets()
	host.refreshVariables()
	host.checkFeedbacks('message_alert_running')
}

/**
 * The messages part of a hydrate. `framesBefore` is the frame count read before
 * the requests went out: a frame that landed while they were in flight is newer
 * than the snapshot, which is then dropped rather than allowed to overwrite it.
 * A snapshot that could not be read clears what the last server said, so its
 * alerts do not stay lit. The caller redefines dropdowns and re-reads variables
 * after, as it does for everything it hydrates; presets are only redefined here.
 */
export function applyMessagesHydrate(
	host: HydrateHost,
	fetched: { messaging: MessagingConfigDTO | null; messages: MessagesStateDTO | null; framesBefore: number },
): void {
	const { state } = host
	let presetsChanged = false
	if (fetched.messaging) presetsChanged = state.applyMessaging(fetched.messaging).presetsChanged
	if (state.messagesFrames === fetched.framesBefore) {
		if (isMessagesFrame(fetched.messages)) {
			presetsChanged = state.applyMessages(fetched.messages).presetsChanged || presetsChanged
		} else {
			state.messages = null
		}
	}
	if (presetsChanged) host.updatePresets()
}
