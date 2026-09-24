// StateCache's baptism derivations. The guard the spec names: a baptism:state
// frame whose segmentStartedAt is in the past must yield a baptism_segment that
// keeps advancing on the module's 1s ticker with no further frame arriving —
// the same delivery-compensated serverNowMs() countdownSeconds() and
// streamElapsedSeconds() already use, so a clock counts smoothly between the
// SSE pushes instead of stepping once whenever the next frame happens to land.
//
// This is the first test file in the module (see README/CLAUDE notes for why:
// no runner was wired up before this task). Date.now is monkey-patched rather
// than slept on, so the proof is exact and not a real-clock race.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { StateCache } from './state.js'
import type { BaptismStateDTO } from './types.js'

function baptismFixture(overrides: Partial<BaptismStateDTO> = {}): BaptismStateDTO {
	return {
		mode: 'grouped',
		phase: 'testimony',
		personNumber: 1,
		baptismIndex: 0,
		armed: false,
		segmentStartedAt: null,
		segmentAccumMs: 0,
		sessionStartedAt: null,
		finishedAt: null,
		people: [],
		pendingTestimonyMs: null,
		...overrides,
	}
}

/** Runs `fn` with Date.now() pinned to `ms`, restoring the real clock after —
 *  even if `fn` throws. */
function withClock<T>(ms: number, fn: () => T): T {
	const real = Date.now
	Date.now = () => ms
	try {
		return fn()
	} finally {
		Date.now = real
	}
}

describe('StateCache.baptismSegmentSeconds', () => {
	it('advances on the ticker without a further frame arriving', () => {
		const base = Date.parse('2026-09-27T12:00:00.000Z')
		const state = new StateCache()
		state.baptism = baptismFixture({ segmentStartedAt: '2026-09-27T11:59:00.000Z' }) // 60s in the past

		const first = withClock(base, () => state.baptismSegmentSeconds())
		assert.equal(first, 60)

		// The SAME frame — nothing reassigns state.baptism between these two
		// calls. Only the clock moves, exactly as the 1s ticker calls this
		// between SSE pushes.
		const second = withClock(base + 5000, () => state.baptismSegmentSeconds())
		assert.equal(second, 65, 'must advance from the clock alone, with no further frame')
	})

	it('is delivery-compensated through the same clockOffsetMs countdownSeconds() and streamElapsedSeconds() use', () => {
		const base = Date.parse('2026-09-27T12:00:00.000Z')
		const state = new StateCache()
		state.clockOffsetMs = 10_000 // the server's clock reads 10s ahead of this machine's
		state.baptism = baptismFixture({ segmentStartedAt: '2026-09-27T11:59:00.000Z' })

		// serverNowMs() = base + 10_000 = 12:00:10, minus 11:59:00 = 70s — not 60.
		const seconds = withClock(base, () => state.baptismSegmentSeconds())
		assert.equal(seconds, 70)
	})

	it('banks time already run before the clock was last set', () => {
		const base = Date.parse('2026-09-27T12:00:00.000Z')
		const state = new StateCache()
		state.baptism = baptismFixture({ segmentStartedAt: '2026-09-27T12:00:05.000Z', segmentAccumMs: 30_000 })
		// Not yet reached segmentStartedAt in this fixture — 5s still to run —
		// so elapsed is exactly the banked amount, clamped at zero, not negative.
		const seconds = withClock(base, () => state.baptismSegmentSeconds())
		assert.equal(seconds, 30)
	})

	it('is null while idle — nothing is running, and nothing is armed either', () => {
		const state = new StateCache()
		state.baptism = baptismFixture({ phase: 'idle', segmentStartedAt: null })
		assert.equal(state.baptismSegmentSeconds(), null)
	})

	it('reads 0 while armed, not null — a real segment exists, it has simply not started', () => {
		const state = new StateCache()
		state.baptism = baptismFixture({ phase: 'baptism', armed: true, segmentStartedAt: null, segmentAccumMs: 0 })
		assert.equal(state.baptismSegmentSeconds(), 0)
	})

	it('holds still while genuinely paused — banked time, no running start — across two different reads of the clock', () => {
		const base = Date.parse('2026-09-27T12:00:00.000Z')
		const state = new StateCache()
		// segmentStartedAt: null with time already banked is a PAUSE, not armed
		// (armed also has null/0, but never any banked time) and not idle (a
		// real session is in progress). Nothing here should read the clock at
		// all, so two reads three real seconds apart must agree exactly.
		state.baptism = baptismFixture({ phase: 'testimony', segmentStartedAt: null, segmentAccumMs: 42_000 })

		const first = withClock(base, () => state.baptismSegmentSeconds())
		const second = withClock(base + 3_000, () => state.baptismSegmentSeconds())
		assert.equal(first, 42)
		assert.equal(second, 42, 'a paused segment must not advance with the clock')
	})

	it('is null before any baptism:state frame has ever arrived', () => {
		const state = new StateCache()
		assert.equal(state.baptism, null)
		assert.equal(state.baptismSegmentSeconds(), null)
	})
})

describe('StateCache.baptismSessionSeconds', () => {
	it('is the wall clock since sessionStartedAt, and keeps advancing with no further frame', () => {
		const base = Date.parse('2026-09-27T12:00:00.000Z')
		const state = new StateCache()
		state.baptism = baptismFixture({ sessionStartedAt: '2026-09-27T11:45:00.000Z' })

		assert.equal(
			withClock(base, () => state.baptismSessionSeconds()),
			900,
		) // 15 minutes
		assert.equal(
			withClock(base + 60_000, () => state.baptismSessionSeconds()),
			960,
			'must advance from the clock alone',
		)
	})

	it('keeps counting through a pause — it is the wall clock, not the segment', () => {
		const base = Date.parse('2026-09-27T12:00:00.000Z')
		const state = new StateCache()
		state.baptism = baptismFixture({
			sessionStartedAt: '2026-09-27T11:45:00.000Z',
			segmentStartedAt: null, // the segment itself is paused
			segmentAccumMs: 5_000,
		})
		assert.equal(
			withClock(base, () => state.baptismSessionSeconds()),
			900,
		)
	})

	it('freezes at the finished length once the session ends, rather than climbing further', () => {
		const base = Date.parse('2026-09-27T12:00:00.000Z')
		const state = new StateCache()
		state.baptism = baptismFixture({
			sessionStartedAt: '2026-09-27T11:45:00.000Z',
			finishedAt: '2026-09-27T11:59:00.000Z', // 14 minutes
		})
		const long_after = base + 600_000
		assert.equal(
			withClock(long_after, () => state.baptismSessionSeconds()),
			840,
		)
	})

	it('is null before any session has started', () => {
		const state = new StateCache()
		state.baptism = baptismFixture({ sessionStartedAt: null })
		assert.equal(state.baptismSessionSeconds(), null)
	})
})
