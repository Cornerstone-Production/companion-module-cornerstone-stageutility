import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
	pollFallbackSec: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Stage Utility',
			width: 12,
			value: 'Connects to a Stage Utility server on your local network over HTTP + SSE. No password required.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Host / IP',
			width: 8,
			regex: Regex.HOSTNAME,
			default: '',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 8788,
		},
		{
			type: 'number',
			id: 'pollFallbackSec',
			label: 'Poll fallback (seconds, 0 = off)',
			width: 4,
			min: 0,
			max: 600,
			default: 0,
		},
	]
}

export function baseUrl(config: ModuleConfig): string {
	return `http://${config.host}:${config.port}`
}
