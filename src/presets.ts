import { combineRgb, type CompanionPresetDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { ANY_ID } from './choices.js'

const ID = 'cornerstone-stageutility'
const v = (name: string) => `$(${ID}:${name})`

const RED = combineRgb(200, 30, 30)
const YELLOW = combineRgb(220, 180, 0)
const ORANGE = combineRgb(220, 120, 0)
const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const DARK = combineRgb(0, 0, 0)

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions = {
		live_next: {
			type: 'button',
			category: 'Live Control',
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
		live_previous: {
			type: 'button',
			category: 'Live Control',
			name: 'PCO Live: Previous',
			style: { text: 'PREV', size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'live_previous', options: {} }], up: [] }],
			feedbacks: [],
		},
		refresh_lineup: {
			type: 'button',
			category: 'Live Control',
			name: 'Refresh lineup (with last synced)',
			style: { text: `REFRESH\\n${v('last_synced')}`, size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'refresh_lineup', options: {} }], up: [] }],
			feedbacks: [],
		},
		reload_displays: {
			type: 'button',
			category: 'Routing & Displays',
			name: 'Reload all kiosk displays',
			style: { text: 'RELOAD\\nSCREENS', size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'refresh_displays', options: { scope: 'all', output: '' } }], up: [] }],
			feedbacks: [],
		},
		plan_mode: {
			type: 'button',
			category: 'Routing & Displays',
			name: 'Set Manual mode (lit when Manual)',
			style: { text: `MODE\\n${v('plan_mode')}`, size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [{ actionId: 'set_plan_mode', options: { mode: 'manual' } }], up: [] }],
			feedbacks: [{ feedbackId: 'plan_mode_manual', options: {}, style: { bgcolor: ORANGE, color: BLACK } }],
		},
		battery_alarm: {
			type: 'button',
			category: 'Monitoring & Alarms',
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
			type: 'button',
			category: 'Monitoring & Alarms',
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
			type: 'button',
			category: 'Monitoring & Alarms',
			name: 'ProPresenter status / current item',
			style: { text: `PRO\\n${v('current_item')}`, size: 'auto', color: WHITE, bgcolor: DARK, show_topbar: false },
			steps: [{ down: [], up: [] }],
			feedbacks: [{ feedbackId: 'propresenter_disconnected', options: {}, style: { bgcolor: RED, color: WHITE } }],
		},
	}

	self.setPresetDefinitions(presets)
}
