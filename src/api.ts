import type {
	DeviceStatusDTO,
	HealthDTO,
	OutputDTO,
	PcoLiveDTO,
	PlanDTO,
	PresetDTO,
	ProPresenterStatusDTO,
	ServiceTypeDTO,
	StageStateDTO,
	ViewDTO,
} from './types.js'

const TIMEOUT_MS = 8000

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
		if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}`)
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
	async refreshDisplays(outputId?: string): Promise<unknown> {
		return this.request('POST', '/api/displays/refresh', outputId ? { id: outputId } : {})
	}
	async applyPreset(id: string): Promise<unknown> {
		return this.request('POST', `/api/presets/${encodeURIComponent(id)}/apply`)
	}
	async showQr(show: boolean): Promise<unknown> {
		return this.request('POST', '/api/show-qr', { show })
	}
}
