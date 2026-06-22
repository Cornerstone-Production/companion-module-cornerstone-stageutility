import type ModuleInstance from './main.js'

export type VariablesSchema = {
	plan_title: string
	series_title: string
	service_type: string
	plan_mode: string
	current_item: string
	next_item: string
	slide_index: string
	slide_count: string
	countdown_label: string
	countdown_seconds: string
	mics_online: string
	mics_total: string
	lowest_battery_pct: string
	lowest_battery_channel: string
	last_caption_text: string
	last_caption_speaker: string
	last_synced: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		plan_title: { name: 'Current plan title' },
		series_title: { name: 'Current series title' },
		service_type: { name: 'Service type' },
		plan_mode: { name: 'Plan mode (auto/manual)' },
		current_item: { name: 'ProPresenter current item' },
		next_item: { name: 'ProPresenter next item' },
		slide_index: { name: 'Slide index' },
		slide_count: { name: 'Slide count' },
		countdown_label: { name: 'PCO countdown label' },
		countdown_seconds: { name: 'PCO countdown (mm:ss)' },
		mics_online: { name: 'Mics online' },
		mics_total: { name: 'Mics total' },
		lowest_battery_pct: { name: 'Lowest mic battery %' },
		lowest_battery_channel: { name: 'Lowest mic battery channel' },
		last_caption_text: { name: 'Last caption text' },
		last_caption_speaker: { name: 'Last caption speaker' },
		last_synced: { name: 'Last synced (local time)' },
	})
}

function formatDuration(totalSec: number): string {
	const sign = totalSec < 0 ? '-' : ''
	const s = Math.abs(totalSec)
	const m = Math.floor(s / 60)
	const sec = s % 60
	return `${sign}${m}:${sec.toString().padStart(2, '0')}`
}

// Recompute every variable from the cache and push to Companion. Called after
// each relevant SSE event and on the 1s ticker (for the live countdown).
export function SetVariableValues(self: ModuleInstance): void {
	const st = self.state
	const stage = st.stage
	const pp = st.propresenter
	const live = st.pcoLive
	const battery = st.lowestBattery()
	const countdownSec = st.countdownSeconds()

	self.setVariableValues({
		plan_title: stage?.planTitle ?? '',
		series_title: stage?.planSeriesTitle ?? '',
		service_type: stage?.serviceTypeName ?? '',
		plan_mode: stage?.planMode ?? '',
		current_item: pp?.currentItem ?? '',
		next_item: pp?.nextItem ?? '',
		slide_index: pp?.slideIndex != null ? String(pp.slideIndex + 1) : '',
		slide_count: pp?.slideCount != null ? String(pp.slideCount) : '',
		countdown_label: live?.label ?? '',
		countdown_seconds: countdownSec === null ? '' : formatDuration(countdownSec),
		mics_online: String(st.onlineChannels().length),
		mics_total: String(st.channels.length),
		lowest_battery_pct: battery ? String(battery.pct) : '',
		lowest_battery_channel: battery ? battery.channel : '',
		last_caption_text: st.lastCaptionText,
		last_caption_speaker: st.lastCaptionSpeaker,
		last_synced: stage?.lastRefreshedAt ? new Date(stage.lastRefreshedAt).toLocaleTimeString() : '',
	})
}
