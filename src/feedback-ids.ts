// Every feedback id the module defines. After a hydrate and on a poll tick the
// module re-checks all of these; one missing from here is a button that keeps
// the state it had before the reconnect. feedback-ids.test.ts holds the list to
// the definitions.
export const ALL_FEEDBACKS = [
	'countdown_overtime',
	'mic_battery_low',
	'mic_offline',
	'propresenter_disconnected',
	'plan_mode_manual',
	'output_shows_view',
	'output_blackout',
	'captions_idle',
	'occupancy_over',
	'people_count_text',
	'obs_active',
	'reaper_recording',
	'stream_live',
	'integration_disconnected',
	'pvp_playing',
	'pvp_remaining_under',
	'baptism_phase_color',
	'baptism_paused',
	'baptism_running',
	'message_alert_running',
	'service_is_live',
	'signal_is',
	'signal_error',
] as const
