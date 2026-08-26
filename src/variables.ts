import type ModuleInstance from './main.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	// Per-zone people variables are dynamic — one set per zone the API reports.
	// v2 takes an object keyed by variableId rather than an array of records.
	// One pair per signal an automation rule has published. Dynamic, like the zone
	// variables: the app decides which signals exist, and a Companion Trigger keys
	// on whichever ones you use.
	const signalVars: Record<string, { name: string }> = {}
	for (const name of Object.keys(self.state.signals ?? {})) {
		signalVars[`signal_${name}`] = { name: `Signal: ${name}` }
		signalVars[`signal_${name}_error`] = { name: `Signal: ${name} (error, blank when healthy)` }
	}

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
		...signalVars,
		plan_title: { name: 'Current plan title' },
		series_title: { name: 'Current series title' },
		service_type: { name: 'Service type' },
		plan_mode: { name: 'Plan mode (auto/manual)' },
		current_item: { name: 'ProPresenter current item' },
		next_item: { name: 'ProPresenter next item' },
		slide_index: { name: 'Slide index' },
		slide_count: { name: 'Slide count' },
		service_live: { name: 'Service is live (yes/no)' },
		live_mode: { name: 'PCO Live mode (item/preservice/none)' },
		live_item: { name: 'Live item title (from the PCO plan order)' },
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
	const people = st.peopleCount

	const signalValues: Record<string, string> = {}
	for (const [name, sig] of Object.entries(st.signals ?? {})) {
		signalValues[`signal_${name}`] = sig.value
		signalValues[`signal_${name}_error`] = sig.error ?? ''
	}

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
		...signalValues,
		...peopleVars,
		plan_title: stage?.planTitle ?? '',
		series_title: stage?.planSeriesTitle ?? '',
		service_type: stage?.serviceTypeName ?? '',
		plan_mode: stage?.planMode ?? '',
		current_item: pp?.currentItem ?? '',
		next_item: pp?.nextItem ?? '',
		slide_index: pp?.slideIndex != null ? String(pp.slideIndex + 1) : '',
		slide_count: pp?.slideCount != null ? String(pp.slideCount) : '',
		// PCO Services Live, not a stream or a recorder: an encoder started for a
		// soundcheck is not a service, and neither is OBS recording. See
		// state.liveMode().
		service_live: st.isServiceLive() ? 'yes' : 'no',
		live_mode: st.liveMode(),
		live_item: live?.currentItemTitle ?? live?.label ?? '',
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
