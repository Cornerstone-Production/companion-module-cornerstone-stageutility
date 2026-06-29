import type { DropdownChoice } from '@companion-module/base'
import type { StateCache } from './state.js'

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

/** First choice id (for a dropdown `default`), or '' when the list is empty. */
export function firstId(choices: DropdownChoice[]): string {
	return choices.length > 0 ? String(choices[0].id) : ''
}
