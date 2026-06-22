## Cornerstone Stage Utility

Control and monitor a [Stage Utility](https://github.com/Cornerstone-Production/Stage-Utility) server
from Bitfocus Companion over its HTTP + SSE API. Everything runs on your local network — no password
or cloud account is required.

### Setup

1. In Stage Utility, open **Settings → Integrations → Bitfocus Companion** and note the connect URL
   (it shows the host/IP and port to use; the default port is **8788**).
2. In Companion, add a new connection: **Cornerstone → Stage Utility**.
3. Enter the **Host / IP** and **Port** from step 1. (Leave the poll fallback at 0 unless your network
   drops the event stream.)
4. The connection turns green when it reaches the server. Stage Utility's integration panel will then
   show the connected client.

### Actions

| Action                           | What it does                                 |
| -------------------------------- | -------------------------------------------- |
| PCO Live: Next / Previous        | Advance / go back in PCO Services Live       |
| Refresh lineup from PCO          | Re-sync the current plan and team            |
| Jump to next plan                | Move to the next upcoming plan               |
| Set plan / Set service type      | Pick a specific plan or service type         |
| Set plan mode (Auto/Manual)      | Switch automatic plan-following on/off       |
| Route a View onto a screen       | Change what a physical Output (screen) shows |
| Reload kiosk display(s)          | Force a browser reload of all or one display |
| Apply slot preset                | Apply a saved mic-slot preset                |
| Connect QR: show / hide / toggle | Toggle the connect QR overlay                |

### Feedbacks (button styling)

- **PCO countdown in overtime** — turns the button red when the live timer goes negative.
- **Mic battery low** — red/yellow when any (or a chosen) wireless channel drops below a threshold.
- **Mic offline / RF dropout** — lights when any (or a chosen) channel goes offline.
- **ProPresenter disconnected**, **Plan mode is Manual**, **Output is showing a specific View**,
  **Captions idle**.

### Variables

`plan_title`, `series_title`, `service_type`, `plan_mode`, `current_item`, `next_item`,
`slide_index`, `slide_count`, `countdown_label`, `countdown_seconds` (ticks live), `mics_online`,
`mics_total`, `lowest_battery_pct`, `lowest_battery_channel`, `last_caption_text`,
`last_caption_speaker`, `last_synced`.

### Presets

Ready-made buttons are provided under **Live Control**, **Routing & Displays**, and
**Monitoring & Alarms** — drag one onto a button to get started.
