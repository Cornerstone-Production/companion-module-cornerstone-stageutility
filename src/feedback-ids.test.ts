// The module re-checks ALL_FEEDBACKS after a hydrate. A feedback missing from it
// keeps the state it had before the reconnect, so the list is held to the ids the
// module defines. Both sides are the same sorted list, one id per line.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { UpdateFeedbacks } from './feedbacks.js'
import { ALL_FEEDBACKS } from './feedback-ids.js'
import { StateCache } from './state.js'
import type ModuleInstance from './main.js'

const DEFINED = [
	'baptism_paused',
	'baptism_phase_color',
	'baptism_running',
	'captions_idle',
	'countdown_overtime',
	'integration_disconnected',
	'message_alert_running',
	'mic_battery_low',
	'mic_offline',
	'obs_active',
	'occupancy_over',
	'output_blackout',
	'output_shows_view',
	'people_count_text',
	'plan_mode_manual',
	'propresenter_disconnected',
	'pvp_playing',
	'pvp_remaining_under',
	'reaper_recording',
	'service_is_live',
	'signal_error',
	'signal_is',
	'stream_live',
]

describe('feedback ids', () => {
	it('are the ones UpdateFeedbacks defines', () => {
		let defined: Record<string, unknown> = {}
		const self = { state: new StateCache(), setFeedbackDefinitions: (d: Record<string, unknown>) => (defined = d) }
		UpdateFeedbacks(self as unknown as ModuleInstance)
		assert.deepEqual(Object.keys(defined).sort(), DEFINED)
	})

	it('are all re-checked after a hydrate', () => {
		assert.deepEqual([...ALL_FEEDBACKS].sort(), DEFINED)
	})
})
