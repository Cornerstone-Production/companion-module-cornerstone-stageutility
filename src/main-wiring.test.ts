// main.ts's own part of the messages wiring: that the messages:state case reaches
// the handler, that the hydrate fetches and applies both endpoints, and that the
// alert light is re-checked with everything else. The instance cannot be
// constructed outside Companion, so the real methods run on a stand-in that
// inherits them from the real prototype.

import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import ModuleInstance from './main.js'
import { ApiClient } from './api.js'
import { StateCache } from './state.js'
import type { MessagesStateDTO } from './types.js'

type Internals = {
	onSseEvent(name: string, data: unknown): void
	hydrate(): Promise<void>
	refreshFeedbacks(): void
}
const proto = ModuleInstance.prototype as unknown as Internals

function instance() {
	const calls: string[] = []
	const checked: string[] = []
	const variables: Record<string, unknown> = {}
	const self = Object.assign(Object.create(ModuleInstance.prototype) as object, {
		state: new StateCache(),
		api: new ApiClient('http://stage.test'),
		updatePresets: () => calls.push('updatePresets'),
		updateActions: () => calls.push('updateActions'),
		updateFeedbacks: () => calls.push('updateFeedbacks'),
		checkFeedbacks: (...ids: string[]) => checked.push(...ids),
		setVariableValues: (v: Record<string, unknown>) => Object.assign(variables, v),
	})
	return { self, calls, checked, variables }
}

const FRAME: MessagesStateDTO = {
	groups: [{ id: 'g-11111111', name: 'Green room' }],
	messages: [
		{ id: 'a'.repeat(16), at: 1, to: ['everyone'], text: 'Walk now', alert: false, from: 'Operator', replies: [] },
	],
	alerts: [],
	quickMessages: ['2 minutes'],
}

const realFetch = globalThis.fetch
afterEach(() => {
	globalThis.fetch = realFetch
})

describe('ModuleInstance messages wiring', () => {
	it('a messages:state frame redefines, re-reads the variables and re-checks the alert light', () => {
		const { self, calls, checked, variables } = instance()
		proto.onSseEvent.call(self, 'messages:state', FRAME)
		assert.ok(calls.includes('updatePresets'), 'the quick list changed, so the presets are rebuilt')
		assert.ok(calls.includes('updateActions') && calls.includes('updateFeedbacks'), 'the dropdowns are redefined')
		assert.ok(checked.includes('message_alert_running'))
		assert.equal(variables.message_last_text, 'Walk now')
	})

	it('the hydrate reads GET /api/messages and GET /api/messaging into the cache', async () => {
		const { self, calls } = instance()
		const asked = new Set<string>()
		globalThis.fetch = (async (url: string | URL) => {
			const path = new URL(String(url)).pathname
			asked.add(path)
			if (path === '/api/messages') return new Response(JSON.stringify(FRAME))
			if (path === '/api/messaging') {
				return new Response(JSON.stringify({ groups: FRAME.groups, quickMessages: ['Wrap it up'], version: 1 }))
			}
			return new Response('{}')
		}) as typeof fetch
		await proto.hydrate.call(self)
		assert.ok(asked.has('/api/messages'))
		assert.ok(asked.has('/api/messaging'))
		const state = (self as unknown as { state: StateCache }).state
		assert.equal(state.messages?.messages[0].text, 'Walk now')
		// The frame in /api/messages carries a list of its own, which wins when read last.
		assert.deepEqual(state.quickMessages, ['2 minutes'])
		assert.ok(calls.includes('updatePresets'))
	})

	it('a server without the messages routes leaves nothing lit', async () => {
		const { self } = instance()
		const state = (self as unknown as { state: StateCache }).state
		state.applyMessages({ ...FRAME, alerts: [FRAME.messages[0]] })
		const missing = new Set(['/api/messages', '/api/messaging'])
		globalThis.fetch = (async (url: string | URL) =>
			missing.has(new URL(String(url)).pathname)
				? new Response('', { status: 404 })
				: new Response('{}')) as typeof fetch
		await proto.hydrate.call(self)
		assert.equal(state.messages, null)
	})

	it('re-checks the alert light with every other feedback after a hydrate', () => {
		const { self, checked } = instance()
		proto.refreshFeedbacks.call(self)
		assert.ok(checked.includes('message_alert_running'))
	})
})
