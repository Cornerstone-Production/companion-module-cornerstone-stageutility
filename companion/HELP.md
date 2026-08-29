## Stage Utility

Control and monitor a
[Stage Utility](https://github.com/Cornerstone-Production/Stage-Utility) server
from Bitfocus Companion over its HTTP and SSE API. Everything runs on your local
network — no password or cloud account.

### Setup

1. In Stage Utility, open **Settings → Integrations → Bitfocus Companion**. It
   shows the host or IP and the port to use; the default port is **8788**.
2. In Companion, add a connection: **Cornerstone → Stage Utility**.
3. Enter the **Host / IP** and **Port** from step 1. Companion takes them
   separately and cannot resolve a DNS name, so use the IP shown there.
4. The connection turns green once it reaches the server, and Stage Utility's
   integration panel shows the connected client.

Leave **Poll fallback** at `0` unless your network cannot hold the event stream
open. The module is event-driven; enabling the fallback re-fetches thirteen
endpoints on every tick, so five seconds is 156 requests a minute for
configuration that rarely changes.

### Actions

| Action                     | What it does                                     |
| -------------------------- | ------------------------------------------------ |
| PCO Live: Next / Previous  | Advance or go back in PCO Services Live          |
| Refresh lineup from PCO    | Re-sync the current plan and team                |
| Jump to next plan          | Move to the next upcoming plan                   |
| Set plan                   | Pick a specific plan in the current service type |
| Set service type           | Switch service type                              |
| Set plan mode              | Automatic plan-following on or off               |
| Route a view onto a screen | Change what an output shows                      |
| Blackout                   | Black out an output, or restore it               |
| Reload displays            | Force a browser reload of all displays, or one   |
| Apply slot preset          | Apply a saved mic-slot preset                    |
| Show QR                    | Show, hide or toggle the connect QR overlay      |

### Feedbacks

Button styling that follows the live service.

| Feedback                  | Lights when                                                 |
| ------------------------- | ----------------------------------------------------------- |
| PCO countdown in overtime | the live timer goes negative                                |
| Mic battery low           | any channel, or a chosen one, drops below a threshold       |
| Mic offline               | any channel, or a chosen one, loses RF                      |
| ProPresenter disconnected | the ProPresenter connection drops                           |
| Plan mode is Manual       | automatic plan-following is off                             |
| Output is showing a view  | a given output is showing a given view                      |
| Output is blacked out     | a given output is blacked out                               |
| Occupancy over threshold  | a room or zone goes above a set count                       |
| Captions idle             | no caption has arrived for a set number of seconds          |
| People count text         | writes the current count onto the button                    |
| OBS active                | OBS is recording, streaming or on virtual camera            |
| REAPER recording          | REAPER's transport is rolling                               |
| Streaming platform live   | Resi, YouTube, or either, is on air                         |
| Recorder / platform down  | a chosen one of OBS, REAPER, Resi or YouTube is unreachable |

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

### Presets

Ready-made buttons under **Live Control**, **Routing & Displays**,
**Monitoring & Alarms** and **Recording & Streaming**. Drag one onto a button to
get started.

Recording and streaming are read-only: the buttons report what OBS, REAPER, Resi
and YouTube are doing. Starting or stopping them is done in those applications,
not here.
