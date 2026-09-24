import type ModuleInstance from './main.js'
import { baptismIsPaused } from './baptism.js'
import {
	NONE_ID,
	firstId,
	outputChoices,
	planChoices,
	presetChoices,
	serviceTypeChoices,
	viewChoices,
} from './choices.js'

export function UpdateActions(self: ModuleInstance): void {
	const run = (label: string, fn: () => Promise<unknown>) => async (): Promise<void> => {
		try {
			await fn()
		} catch (err) {
			self.log('warn', `${label} failed: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	const views = viewChoices(self.state, true)
	const outputs = outputChoices(self.state)
	const serviceTypes = serviceTypeChoices(self.state)
	const plans = planChoices(self.state)
	const presets = presetChoices(self.state)

	self.setActionDefinitions({
		live_next: {
			name: 'PCO Live: Next',
			options: [],
			callback: run('Live next', async () => self.api.liveNext()),
		},
		live_previous: {
			name: 'PCO Live: Previous',
			options: [],
			callback: run('Live previous', async () => self.api.livePrevious()),
		},
		refresh_lineup: {
			name: 'Refresh lineup from PCO',
			options: [],
			callback: run('Refresh', async () => self.api.refresh()),
		},
		plan_next: {
			name: 'Jump to next plan',
			options: [],
			callback: run('Next plan', async () => self.api.planNext()),
		},
		set_plan: {
			name: 'Set plan (current service type)',
			options: [{ id: 'plan', type: 'dropdown', label: 'Plan', choices: plans, default: firstId(plans) }],
			callback: async (event) => {
				try {
					await self.api.setPlan(String(event.options.plan))
				} catch (err) {
					self.log('warn', `Set plan failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},
		set_service_type: {
			name: 'Set service type',
			options: [
				{
					id: 'serviceType',
					type: 'dropdown',
					label: 'Service type',
					choices: serviceTypes,
					default: firstId(serviceTypes),
				},
			],
			callback: async (event) => {
				try {
					await self.api.setServiceType(String(event.options.serviceType))
				} catch (err) {
					self.log('warn', `Set service type failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},
		set_plan_mode: {
			name: 'Set plan mode (Auto/Manual)',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'auto', label: 'Auto' },
						{ id: 'manual', label: 'Manual' },
					],
					default: 'auto',
				},
			],
			callback: async (event) => {
				const mode = event.options.mode === 'manual' ? 'manual' : 'auto'
				try {
					await self.api.setPlanMode(mode)
				} catch (err) {
					self.log('warn', `Set plan mode failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},
		route_view: {
			name: 'Route a View onto a screen (Output)',
			options: [
				{ id: 'output', type: 'dropdown', label: 'Output (screen)', choices: outputs, default: firstId(outputs) },
				{ id: 'view', type: 'dropdown', label: 'View', choices: views, default: firstId(views) },
			],
			callback: async (event) => {
				const viewId = event.options.view === NONE_ID ? null : String(event.options.view)
				try {
					await self.api.routeView(String(event.options.output), viewId)
				} catch (err) {
					self.log('warn', `Route view failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},
		blackout: {
			name: 'Blackout a screen (full black) — on/off/toggle',
			options: [
				{ id: 'output', type: 'dropdown', label: 'Output (screen)', choices: outputs, default: firstId(outputs) },
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Action',
					choices: [
						{ id: 'on', label: 'Blackout ON' },
						{ id: 'off', label: 'Blackout OFF' },
						{ id: 'toggle', label: 'Toggle' },
					],
					default: 'toggle',
				},
			],
			callback: async (event) => {
				const outputId = String(event.options.output)
				const current = self.state.stage?.resolvedByOutput[outputId]?.blackout ?? false
				const on = event.options.mode === 'toggle' ? !current : event.options.mode === 'on'
				try {
					await self.api.setBlackout(outputId, on)
				} catch (err) {
					self.log('warn', `Blackout failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},
		refresh_displays: {
			name: 'Reload kiosk display(s)',
			options: [
				{
					id: 'scope',
					type: 'dropdown',
					label: 'Scope',
					choices: [
						{ id: 'all', label: 'All displays' },
						{ id: 'one', label: 'A specific output' },
					],
					default: 'all',
				},
				{
					id: 'output',
					type: 'dropdown',
					label: 'Output (when scope = specific)',
					choices: outputs,
					default: firstId(outputs),
					isVisibleExpression: `$(options:scope) == 'one'`,
				},
			],
			callback: async (event) => {
				const target = event.options.scope === 'one' ? String(event.options.output) : undefined
				try {
					await self.api.refreshDisplays(target)
				} catch (err) {
					self.log('warn', `Refresh displays failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},
		apply_preset: {
			name: 'Apply slot preset',
			options: [{ id: 'preset', type: 'dropdown', label: 'Preset', choices: presets, default: firstId(presets) }],
			callback: async (event) => {
				try {
					await self.api.applyPreset(String(event.options.preset))
				} catch (err) {
					self.log('warn', `Apply preset failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},
		show_qr: {
			name: 'Connect QR: show / hide / toggle',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Action',
					choices: [
						{ id: 'show', label: 'Show' },
						{ id: 'hide', label: 'Hide' },
						{ id: 'toggle', label: 'Toggle' },
					],
					default: 'toggle',
				},
			],
			callback: async (event) => {
				const current = self.state.stage?.showQr ?? false
				const show = event.options.mode === 'toggle' ? !current : event.options.mode === 'show'
				try {
					await self.api.showQr(show)
				} catch (err) {
					self.log('warn', `Show QR failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},

		baptism_start: {
			name: 'Baptism: Start',
			options: [],
			callback: run('Baptism start', async () => self.api.baptismStart()),
		},
		baptism_advance: {
			name: 'Baptism: Advance (phase-aware — whatever the operator panel would do now)',
			options: [],
			callback: run('Baptism advance', async () => self.api.baptismAdvance()),
		},
		baptism_baptized: {
			name: 'Baptism: Mark baptized (per-person)',
			options: [],
			callback: run('Baptism mark baptized', async () => self.api.baptismBaptized()),
		},
		baptism_start_baptisms: {
			name: 'Baptism: Start baptisms (grouped — arms the baptism section)',
			options: [],
			callback: run('Baptism start baptisms', async () => self.api.baptismStartBaptisms()),
		},
		baptism_next: {
			name: 'Baptism: Next',
			options: [],
			callback: run('Baptism next', async () => self.api.baptismNext()),
		},
		// One action, not two: it reads the cached baptism:state to decide which
		// half to call, the same way the app's own baptism.pause automation
		// action does. Idle and armed have no clock to pause — the underlying
		// route is a no-op there, same as pressing Pause on the operator panel
		// with nothing running.
		baptism_pause_resume: {
			name: 'Baptism: Pause / resume',
			options: [],
			callback: run('Baptism pause/resume', async () =>
				baptismIsPaused(self.state.baptism) ? self.api.baptismResume() : self.api.baptismPause(),
			),
		},
		baptism_undo: {
			name: 'Baptism: Undo (back)',
			options: [],
			callback: run('Baptism undo', async () => self.api.baptismUndo()),
		},
		baptism_finish: {
			name: 'Baptism: Finish',
			options: [],
			callback: run('Baptism finish', async () => self.api.baptismFinish()),
		},
		baptism_reset: {
			name: 'Baptism: Reset',
			options: [],
			callback: run('Baptism reset', async () => self.api.baptismReset()),
		},
		baptism_set_workflow: {
			name: 'Baptism: Set workflow (mode)',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'per-person', label: 'Per-person' },
						{ id: 'grouped', label: 'Grouped' },
					],
					default: 'grouped',
				},
			],
			callback: async (event) => {
				const mode = event.options.mode === 'per-person' ? 'per-person' : 'grouped'
				try {
					await self.api.baptismSetMode(mode)
				} catch (err) {
					self.log('warn', `Baptism set workflow failed: ${err instanceof Error ? err.message : String(err)}`)
				}
			},
		},
	})
}
