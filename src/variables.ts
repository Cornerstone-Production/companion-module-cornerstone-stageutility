import type ModuleInstance from './main.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	// Per-zone people variables are dynamic — one set per zone the API reports.
	// v2 takes an object keyed by variableId rather than an array of records.
	const zoneVars: Record<string, { name: string }> = {}
	for (const [i] of (self.state.peopleCount?.zones ?? []).entries()) {
		const n = i + 1
		zoneVars[`people_zone_${n}_name`] = { name: `People zone ${n} name` }
		zoneVars[`people_zone_${n}_attendance`] = { name: `People zone ${n} attendance` }
		zoneVars[`people_zone_${n}_occupancy`] = { name: `People zone ${n} occupancy (in room)` }
	}
	self.setVariableDefinitions({
		people_attendance: { name: 'People attendance (total today)' },
		people_occupancy: { name: 'People occupancy (in room now)' },
		people_connected: { name: 'People counter connected (yes/no)' },
		people_updated: { name: 'People count last updated (local time)' },
		people_zone_count: { name: 'People zone count' },
		...zoneVars,
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
		obs_connected: { name: 'OBS connected (yes/no)' },
		obs_recording: { name: 'OBS recording (yes/no)' },
		obs_streaming: { name: 'OBS streaming (yes/no)' },
		obs_virtual_cam: { name: 'OBS virtual camera (yes/no)' },
		obs_timecode: { name: 'OBS record duration (HH:MM:SS)' },
		reaper_connected: { name: 'REAPER connected (yes/no)' },
		reaper_recording: { name: 'REAPER recording (yes/no)' },
		reaper_position: { name: 'REAPER transport position' },
		resi_connected: { name: 'Resi connected (yes/no)' },
		resi_live: { name: 'Resi live (yes/no)' },
		resi_detail: { name: 'Resi encoder / stream name' },
		resi_elapsed: { name: 'Resi live for (mm:ss)' },
		youtube_connected: { name: 'YouTube connected (yes/no)' },
		youtube_live: { name: 'YouTube live (yes/no)' },
		youtube_detail: { name: 'YouTube broadcast name' },
		youtube_elapsed: { name: 'YouTube live for (mm:ss)' },
	})
}

const yesNo = (value: boolean | undefined): string => (value ? 'yes' : 'no')

/** REAPER reports "0:02.123"; whole seconds is what a button has room for. */
function trimMillis(position: string | null | undefined): string {
	const raw = position ?? ''
	const dot = raw.indexOf('.')
	return dot === -1 ? raw : raw.slice(0, dot)
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
	const obs = st.obs
	const reaper = st.reaper
	const resi = st.resi
	const youtube = st.youtube
	const resiElapsed = st.streamElapsedSeconds(resi)
	const youtubeElapsed = st.streamElapsedSeconds(youtube)

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
		obs_connected: yesNo(obs?.connected),
		obs_recording: yesNo(obs?.recording),
		obs_streaming: yesNo(obs?.streaming),
		obs_virtual_cam: yesNo(obs?.virtualCam),
		obs_timecode: obs?.recording ? (obs.recordTimecode ?? '') : '',
		reaper_connected: yesNo(reaper?.connected),
		reaper_recording: yesNo(reaper?.recording),
		reaper_position: trimMillis(reaper?.positionString),
		resi_connected: yesNo(resi?.connected),
		resi_live: yesNo(resi?.live),
		resi_detail: resi?.detail ?? '',
		resi_elapsed: resiElapsed === null ? '' : formatDuration(resiElapsed),
		youtube_connected: yesNo(youtube?.connected),
		youtube_live: yesNo(youtube?.live),
		youtube_detail: youtube?.detail ?? '',
		youtube_elapsed: youtubeElapsed === null ? '' : formatDuration(youtubeElapsed),
	})
}
