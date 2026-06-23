import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { ANY_ID, channelChoices, firstId, outputChoices, viewChoices } from './choices.js'

const RED = combineRgb(200, 30, 30)
const YELLOW = combineRgb(220, 180, 0)
const ORANGE = combineRgb(220, 120, 0)
const GREEN = combineRgb(0, 150, 70)
const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

export function UpdateFeedbacks(self: ModuleInstance): void {
	const channels = channelChoices(self.state, true)
	const outputs = outputChoices(self.state)
	const views = viewChoices(self.state, false)

	self.setFeedbackDefinitions({
		countdown_overtime: {
			name: 'PCO countdown is in overtime',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => self.state.isOvertime(),
		},
		mic_battery_low: {
			name: 'Mic battery low',
			type: 'boolean',
			defaultStyle: { bgcolor: YELLOW, color: BLACK },
			options: [
				{ id: 'threshold', type: 'number', label: 'Below %', default: 20, min: 0, max: 100 },
				{ id: 'channel', type: 'dropdown', label: 'Channel', choices: channels, default: ANY_ID },
			],
			callback: (fb) => {
				const threshold = Number(fb.options.threshold)
				const list = self.state.onlineChannels().filter((c) => c.battery != null)
				const scoped = fb.options.channel === ANY_ID ? list : list.filter((c) => c.channelId === fb.options.channel)
				return scoped.some((c) => (c.battery as number) < threshold)
			},
		},
		mic_offline: {
			name: 'Mic offline / RF dropout',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [{ id: 'channel', type: 'dropdown', label: 'Channel', choices: channels, default: ANY_ID }],
			callback: (fb) => {
				if (fb.options.channel === ANY_ID) return self.state.channels.some((c) => !c.online)
				const c = self.state.channels.find((x) => x.channelId === fb.options.channel)
				return c ? !c.online : false
			},
		},
		propresenter_disconnected: {
			name: 'ProPresenter disconnected',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => self.state.propresenter !== null && !self.state.propresenter.connected,
		},
		plan_mode_manual: {
			name: 'Plan mode is Manual',
			type: 'boolean',
			defaultStyle: { bgcolor: ORANGE, color: BLACK },
			options: [],
			callback: () => self.state.stage?.planMode === 'manual',
		},
		output_shows_view: {
			name: 'Output is showing a specific View',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [
				{ id: 'output', type: 'dropdown', label: 'Output (screen)', choices: outputs, default: firstId(outputs) },
				{ id: 'view', type: 'dropdown', label: 'View', choices: views, default: firstId(views) },
			],
			callback: (fb) => self.state.stage?.resolvedByOutput[String(fb.options.output)]?.viewId === fb.options.view,
		},
		captions_idle: {
			name: 'Captions idle (no recent line)',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(70, 70, 70), color: WHITE },
			options: [{ id: 'seconds', type: 'number', label: 'Idle after (s)', default: 30, min: 1, max: 3600 }],
			callback: (fb) => {
				if (self.state.lastCaptionAt === 0) return true
				return Date.now() - self.state.lastCaptionAt > Number(fb.options.seconds) * 1000
			},
		},
	})
}
