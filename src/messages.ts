// Stage messages: the pure parts. What the variables read off a messages:state
// frame, which alerts a feedback counts, and the body a send posts. Nothing here
// touches the module instance, so each rule can be tested without one.

import type { MessageGroupDTO, MessagesStateDTO, StageMessageDTO } from './types.js'

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

/**
 * The `to` a send posts. Everyone on its own: the server takes it as the whole
 * list or not at all, and a button that ticked Everyone and a group means
 * Everyone. Null when nothing is picked.
 */
export function sendTargets(picked: (string | number)[]): string[] | null {
	const ids = [...new Set(picked.map(String))]
	if (ids.length === 0) return null
	return ids.includes(EVERYONE) ? [EVERYONE] : ids
}
