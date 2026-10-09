import type {
	BaptismStateDTO,
	DeviceStatusDTO,
	HealthDTO,
	MessagesStateDTO,
	MessagingConfigDTO,
	StageMessageDTO,
	ObsStatusDTO,
	OutputDTO,
	PcoLiveDTO,
	PeopleCountDTO,
	PlanDTO,
	PresetDTO,
	ProPresenterStatusDTO,
	PvpStatusDTO,
	ReaperStatusDTO,
	ServiceTypeDTO,
	StageStateDTO,
	StreamStatusDTO,
	ViewDTO,
} from './types.js'

const TIMEOUT_MS = 8000

/** The server's own reason for a refusal: the `error` of a JSON body, else none. */
async function refusalReason(res: Response): Promise<string> {
	try {
		const body = JSON.parse(await res.text()) as { error?: unknown }
		return typeof body.error === 'string' ? body.error : ''
	} catch {
		// Not JSON, or the body never arrived: the status line alone is what there is.
		return ''
	}
}

// Thin HTTP client for the Stage Utility REST API (LAN, no auth). All control
// verbs throw on a non-2xx response so action callbacks can log failures.
export class ApiClient {
	constructor(private readonly base: string) {}

	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const res = await fetch(`${this.base}${path}`, {
			method,
			headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			signal: AbortSignal.timeout(TIMEOUT_MS),
		})
		if (!res.ok) {
			const reason = await refusalReason(res)
			throw new Error(`${method} ${path} → HTTP ${res.status}${reason ? `: ${reason}` : ''}`)
		}
		const text = await res.text()
		return (text ? JSON.parse(text) : undefined) as T
	}

	// ── Reads (hydrate + dropdown enumeration) ──
	async health(): Promise<HealthDTO> {
		return this.request('GET', '/api/health')
	}
	async getState(): Promise<StageStateDTO> {
		return this.request('GET', '/api/state')
	}
	async getViews(): Promise<ViewDTO[]> {
		return this.request('GET', '/api/views')
	}
	async getOutputs(): Promise<OutputDTO[]> {
		return this.request('GET', '/api/outputs')
	}
	async getServiceTypes(): Promise<ServiceTypeDTO[]> {
		return this.request('GET', '/api/service-types')
	}
	async getPlans(serviceTypeId: string): Promise<PlanDTO[]> {
		return this.request('GET', `/api/plans?serviceTypeId=${encodeURIComponent(serviceTypeId)}`)
	}
	async getPresets(): Promise<PresetDTO[]> {
		return this.request('GET', '/api/presets')
	}
	async getChannels(): Promise<DeviceStatusDTO[]> {
		return this.request('GET', '/api/integrations/wireless/channels')
	}
	async getPcoLive(): Promise<PcoLiveDTO> {
		return this.request('GET', '/api/pco/live')
	}
	async getProPresenter(): Promise<ProPresenterStatusDTO> {
		return this.request('GET', '/api/propresenter/status')
	}
	async getPeopleCount(): Promise<PeopleCountDTO> {
		return this.request('GET', '/api/people/count')
	}
	async getObs(): Promise<ObsStatusDTO> {
		return this.request('GET', '/api/obs/status')
	}
	async getReaper(): Promise<ReaperStatusDTO> {
		return this.request('GET', '/api/reaper/status')
	}
	async getResi(): Promise<StreamStatusDTO> {
		return this.request('GET', '/api/resi/status')
	}
	async getYouTube(): Promise<StreamStatusDTO> {
		return this.request('GET', '/api/youtube/status')
	}
	async getPvp(): Promise<PvpStatusDTO> {
		return this.request('GET', '/api/pvp/status')
	}
	async getBaptism(): Promise<BaptismStateDTO> {
		return this.request('GET', '/api/baptism')
	}
	async getMessages(): Promise<MessagesStateDTO> {
		return this.request('GET', '/api/messages')
	}
	async getMessaging(): Promise<MessagingConfigDTO> {
		return this.request('GET', '/api/messaging')
	}

	// ── Control verbs (Companion actions) ──
	async liveNext(): Promise<unknown> {
		return this.request('POST', '/api/live/next')
	}
	async livePrevious(): Promise<unknown> {
		return this.request('POST', '/api/live/previous')
	}
	async refresh(): Promise<unknown> {
		return this.request('POST', '/api/refresh')
	}
	async planNext(): Promise<unknown> {
		return this.request('POST', '/api/plan/next')
	}
	async setPlan(id: string): Promise<unknown> {
		return this.request('POST', '/api/plan', { id })
	}
	async setServiceType(id: string): Promise<unknown> {
		return this.request('POST', '/api/service-type', { id })
	}
	async setPlanMode(mode: 'auto' | 'manual'): Promise<unknown> {
		return this.request('POST', '/api/plan/mode', { mode })
	}
	async routeView(outputId: string, viewId: string | null): Promise<unknown> {
		return this.request('PATCH', `/api/outputs/${encodeURIComponent(outputId)}`, { viewId })
	}
	async setBlackout(outputId: string, blackout: boolean): Promise<unknown> {
		return this.request('PATCH', `/api/outputs/${encodeURIComponent(outputId)}`, { blackout })
	}
	async refreshDisplays(outputId?: string): Promise<unknown> {
		return this.request('POST', '/api/displays/refresh', outputId ? { id: outputId } : {})
	}
	async applyPreset(id: string): Promise<unknown> {
		return this.request('POST', `/api/presets/${encodeURIComponent(id)}/apply`)
	}
	async showQr(show: boolean): Promise<unknown> {
		return this.request('POST', '/api/show-qr', { show })
	}

	// ── Baptism timer — one method per POST /api/baptism/<action> route ──
	async baptismStart(): Promise<unknown> {
		return this.request('POST', '/api/baptism/start')
	}
	async baptismAdvance(): Promise<unknown> {
		return this.request('POST', '/api/baptism/advance')
	}
	async baptismBaptized(): Promise<unknown> {
		return this.request('POST', '/api/baptism/baptized')
	}
	async baptismStartBaptisms(): Promise<unknown> {
		return this.request('POST', '/api/baptism/start-baptisms')
	}
	async baptismNext(): Promise<unknown> {
		return this.request('POST', '/api/baptism/next')
	}
	async baptismPause(): Promise<unknown> {
		return this.request('POST', '/api/baptism/pause')
	}
	async baptismResume(): Promise<unknown> {
		return this.request('POST', '/api/baptism/resume')
	}
	async baptismUndo(): Promise<unknown> {
		return this.request('POST', '/api/baptism/undo')
	}
	async baptismFinish(): Promise<unknown> {
		return this.request('POST', '/api/baptism/finish')
	}
	async baptismReset(): Promise<unknown> {
		return this.request('POST', '/api/baptism/reset')
	}
	async baptismSetMode(mode: 'per-person' | 'grouped'): Promise<unknown> {
		return this.request('POST', '/api/baptism/mode', { mode })
	}

	// ── Stage messages ──
	async sendMessage(body: { to: string[]; text: string; alert: boolean; from: string }): Promise<StageMessageDTO> {
		return this.request('POST', '/api/messages', body)
	}
	async clearMessageAlert(id: string, from: string): Promise<unknown> {
		return this.request('POST', `/api/messages/${encodeURIComponent(id)}/clear-alert`, { from })
	}
}
