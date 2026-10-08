// What the messages:state handler and the hydrate DO to the instance: which
// redefinitions they ask for, when, and what they leave in the cache. They are
// functions of a narrow host rather than methods of the module, so these run the
// real ones against a recording host.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyMessagesFrame, applyMessagesHydrate, type FrameHost } from './messages.js'
import { StateCache } from './state.js'
import type { MessagesStateDTO, StageMessageDTO } from './types.js'

const GREEN = 'g-11111111'

function msg(overrides: Partial<StageMessageDTO> = {}): StageMessageDTO {
	return {
		id: 'a'.repeat(16),
		at: 1,
		to: ['everyone'],
		text: 'Walk now',
		alert: false,
		from: 'Operator',
		replies: [],
		...overrides,
	}
}

function frame(overrides: Partial<MessagesStateDTO> = {}): MessagesStateDTO {
	return { groups: [{ id: GREEN, name: 'Green room' }], messages: [], alerts: [], ...overrides }
}

/** A host that counts what it is asked to do. */
function host() {
	const calls: string[] = []
	const h: FrameHost = {
		state: new StateCache(),
		updatePresets: () => calls.push('updatePresets'),
		refreshDefinitions: () => calls.push('refreshDefinitions'),
		refreshVariables: () => calls.push('refreshVariables'),
		checkFeedbacks: (id) => calls.push(`checkFeedbacks:${id}`),
	}
	return { h, calls }
}

describe('applyMessagesFrame', () => {
	it('redefines the dropdowns, not the presets, when a group is renamed, and refreshes variables and the alert light', () => {
		const { h, calls } = host()
		applyMessagesFrame(h, frame())
		calls.length = 0
		applyMessagesFrame(h, frame({ groups: [{ id: GREEN, name: 'Main stage' }] }))
		assert.deepEqual(calls, ['refreshDefinitions', 'refreshVariables', 'checkFeedbacks:message_alert_running'])
	})

	it('redefines the presets as well as the dropdowns when the quick messages change', () => {
		const { h, calls } = host()
		applyMessagesFrame(h, frame())
		calls.length = 0
		applyMessagesFrame(h, frame({ quickMessages: ['Wrap it up'] }))
		assert.deepEqual(calls, [
			'refreshDefinitions',
			'updatePresets',
			'refreshVariables',
			'checkFeedbacks:message_alert_running',
		])
	})

	it('redefines nothing when a message arrives, but still refreshes variables and the alert light', () => {
		const { h, calls } = host()
		applyMessagesFrame(h, frame())
		calls.length = 0
		applyMessagesFrame(h, frame({ messages: [msg()], alerts: [msg({ alert: true })] }))
		assert.deepEqual(calls, ['refreshVariables', 'checkFeedbacks:message_alert_running'])
		assert.equal(h.state.messages?.alerts.length, 1)
	})

	it('counts every frame it applies', () => {
		const { h } = host()
		applyMessagesFrame(h, frame())
		applyMessagesFrame(h, frame())
		assert.equal(h.state.messagesFrames, 2)
	})

	it('ignores a payload that did not parse, leaving the cache and the instance alone', () => {
		const { h, calls } = host()
		applyMessagesFrame(h, frame({ messages: [msg()] }))
		calls.length = 0
		for (const bad of [null, undefined, 'x', {}, { groups: 'no' }]) applyMessagesFrame(h, bad)
		assert.deepEqual(calls, [])
		assert.equal(h.state.messages?.messages.length, 1, 'the last good frame is still there')
		assert.equal(h.state.messagesFrames, 1)
	})
})

describe('StateCache.applyMessages', () => {
	it('does not throw on a null frame, and keeps what it held', () => {
		const state = new StateCache()
		state.applyMessages(frame())
		const applied = state.applyMessages(null as unknown as MessagesStateDTO)
		assert.deepEqual(applied, { choicesChanged: false, presetsChanged: false })
		assert.ok(state.messages, 'a null frame must not blank the state')
	})
})

describe('applyMessagesHydrate', () => {
	it('applies GET /api/messaging and GET /api/messages, and redefines the presets for a new quick list', () => {
		const { h, calls } = host()
		applyMessagesHydrate(h, {
			messaging: { groups: [], quickMessages: ['Walk now'] },
			messages: frame({ messages: [msg()] }),
			framesBefore: 0,
		})
		assert.deepEqual(h.state.quickMessages, ['Walk now'])
		assert.equal(h.state.messages?.messages.length, 1)
		assert.deepEqual(calls, ['updatePresets'])
	})

	it('leaves the presets alone when the quick list is the one it already had', () => {
		const { h, calls } = host()
		const fetched = { messaging: { groups: [], quickMessages: ['Walk now'] }, messages: frame(), framesBefore: 0 }
		applyMessagesHydrate(h, fetched)
		calls.length = 0
		applyMessagesHydrate(h, fetched)
		assert.deepEqual(calls, [])
	})

	it("clears the messages when GET /api/messages failed, so the last server's alerts do not stay lit", () => {
		const { h } = host()
		h.state.applyMessages(frame({ alerts: [msg({ alert: true })] }))
		applyMessagesHydrate(h, { messaging: null, messages: null, framesBefore: 0 })
		assert.equal(h.state.messages, null)
	})

	it('drops a snapshot older than a frame that landed while it was being fetched', () => {
		const { h } = host()
		const framesBefore = h.state.messagesFrames
		// The request goes out with an alert running; the alert ends and the server
		// says so before the slower response comes back.
		applyMessagesFrame(h, frame({ alerts: [] }))
		applyMessagesHydrate(h, { messaging: null, messages: frame({ alerts: [msg({ alert: true })] }), framesBefore })
		assert.equal(h.state.messages?.alerts.length, 0, 'the older snapshot must not re-light the alert')
	})

	it('keeps the frame, too, when the snapshot it raced was a failure', () => {
		const { h } = host()
		const framesBefore = h.state.messagesFrames
		applyMessagesFrame(h, frame({ messages: [msg()] }))
		applyMessagesHydrate(h, { messaging: null, messages: null, framesBefore })
		assert.equal(h.state.messages?.messages.length, 1)
	})
})
