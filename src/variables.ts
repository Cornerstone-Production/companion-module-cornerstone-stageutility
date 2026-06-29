import type ModuleInstance from './main.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	// Per-zone people variables are dynamic — one set per zone the API reports.
	const zoneVars = (self.state.peopleCount?.zones ?? []).flatMap((_, i) => {
		const n = i + 1
		return [
			{ variableId: `people_zone_${n}_name`, name: `People zone ${n} name` },
			{ variableId: `people_zone_${n}_attendance`, name: `People zone ${n} attendance` },
			{ variableId: `people_zone_${n}_occupancy`, name: `People zone ${n} occupancy (in room)` },
		]
	})
	self.setVariableDefinitions([
		{ variableId: 'people_attendance', name: 'People attendance (total today)' },
		{ variableId: 'people_occupancy', name: 'People occupancy (in room now)' },
		{ variableId: 'people_connected', name: 'People counter connected (yes/no)' },
		{ variableId: 'people_updated', name: 'People count last updated (local time)' },
		{ variableId: 'people_zone_count', name: 'People zone count' },
		...zoneVars,
		{ variableId: 'plan_title', name: 'Current plan title' },
		{ variableId: 'series_title', name: 'Current series title' },
		{ variableId: 'service_type', name: 'Service type' },
		{ variableId: 'plan_mode', name: 'Plan mode (auto/manual)' },
		{ variableId: 'current_item', name: 'ProPresenter current item' },
		{ variableId: 'next_item', name: 'ProPresenter next item' },
		{ variableId: 'slide_index', name: 'Slide index' },
		{ variableId: 'slide_count', name: 'Slide count' },
		{ variableId: 'countdown_label', name: 'PCO countdown label' },
		{ variableId: 'countdown_seconds', name: 'PCO countdown (mm:ss)' },
		{ variableId: 'mics_online', name: 'Mics online' },
		{ variableId: 'mics_total', name: 'Mics total' },
		{ variableId: 'lowest_battery_pct', name: 'Lowest mic battery %' },
		{ variableId: 'lowest_battery_channel', name: 'Lowest mic battery channel' },
		{ variableId: 'last_caption_text', name: 'Last caption text' },
		{ variableId: 'last_caption_speaker', name: 'Last caption speaker' },
		{ variableId: 'last_synced', name: 'Last synced (local time)' },
	])
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
	const people = st.peopleCount

	const peopleVars: Record<string, string> = {
		people_attendance: people?.total.attendance != null ? String(people.total.attendance) : '',
		people_occupancy: people?.total.occupancy != null ? String(people.total.occupancy) : '',
		people_connected: people?.connected ? 'yes' : 'no',
		people_updated: people?.updatedAt ? new Date(people.updatedAt).toLocaleTimeString() : '',
		people_zone_count: String(people?.zones.length ?? 0),
	}
	;(people?.zones ?? []).forEach((z, i) => {
		const n = i + 1
		peopleVars[`people_zone_${n}_name`] = z.name
		peopleVars[`people_zone_${n}_attendance`] = String(z.attendance)
		peopleVars[`people_zone_${n}_occupancy`] = String(z.occupancy)
	})

	self.setVariableValues({
		...peopleVars,
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
