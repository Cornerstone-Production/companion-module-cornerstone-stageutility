// Partial mirrors of the Stage Utility API DTOs this module consumes. Only the
// fields we read are declared. Source of truth: the app's main/types/stage.ts.

export interface HealthDTO {
	ok: boolean
	app?: string
	version?: string
	name?: string
}

export interface ViewDTO {
	id: string
	name: string
	kind: string
}

export interface OutputDTO {
	id: string
	name: string
	viewId: string | null
}

export interface ServiceTypeDTO {
	id: string
	name: string
}

export interface PlanDTO {
	id: string
	title: string
	seriesTitle: string | null
}

export interface PresetDTO {
	id: string
	name: string
}

export interface SlotDeviceDTO {
	status: 'none' | 'ok' | 'warn' | 'error'
	rf: number | null
	battery: number | null
	freq: string | null
}

export interface ResolvedOutputDTO {
	viewId: string | null
	kind: string
	viewName: string | null
}

// A flat wireless channel from GET /api/integrations/wireless/channels.
export interface DeviceStatusDTO {
	channelId: string
	name: string | null
	online: boolean
	rfBars: number | null
	battery: number | null
	frequencyLabel: string | null
}

export interface StageStateDTO {
	serviceTypeId: string | null
	serviceTypeName: string | null
	planMode: 'auto' | 'manual'
	planTitle: string | null
	planSeriesTitle: string | null
	lastRefreshedAt: string | null
	showQr: boolean
	views: ViewDTO[]
	outputs: OutputDTO[]
	resolvedByOutput: Record<string, ResolvedOutputDTO>
}

export interface PcoLiveDTO {
	mode: 'item' | 'preservice' | 'none'
	label: string | null
	lengthSec: number | null
	targetAt: string | null
	serverNow: string
}

export interface ProTimerDTO {
	name: string
	time: string
	state: string
}

export interface ProPresenterStatusDTO {
	connected: boolean
	currentItem: string | null
	nextItem: string | null
	slideIndex: number | null
	slideCount: number | null
}

export interface TranscriptLineDTO {
	channel: string | null
	channelName: string | null
	text: string
	isFinal: boolean
	at: string
}
