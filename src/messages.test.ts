// Stage messages: what the variables read off a messages:state frame, the alert
// feedback, the dropdowns following the groups, and the requests the three
// actions make. Each runs the real definition code against a stand-in for the
// module instance, so removing the rule it guards turns it red.

import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { ApiClient } from './api.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { SetVariableValues } from './variables.js'
import { StateCache } from './state.js'
import type ModuleInstance from './main.js'
import type { MessagesStateDTO, StageMessageDTO } from './types.js'

const GREEN = 'g-11111111'
const STAGE = 'g-22222222'

function msg(overrides: Partial<StageMessageDTO> = {}): StageMessageDTO {
	return {
		id: 'a'.repeat(16),
		at: 1000,
		to: ['everyone'],
		text: 'Walk now',
		alert: false,
		from: 'Operator',
		replies: [],
		...overrides,
	}
}

function frame(overrides: Partial<MessagesStateDTO> = {}): MessagesStateDTO {
	return {
		groups: [
			{ id: GREEN, name: 'Green room' },
			{ id: STAGE, name: 'Stage' },
		],
		messages: [],
		alerts: [],
		...overrides,
	}
}

type Request = { method: string; url: string; body: unknown }

/** A stand-in for the module instance that keeps what it is handed. The ApiClient
 *  is the real one, with `fetch` replaced, so a request is checked as sent. */
function harness() {
	const requests: Request[] = []
	const logs: string[] = []
	const realFetch = globalThis.fetch
	globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
		requests.push({
			method: init?.method ?? 'GET',
			url: String(url),
			body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
		})
		return new Response('{}', { status: 200 })
	}) as typeof fetch
	restore = () => {
		globalThis.fetch = realFetch
	}

	const out = {
		actions: {} as Record<string, any>,
		feedbacks: {} as Record<string, any>,
		presets: { sections: [] as any[], defs: {} as Record<string, any> },
		variables: {} as Record<string, unknown>,
	}
	const self = {
		state: new StateCache(),
		api: new ApiClient('http://stage.test'),
		log: (_level: string, message: string) => logs.push(message),
		setActionDefinitions: (d: Record<string, any>) => (out.actions = d),
		setFeedbackDefinitions: (d: Record<string, any>) => (out.feedbacks = d),
		setPresetDefinitions: (sections: any[], defs: Record<string, any>) => (out.presets = { sections, defs }),
		setVariableValues: (v: Record<string, unknown>) => Object.assign(out.variables, v),
		setVariableDefinitions: () => undefined,
	}
	const mod = self as unknown as ModuleInstance
	return {
		self,
		requests,
		logs,
		out,
		actions: () => (UpdateActions(mod), out.actions),
		feedbacks: () => (UpdateFeedbacks(mod), out.feedbacks),
		presets: () => (UpdatePresets(mod), out.presets),
		variables: () => (SetVariableValues(mod), out.variables),
	}
}

let restore = (): void => undefined
afterEach(() => restore())

describe('message variables', () => {
	it('read the newest message, the newest reply and the newest running alert off a frame', () => {
		const h = harness()
		h.self.state.applyMessages(
			frame({
				messages: [
					msg({
						id: '1'.repeat(16),
						at: 1000,
						text: 'first',
						to: [GREEN, STAGE],
						replies: [{ id: 'r1', at: 5000, from: 'Drums', text: 'Copy' }],
					}),
					msg({
						id: '2'.repeat(16),
						at: 2000,
						text: 'second',
						from: 'Companion',
						to: [STAGE],
						replies: [{ id: 'r2', at: 3000, from: 'Keys', text: 'Need 2 min' }],
					}),
				],
				alerts: [msg({ id: '3'.repeat(16), at: 4000, text: 'Fire drill', alert: true })],
			}),
		)
		const v = h.variables()
		assert.equal(v.message_last_text, 'second')
		assert.equal(v.message_last_from, 'Companion')
		assert.equal(v.message_last_to, 'Stage')
		// The newest reply is by its own time, not by which message holds it.
		assert.equal(v.message_reply_text, 'Copy')
		assert.equal(v.message_reply_from, 'Drums')
		assert.equal(v.message_alert_active, 'true')
		assert.equal(v.message_alert_text, 'Fire drill')
	})

	it('name each group of the newest message, and say Everyone for Everyone', () => {
		const h = harness()
		h.self.state.applyMessages(frame({ messages: [msg({ to: [GREEN, STAGE] })] }))
		assert.equal(h.variables().message_last_to, 'Green room, Stage')
		h.self.state.applyMessages(frame({ messages: [msg({ to: ['everyone'] })] }))
		assert.equal(h.variables().message_last_to, 'Everyone')
	})

	const empty = {
		message_last_text: '',
		message_last_from: '',
		message_last_to: '',
		message_reply_text: '',
		message_reply_from: '',
		message_alert_active: 'false',
		message_alert_text: '',
	}

	it('are empty before any frame has arrived', () => {
		const v = harness().variables()
		assert.deepEqual(Object.fromEntries(Object.keys(empty).map((k) => [k, v[k]])), empty)
	})

	it('are empty again after a frame with no messages, such as the nightly clear', () => {
		const h = harness()
		h.self.state.applyMessages(
			frame({
				messages: [msg({ replies: [{ id: 'r', at: 2, from: 'Drums', text: 'Copy' }] })],
				alerts: [msg({ alert: true })],
			}),
		)
		assert.equal(h.variables().message_last_text, 'Walk now')
		h.self.state.applyMessages(frame())
		const v = h.variables()
		assert.deepEqual(Object.fromEntries(Object.keys(empty).map((k) => [k, v[k]])), empty)
	})
})

describe('message_alert_running', () => {
	const run = (h: ReturnType<typeof harness>, group: string): boolean =>
		h.feedbacks().message_alert_running.callback({ options: { group } })

	it('is off with no alert running, and on for any group while one is', () => {
		const h = harness()
		h.self.state.applyMessages(frame())
		assert.equal(run(h, '__any__'), false)
		h.self.state.applyMessages(frame({ alerts: [msg({ alert: true, to: [GREEN] })] }))
		assert.equal(run(h, '__any__'), true)
	})

	it('with a group filter is on only for an alert that reaches that group', () => {
		const h = harness()
		h.self.state.applyMessages(frame({ alerts: [msg({ alert: true, to: [GREEN] })] }))
		assert.equal(run(h, GREEN), true)
		assert.equal(run(h, STAGE), false, 'an alert to Green room does not light a Stage button')
	})

	it('with a group filter counts an alert sent to Everyone, which every group sees', () => {
		const h = harness()
		h.self.state.applyMessages(frame({ alerts: [msg({ alert: true, to: ['everyone'] })] }))
		assert.equal(run(h, STAGE), true)
	})
})

describe('dropdowns follow the groups', () => {
	const choicesOf = (defs: Record<string, any>, id: string, option: string): { id: string; label: string }[] =>
		defs[id].options.find((o: { id: string }) => o.id === option).choices

	it('show Everyone and each group, and pick up a rename without a reconnect', () => {
		const h = harness()
		h.self.state.applyMessages(frame())
		assert.deepEqual(choicesOf(h.actions(), 'message_send', 'groups'), [
			{ id: 'everyone', label: 'Everyone' },
			{ id: GREEN, label: 'Green room' },
			{ id: STAGE, label: 'Stage' },
		])

		const renamed = frame({
			groups: [
				{ id: GREEN, name: 'Green room' },
				{ id: STAGE, name: 'Main stage' },
			],
		})
		const applied = h.self.state.applyMessages(renamed)
		assert.equal(applied.choicesChanged, true, 'a rename must redefine the dropdowns')
		const labels = (choices: { label: string }[]): string[] => choices.map((c) => c.label)
		assert.deepEqual(labels(choicesOf(h.actions(), 'message_send', 'groups')), ['Everyone', 'Green room', 'Main stage'])
		assert.deepEqual(labels(choicesOf(h.actions(), 'message_send_quick', 'groups')), [
			'Everyone',
			'Green room',
			'Main stage',
		])
		assert.deepEqual(labels(choicesOf(h.feedbacks(), 'message_alert_running', 'group')), [
			'Any group',
			'Green room',
			'Main stage',
		])
	})

	it('do not ask for a redefine when a message arrives and nothing else moved', () => {
		const h = harness()
		h.self.state.applyMessages(frame())
		const applied = h.self.state.applyMessages(frame({ messages: [msg()] }))
		assert.deepEqual(applied, { choicesChanged: false, presetsChanged: false })
	})

	it('list the quick messages from GET /api/messaging, and from a frame that carries them', () => {
		const h = harness()
		h.self.state.applyMessaging({ groups: [], quickMessages: ['Walk now', '2 minutes'] })
		assert.deepEqual(
			h.actions().message_send_quick.options[0].choices.map((c: { label: string }) => c.label),
			['Walk now', '2 minutes'],
		)
		// A frame without them leaves the list as it was.
		h.self.state.applyMessages(frame())
		assert.deepEqual(h.self.state.quickMessages, ['Walk now', '2 minutes'])
		// A frame with them is live.
		const applied = h.self.state.applyMessages(frame({ quickMessages: ['Wrap it up'] }))
		assert.equal(applied.presetsChanged, true)
		assert.deepEqual(h.self.state.quickMessages, ['Wrap it up'])
	})
})

describe('message actions', () => {
	const press = async (h: ReturnType<typeof harness>, id: string, options: Record<string, unknown>): Promise<void> => {
		await h.actions()[id].callback({ options })
	}

	it('message_send posts the groups, text and alert, from Companion', async () => {
		const h = harness()
		await press(h, 'message_send', { groups: [GREEN, STAGE], text: '2 minutes', alert: true })
		assert.deepEqual(h.requests, [
			{
				method: 'POST',
				url: 'http://stage.test/api/messages',
				body: { to: [GREEN, STAGE], text: '2 minutes', alert: true, from: 'Companion' },
			},
		])
	})

	it('message_send sends Everyone alone when Everyone is picked with a group', async () => {
		const h = harness()
		await press(h, 'message_send', { groups: [GREEN, 'everyone'], text: 'Hi', alert: false })
		assert.deepEqual((h.requests[0].body as { to: string[] }).to, ['everyone'])
	})

	it('message_send posts nothing, and says why, for empty text or no group', async () => {
		const h = harness()
		await press(h, 'message_send', { groups: ['everyone'], text: '   ', alert: false })
		await press(h, 'message_send', { groups: [], text: 'Hi', alert: false })
		assert.deepEqual(h.requests, [])
		assert.equal(h.logs.length, 2)
		assert.match(h.logs[0], /the text is empty/)
		assert.match(h.logs[1], /no group is picked/)
	})

	it('message_send_quick posts the chosen quick message to the chosen groups', async () => {
		const h = harness()
		await press(h, 'message_send_quick', { quick: 'Wrap it up', groups: [STAGE], alert: false })
		assert.deepEqual(h.requests, [
			{
				method: 'POST',
				url: 'http://stage.test/api/messages',
				body: { to: [STAGE], text: 'Wrap it up', alert: false, from: 'Companion' },
			},
		])
	})

	it('message_clear_alerts clears every running alert, and only those', async () => {
		const h = harness()
		const a = 'a'.repeat(16)
		const b = 'b'.repeat(16)
		h.self.state.applyMessages(
			frame({
				messages: [msg({ id: 'c'.repeat(16) })],
				alerts: [msg({ id: a, alert: true }), msg({ id: b, alert: true })],
			}),
		)
		await press(h, 'message_clear_alerts', {})
		assert.deepEqual(h.requests, [
			{ method: 'POST', url: `http://stage.test/api/messages/${a}/clear-alert`, body: { from: 'Companion' } },
			{ method: 'POST', url: `http://stage.test/api/messages/${b}/clear-alert`, body: { from: 'Companion' } },
		])
	})

	it('message_clear_alerts does nothing when no alert is running', async () => {
		const h = harness()
		h.self.state.applyMessages(frame({ messages: [msg()] }))
		await press(h, 'message_clear_alerts', {})
		assert.deepEqual(h.requests, [])
	})

	it('message_clear_alerts tries every alert even when one fails, and logs the failure', async () => {
		const h = harness()
		const calls: string[] = []
		globalThis.fetch = (async (url: string | URL) => {
			calls.push(String(url))
			return new Response('{}', { status: calls.length === 1 ? 500 : 200 })
		}) as typeof fetch
		h.self.state.applyMessages(
			frame({ alerts: [msg({ id: 'a'.repeat(16), alert: true }), msg({ id: 'b'.repeat(16), alert: true })] }),
		)
		await press(h, 'message_clear_alerts', {})
		assert.equal(calls.length, 2, 'the second alert is still cleared')
		assert.match(h.logs[0], /1 of 2 failed/)
	})
})

describe('message presets', () => {
	it('make one Send button per quick message, to Everyone, and a Clear alerts button', () => {
		const h = harness()
		h.self.state.applyMessaging({ groups: [], quickMessages: ['Walk now', '2 minutes'] })
		const { sections, defs } = h.presets()
		const section = sections.find((s: { id: string }) => s.id === 'messages')
		assert.deepEqual(section.definitions, ['message_quick_1', 'message_quick_2', 'message_clear_alerts'])
		assert.deepEqual(defs.message_quick_2.steps[0].down, [
			{ actionId: 'message_send_quick', options: { quick: '2 minutes', groups: ['everyone'], alert: false } },
		])
		assert.equal(defs.message_clear_alerts.steps[0].down[0].actionId, 'message_clear_alerts')
		assert.equal(defs.message_clear_alerts.feedbacks[0].feedbackId, 'message_alert_running')
	})
})
