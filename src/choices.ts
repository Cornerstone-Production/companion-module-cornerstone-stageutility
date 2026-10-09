import type { DropdownChoice } from '@companion-module/base'
import type { StateCache } from './state.js'
import { EVERYONE } from './messages.js'

export const NONE_ID = '__none__'
export const ANY_ID = '__any__'

export function viewChoices(state: StateCache, includeNone: boolean): DropdownChoice[] {
	const list: DropdownChoice[] = state.views.map((v) => ({ id: v.id, label: `${v.name} (${v.kind})` }))
	return includeNone ? [{ id: NONE_ID, label: '(None — blank screen)' }, ...list] : list
}

export function outputChoices(state: StateCache): DropdownChoice[] {
	return state.outputs.map((o) => ({ id: o.id, label: o.name }))
}

export function serviceTypeChoices(state: StateCache): DropdownChoice[] {
	return state.serviceTypes.map((s) => ({ id: s.id, label: s.name }))
}

export function planChoices(state: StateCache): DropdownChoice[] {
	return state.plans.map((p) => ({ id: p.id, label: p.seriesTitle ? `${p.seriesTitle} — ${p.title}` : p.title }))
}

export function presetChoices(state: StateCache): DropdownChoice[] {
	return state.presets.map((p) => ({ id: p.id, label: p.name }))
}

export function channelChoices(state: StateCache, includeAny: boolean): DropdownChoice[] {
	const list: DropdownChoice[] = state.channels.map((c) => ({ id: c.channelId, label: c.name ?? c.channelId }))
	return includeAny ? [{ id: ANY_ID, label: 'Any channel' }, ...list] : list
}

/** Zone choices for the people-count feedback; ANY_ID = the building total. */
export function peopleZoneChoices(state: StateCache): DropdownChoice[] {
	const zones = state.peopleCount?.zones ?? []
	return [{ id: ANY_ID, label: 'Building total' }, ...zones.map((z) => ({ id: z.id, label: z.name }))]
}

/** Each group by its current name. */
function groupChoices(state: StateCache): DropdownChoice[] {
	return (state.messages?.groups ?? []).map((g) => ({ id: g.id, label: g.name }))
}

/** Where a message can go: Everyone, then each group. */
export function messageTargetChoices(state: StateCache): DropdownChoice[] {
	return [{ id: EVERYONE, label: 'Everyone' }, ...groupChoices(state)]
}

/** Group filter for the alert feedback; ANY_ID = an alert to any group. */
export function alertGroupChoices(state: StateCache): DropdownChoice[] {
	return [{ id: ANY_ID, label: 'Any group' }, ...groupChoices(state)]
}

/** The quick messages. The text is the id, so what a button stored is what it
 *  sends, and two identical texts are one choice: an id is unique in a dropdown. */
export function quickMessageChoices(state: StateCache): DropdownChoice[] {
	return [...new Set(state.quickMessages)].map((text) => ({ id: text, label: text }))
}

/** First choice id (for a dropdown `default`), or '' when the list is empty. */
export function firstId(choices: DropdownChoice[]): string {
	return choices.length > 0 ? String(choices[0].id) : ''
}
