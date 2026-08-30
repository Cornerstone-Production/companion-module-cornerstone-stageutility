import { combineRgb, type CompanionPresetDefinitions, type CompanionPresetSection } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { StageUtilityInstanceTypes } from './types.js'
import { ANY_ID } from './choices.js'

const ID = 'cornerstone-stageutility'
const v = (name: string) => `$(${ID}:${name})`

const RED = combineRgb(200, 30, 30)
const YELLOW = combineRgb(220, 180, 0)
const ORANGE = combineRgb(220, 120, 0)
const GREEN = combineRgb(0, 150, 70)
const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const DARK = combineRgb(0, 0, 0)

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions<StageUtilityInstanceTypes> = {
		live_next: {
			type: 'simple',
			name: 'PCO Live: Next (with countdown)',
			style: {
				text: `NEXT\\n${v('countdown_seconds')}`,
				size: 'auto',
				color: WHITE,
				bgcolor: DARK,
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: 'live_next', options: {} }], up: [] }],
			feedbacks: [{ feedbackId: 'countdown_overtime', options: {}, style: { bgcolor: RED, color: WHITE } }],
		},
		// A lamp, not a button: it does nothing on press. "Is a service live" is
		// something an operator glances at, and the honest source for it is PCO
		// Services Live -- not a stream or a recorder, which answer different
		// questions and are on well before a service starts.
		service_live: {
			type: 'simple',
			name: 'Service is live (indicator)',
			style: {
				text: `SERVICE\n${v('live_mode')}`,
				size: 'auto',
				color: WHITE,
				bgcolor: DARK,
				show_topbar: false,
			},
			steps: [],
			feedbacks: [
				{ feedbackId: 'service_is_live', options: { state: 'item' }, style: { bgcolor: GREEN, color: WHITE } },
			],
		},
		live_previous: {
			type: 'simple',
			name: 'PCO Live: Previous',
			style: { text: 'PREV', size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'live_previous', options: {} }], up: [] }],
			feedbacks: [],
		},
		refresh_lineup: {
			type: 'simple',
			name: 'Refresh lineup (with last synced)',
			style: { text: `REFRESH\\n${v('last_synced')}`, size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'refresh_lineup', options: {} }], up: [] }],
			feedbacks: [],
		},
		reload_displays: {
			type: 'simple',
			name: 'Reload all kiosk displays',
			style: { text: 'RELOAD\\nSCREENS', size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'refresh_displays', options: { scope: 'all', output: '' } }], up: [] }],
			feedbacks: [],
		},
		blackout: {
			type: 'simple',
			name: 'Blackout a screen (toggle, lit when black)',
			style: { text: 'BLACK\\nOUT', size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'blackout', options: { output: '', mode: 'toggle' } }], up: [] }],
			feedbacks: [{ feedbackId: 'output_blackout', options: { output: '' }, style: { bgcolor: RED, color: WHITE } }],
		},
		plan_mode: {
			type: 'simple',
			name: 'Set Manual mode (lit when Manual)',
			style: { text: `MODE\\n${v('plan_mode')}`, size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'set_plan_mode', options: { mode: 'manual' } }], up: [] }],
			feedbacks: [{ feedbackId: 'plan_mode_manual', options: {}, style: { bgcolor: ORANGE, color: BLACK } }],
		},
		battery_alarm: {
			type: 'simple',
			name: 'Mic battery alarm (lowest battery)',
			style: {
				text: `BATT\\n${v('lowest_battery_pct')}%\\n${v('lowest_battery_channel')}`,
				size: 'auto',
				color: WHITE,
				bgcolor: DARK,
				show_topbar: false,
			},
			steps: [{ down: [], up: [] }],
			feedbacks: [
				{
					feedbackId: 'mic_battery_low',
					options: { threshold: 20, channel: ANY_ID },
					style: { bgcolor: YELLOW, color: BLACK },
				},
			],
		},
		mic_offline: {
			type: 'simple',
			name: 'Any mic offline / RF dropout',
			style: {
				text: `MICS\\n${v('mics_online')}/${v('mics_total')}`,
				size: 'auto',
				color: WHITE,
				bgcolor: DARK,
				show_topbar: false,
			},
			steps: [{ down: [], up: [] }],
			feedbacks: [{ feedbackId: 'mic_offline', options: { channel: ANY_ID }, style: { bgcolor: RED, color: WHITE } }],
		},
		propresenter_status: {
			type: 'simple',
			name: 'ProPresenter status / current item',
			style: { text: `PRO\\n${v('current_item')}`, size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [], up: [] }],
			feedbacks: [{ feedbackId: 'propresenter_disconnected', options: {}, style: { bgcolor: RED, color: WHITE } }],
		},
		obs_recording: {
			type: 'simple',
			name: 'OBS recording (with duration)',
			style: {
				text: `OBS\\n${v('obs_timecode')}`,
				size: 'auto',
				color: WHITE,
				bgcolor: DARK,
				show_topbar: false,
			},
			steps: [{ down: [], up: [] }],
			feedbacks: [{ feedbackId: 'obs_active', options: { mode: 'recording' }, style: { bgcolor: RED, color: WHITE } }],
		},
		reaper_recording: {
			type: 'simple',
			name: 'REAPER recording (with position)',
			style: {
				text: `REAPER\\n${v('reaper_position')}`,
				size: 'auto',
				color: WHITE,
				bgcolor: DARK,
				show_topbar: false,
			},
			steps: [{ down: [], up: [] }],
			feedbacks: [{ feedbackId: 'reaper_recording', options: {}, style: { bgcolor: RED, color: WHITE } }],
		},
		stream_live: {
			type: 'simple',
			name: 'On air (any streaming platform)',
			style: { text: 'ON\\nAIR', size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [], up: [] }],
			feedbacks: [
				{ feedbackId: 'stream_live', options: { platform: ANY_ID }, style: { bgcolor: GREEN, color: WHITE } },
			],
		},
	}

	// v2 takes the grouping separately: sections reference preset ids, rather
	// than each preset naming its own category.
	const sections: CompanionPresetSection<StageUtilityInstanceTypes>[] = [
		{ id: 'live_control', name: 'Live Control', definitions: ['live_next', 'live_previous', 'refresh_lineup'] },
		{ id: 'routing_displays', name: 'Routing & Displays', definitions: ['reload_displays', 'blackout', 'plan_mode'] },
		{
			id: 'monitoring_alarms',
			name: 'Monitoring & Alarms',
			definitions: ['battery_alarm', 'mic_offline', 'propresenter_status'],
		},
		{
			id: 'recording_streaming',
			name: 'Recording & Streaming',
			definitions: ['obs_recording', 'reaper_recording', 'stream_live'],
		},
	]
	self.setPresetDefinitions(sections, presets)
}
