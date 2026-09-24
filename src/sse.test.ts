// The channel list the module subscribes to. baptism:state has to be IN this
// list, or the server never sends it at all — the module posts exactly this
// array to /api/events/subscribe (see SseClient.reportChannels), so a channel
// missing here is a channel that silently never arrives, no matter what
// main.ts's onSseEvent switch does with it.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SSE_EVENTS } from './sse.js'

describe('SSE_EVENTS', () => {
	it('subscribes to baptism:state', () => {
		assert.ok(
			SSE_EVENTS.includes('baptism:state'),
			'baptism:state is missing from SSE_EVENTS — the server will never send it',
		)
	})

	// EXACT, sorted, one entry per line — never a bare count. Two channels added
	// in parallel branches would still merge past a count with no conflict.
	it('is exactly this sorted list of channels', () => {
		assert.deepEqual([...SSE_EVENTS].sort(), [
			'baptism:state',
			'companion:signals',
			'obs:status',
			'pco:live',
			'people:count',
			'prodcom:transcript',
			'propresenter:status',
			'pvp:status',
			'reaper:status',
			'resi:status',
			'server:hello',
			'stage:state-changed',
			'wireless:connections-changed',
			'youtube:status',
		])
	})
})
