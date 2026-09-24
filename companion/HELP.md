## Stage Utility

Control and monitor a
[Stage Utility](https://github.com/Cornerstone-Production/Stage-Utility) server
from Bitfocus Companion over its HTTP and SSE API. Everything runs on your local
network — no password or cloud account.

### Setup

Requires **Companion 4.3.0 or newer**. This module uses the v2 connection API,
introduced in 4.3.0. On an older Companion the module installs and appears in the
list, but the connection never starts — it reports "Connection not found or not
running" with no config loaded.

1. In Stage Utility, open **Settings → Integrations → Bitfocus Companion**. It
   shows the host or IP and the port to use; the default port is **8788**.
2. In Companion, add a connection: **Cornerstone → Stage Utility**.
3. Enter the **Host / IP** and **Port** from step 1. Companion takes them
   separately and cannot resolve a DNS name, so use the IP shown there.
4. The connection turns green once it reaches the server, and Stage Utility's
   integration panel shows the connected client.

Leave **Poll fallback** at `0` unless your network cannot hold the event stream
open. The module is event-driven; enabling the fallback re-fetches fourteen
endpoints on every tick, so five seconds is 168 requests a minute for
configuration that rarely changes.

### Actions

| Action                     | What it does                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| PCO Live: Next / Previous  | Advance or go back in PCO Services Live                                                          |
| Refresh lineup from PCO    | Re-sync the current plan and team                                                                |
| Jump to next plan          | Move to the next upcoming plan                                                                   |
| Set plan                   | Pick a specific plan in the current service type                                                 |
| Set service type           | Switch service type                                                                              |
| Set plan mode              | Automatic plan-following on or off                                                               |
| Route a view onto a screen | Change what an output shows                                                                      |
| Blackout                   | Black out an output, or restore it                                                               |
| Reload displays            | Force a browser reload of all displays, or one                                                   |
| Apply slot preset          | Apply a saved mic-slot preset                                                                    |
| Show QR                    | Show, hide or toggle the connect QR overlay                                                      |
| Baptism: Start             | Begin a session at person 1's testimony                                                          |
| Baptism: Advance           | The phase-aware primary press — whatever the operator panel's own main button would do right now |
| Baptism: Mark baptized     | Per-person mode: close this person's testimony, begin their baptism                              |
| Baptism: Start baptisms    | Grouped mode: end the testimony pass and arm the baptism section                                 |
| Baptism: Next              | Step forward one testimony or one baptism (mode/phase dependent)                                 |
| Baptism: Pause / resume    | Toggles the running clock; a no-op while idle or armed                                           |
| Baptism: Undo (back)       | Steps back one press without losing the session                                                  |
| Baptism: Finish            | Closes the in-progress person, freezes the session, and logs it                                  |
| Baptism: Reset             | Clears back to idle (keeps the chosen workflow)                                                  |
| Baptism: Set workflow      | Per-person or grouped                                                                            |

### Feedbacks

Button styling that follows the live service.

| Feedback                  | Lights when                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| PCO countdown in overtime | the live timer goes negative                                                                                                                          |
| Mic battery low           | any channel, or a chosen one, drops below a threshold                                                                                                 |
| Mic offline               | any channel, or a chosen one, loses RF                                                                                                                |
| ProPresenter disconnected | the ProPresenter connection drops                                                                                                                     |
| Plan mode is Manual       | automatic plan-following is off                                                                                                                       |
| Output is showing a view  | a given output is showing a given view                                                                                                                |
| Output is blacked out     | a given output is blacked out                                                                                                                         |
| Occupancy over threshold  | a room or zone goes above a set count                                                                                                                 |
| Captions idle             | no caption has arrived for a set number of seconds                                                                                                    |
| People count text         | writes the current count onto the button                                                                                                              |
| OBS active                | OBS is recording, streaming or on virtual camera                                                                                                      |
| REAPER recording          | REAPER's transport is rolling                                                                                                                         |
| Streaming platform live   | Resi, YouTube, or either, is on air                                                                                                                   |
| Recorder / platform down  | a chosen one of OBS, REAPER, Resi or YouTube is unreachable                                                                                           |
| PVP now-layer playing     | ProVideoPlayer's now layer is rolling a video                                                                                                         |
| PVP remaining under       | the now layer is playing with remaining time at or under a set number of seconds                                                                      |
| Baptism phase colour      | always on — tints the button by the current phase (idle / armed / testimony / baptism), so one key reads the state without a second key to explain it |
| Baptism timer paused      | a running clock has been paused                                                                                                                       |
| Baptism timer running     | a testimony or baptism clock is actually counting                                                                                                     |

### Variables

**Plan** — `plan_title`, `series_title`, `service_type`, `plan_mode`,
`last_synced`

**PCO countdown** — `countdown_label`, `countdown_seconds` (ticks live between
updates)

**ProPresenter** — `current_item`, `next_item`, `slide_index`, `slide_count`

**Wireless** — `mics_online`, `mics_total`, `lowest_battery_pct`,
`lowest_battery_channel`

**Captions** — `last_caption_text`, `last_caption_speaker`

**Recording** — `obs_connected`, `obs_recording`, `obs_streaming`,
`obs_virtual_cam`, `obs_timecode`, `reaper_connected`, `reaper_recording`,
`reaper_position`

**Streaming** — `resi_connected`, `resi_live`, `resi_detail`, `resi_elapsed`,
and `youtube_connected`, `youtube_live`, `youtube_detail`, `youtube_elapsed`
(the elapsed times tick live between updates)

**People counting** — `people_attendance`, `people_occupancy`,
`people_connected`, `people_updated`, `people_zone_count`, plus
`people_zone_N_name`, `people_zone_N_attendance` and `people_zone_N_occupancy`
for each zone the server reports.

**ProVideoPlayer** — the "now" layer: whichever layer PVP's own now-playing
widget would show (the first layer in PVP's stack order that holds something).

- `pvp_connected` — ProVideoPlayer connected (yes/no)
- `pvp_state` — now layer's state: `empty`, `still`, `paused`, `playing` or `ended` (a clip that ran out and is holding its last frame)
- `pvp_layer` — now layer's name
- `pvp_cue` — now layer's last cue name
- `pvp_next_cue` — the playlist entry after the last cue (only ever a guess once a cue has been hand-fired)
- `pvp_media` — now layer's media file name
- `pvp_media_short` — media file name with the extension stripped
- `pvp_duration_seconds`, `pvp_elapsed_seconds`, `pvp_remaining_seconds` — whole seconds, blank when nothing has a duration (ticks live between updates)
- `pvp_remaining` — remaining time formatted m:ss / h:mm:ss, blank when nothing has a duration (ticks live between updates)

**Baptisms** — the running baptism timer. All the clocks tick live between
updates, off the same delivery-compensated clock `resi_elapsed` and
`countdown_seconds` use.

- `baptism_phase` — `idle`, `armed`, `testimony` or `baptism`. Armed means the
  baptism section has begun but nobody has stepped up yet — no clock is
  running by design.
- `baptism_segment` — the current testimony or baptism clock, m:ss. `0:00`
  while armed (a real segment exists, it has simply not started), blank while
  idle.
- `baptism_testimony` — this person's own testimony, once banked, m:ss. Blank
  while their testimony is still running (`baptism_segment` is the ticking
  value for that) or while idle.
- `baptism_session` — wall clock since the session started, m:ss. Keeps
  counting through a pause and freezes once the session finishes.
- `baptism_person` — `Person 3`, or `3 of 7` in grouped mode once the
  testimony pass has filled the roster. Per-person mode never has a total.
  `armed` while armed, for the same reason `baptism_phase` does.
- `baptism_count` — people actually baptized this session, never testimonies.
- `baptism_paused` — `yes` / `no`.
- `baptism_avg_testimony`, `baptism_avg_baptism` — running averages, m:ss.
- `baptism_mode` — `per-person` / `grouped`.

### Presets

Ready-made buttons under **Live Control**, **Routing & Displays**,
**Monitoring & Alarms**, **Recording & Streaming**, **ProVideoPlayer** and
**Baptisms**. Drag one onto a button to get started.

Recording and streaming are read-only: the buttons report what OBS, REAPER, Resi
and YouTube are doing. Starting or stopping them is done in those applications,
not here.

**Baptisms** ships eight: readouts for the current testimony, the current
segment (tinted while running), the count baptized and the session elapsed;
buttons for Advance, Back, Finish, and a combined Pause/resume that tints while
paused. `baptism_advance` is the one to reach for on a physical key — it does
whatever the operator panel's own main button would do, so one key runs the
whole baptism.
