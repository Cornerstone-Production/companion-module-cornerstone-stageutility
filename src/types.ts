import type { ModuleConfig } from './config.js'
// Partial mirrors of the Stage Utility API DTOs this module consumes. Only the
// fields we read are declared. Source of truth: the app's main/types/stage.ts.

export interface HealthDTO {
	ok: boolean
	app?: string
	version?: string
	name?: string
}

export interface ViewDTO {
	id: string
	name: string
	kind: string
}

export interface OutputDTO {
	id: string
	name: string
	viewId: string | null
}

export interface ServiceTypeDTO {
	id: string
	name: string
}

export interface PlanDTO {
	id: string
	title: string
	seriesTitle: string | null
}

export interface PresetDTO {
	id: string
	name: string
}

export interface SlotDeviceDTO {
	status: 'none' | 'ok' | 'warn' | 'error'
	rf: number | null
	battery: number | null
	freq: string | null
}

export interface ResolvedOutputDTO {
	viewId: string | null
	kind: string
	viewName: string | null
	blackout?: boolean
}

// A flat wireless channel from GET /api/integrations/wireless/channels.
export interface DeviceStatusDTO {
	channelId: string
	name: string | null
	online: boolean
	rfBars: number | null
	battery: number | null
	frequencyLabel: string | null
}

export interface StageStateDTO {
	serviceTypeId: string | null
	serviceTypeName: string | null
	planMode: 'auto' | 'manual'
	planTitle: string | null
	planSeriesTitle: string | null
	lastRefreshedAt: string | null
	showQr: boolean
	views: ViewDTO[]
	outputs: OutputDTO[]
	resolvedByOutput: Record<string, ResolvedOutputDTO>
}

export interface PcoLiveDTO {
	mode: 'item' | 'preservice' | 'none'
	label: string | null
	lengthSec: number | null
	targetAt: string | null
	serverNow: string
}

export interface ProTimerDTO {
	name: string
	time: string
	state: string
}

export interface ProPresenterStatusDTO {
	connected: boolean
	currentItem: string | null
	nextItem: string | null
	slideIndex: number | null
	slideCount: number | null
}

export interface TranscriptLineDTO {
	channel: string | null
	channelName: string | null
	text: string
	isFinal: boolean
	at: string
}

export interface PeopleZoneCountDTO {
	id: string
	name: string
	attendance: number
	occupancy: number
}

export interface PeopleCountDTO {
	connected: boolean
	updatedAt: string | null
	total: { attendance: number | null; occupancy: number | null }
	zones: PeopleZoneCountDTO[]
}

/**
 * What this instance looks like to the SDK.
 *
 * v1 parameterised `InstanceBase` on the config type alone. v2 takes this whole
 * record and uses it to type every callback — which is why the upgrade first
 * surfaced as fifteen "implicitly any" errors rather than one.
 *
 * Declaring the ids and their options here is the point of v2: an action or
 * feedback callback now knows its own option names and types, so a typo in
 * `event.options.<name>` is a compile error instead of an undefined at runtime
 * during a service. Adding an action means adding a line here — and forgetting
 * to is also a compile error.
 *
 * Option types match what Companion actually delivers: a dropdown yields
 * `string | number`, a number field yields `number`, a textinput yields
 * `string`.
 */

/** Options carried by each action id. */
export type StageUtilityActions = {
	live_next: { options: Record<string, never> }
	live_previous: { options: Record<string, never> }
	refresh_lineup: { options: Record<string, never> }
	plan_next: { options: Record<string, never> }
	set_plan: { options: { plan: string | number } }
	set_service_type: { options: { serviceType: string | number } }
	set_plan_mode: { options: { mode: string | number } }
	route_view: { options: { output: string | number; view: string | number } }
	blackout: { options: { output: string | number; mode: string | number } }
	refresh_displays: { options: { scope: string | number; output: string | number } }
	apply_preset: { options: { preset: string | number } }
	show_qr: { options: { mode: string | number } }
}

/** Options carried by each feedback id, and the kind of feedback it is. */
export type StageUtilityFeedbacks = {
	countdown_overtime: { type: 'boolean'; options: Record<string, never> }
	mic_battery_low: { type: 'boolean'; options: { threshold: number; channel: string | number } }
	mic_offline: { type: 'boolean'; options: { channel: string | number } }
	propresenter_disconnected: { type: 'boolean'; options: Record<string, never> }
	plan_mode_manual: { type: 'boolean'; options: Record<string, never> }
	output_shows_view: { type: 'boolean'; options: { output: string | number; view: string | number } }
	output_blackout: { type: 'boolean'; options: { output: string | number } }
	occupancy_over: { type: 'boolean'; options: { threshold: number; zone: string | number } }
	people_count_text: {
		type: 'advanced'
		options: { metric: string | number; zone: string | number; prefix: string; suffix: string }
	}
	captions_idle: { type: 'boolean'; options: { seconds: number } }
}

/** The record v2's `InstanceBase` is parameterised on. */
export interface StageUtilityInstanceTypes {
	config: ModuleConfig
	secrets: undefined
	actions: StageUtilityActions
	feedbacks: StageUtilityFeedbacks
	variables: Record<string, string | number | boolean | undefined>
}
