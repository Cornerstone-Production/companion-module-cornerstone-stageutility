// Pure baptism-timer math — mirrors the app's main/services/baptism-elapsed.ts
// (isPaused), renderer/main/use-baptism-state.ts (summarizeBaptism) and the
// baptism-timer layout object's phase/person fields
// (renderer/main/layout-renderer.tsx). Dependency-free and clock-free except
// where a caller passes a time in, so every case here is testable without a
// running module — see baptism.ts's own header.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	baptismIsPaused,
	baptismPersonLabel,
	baptismPhaseWord,
	baptismTestimonyMs,
	summarizeBaptism,
} from './baptism.js'
import type { BaptismPersonDTO, BaptismStateDTO } from './types.js'

function state(overrides: Partial<BaptismStateDTO> = {}): BaptismStateDTO {
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

const person = (testimonyMs: number, baptizeMs: number): BaptismPersonDTO => ({ testimonyMs, baptizeMs })

describe('summarizeBaptism', () => {
	it('counts people actually baptized (baptizeMs > 0), never testimonies', () => {
		// Three testimonies banked, nobody baptized yet — the exact shape a
		// grouped session has right after the testimony pass and before the
		// first baptism. The app's own summarizeBaptism was once fixed for this
		// exact bug: counting `people.length` here reads 3 baptized with nobody
		// in the water.
		const people = [person(60_000, 0), person(45_000, 0), person(30_000, 0)]
		const summary = summarizeBaptism(people)
		assert.equal(summary.count, 0, 'testimonies alone must not count as baptisms')
	})

	it('counts exactly the entries with a real baptizeMs', () => {
		const people = [person(60_000, 42_000), person(45_000, 0), person(30_000, 51_000)]
		assert.equal(summarizeBaptism(people).count, 2)
	})

	it('averages testimony over everyone who testified, baptism only over those actually baptized', () => {
		const people = [person(60_000, 30_000), person(40_000, 0), person(20_000, 10_000)]
		const summary = summarizeBaptism(people)
		// avgTestimonyMs: (60000+40000+20000)/3 = 40000
		assert.equal(summary.avgTestimonyMs, 40_000)
		// avgBaptizeMs: (30000+10000)/2 = 20000 — divided by BAPTIZED count, not 3
		assert.equal(summary.avgBaptizeMs, 20_000)
	})

	it('is all zero for an empty or missing list, never NaN from a division by zero', () => {
		assert.deepEqual(summarizeBaptism([]), { count: 0, avgTestimonyMs: 0, avgBaptizeMs: 0 })
		assert.deepEqual(summarizeBaptism(undefined), { count: 0, avgTestimonyMs: 0, avgBaptizeMs: 0 })
	})
})

describe('baptismIsPaused', () => {
	it('is false while idle — nothing has started to be paused', () => {
		assert.equal(baptismIsPaused(state({ phase: 'idle', segmentStartedAt: null })), false)
	})

	it('is false while armed — looks like a paused segment (no start, nothing banked) but has nothing to resume', () => {
		assert.equal(
			baptismIsPaused(state({ phase: 'baptism', armed: true, segmentStartedAt: null, segmentAccumMs: 0 })),
			false,
		)
	})

	it('is false while a clock is running', () => {
		assert.equal(baptismIsPaused(state({ segmentStartedAt: '2026-09-27T12:00:00.000Z' })), false)
	})

	it('is true once a running clock has been paused', () => {
		assert.equal(baptismIsPaused(state({ segmentStartedAt: null, segmentAccumMs: 12_000 })), true)
	})

	it('is false for a null state', () => {
		assert.equal(baptismIsPaused(null), false)
	})
})

describe('baptismTestimonyMs', () => {
	it('is null while the testimony itself is still running — baptism_segment is the ticking clock for that', () => {
		assert.equal(baptismTestimonyMs(state({ phase: 'testimony' })), null)
	})

	it('is null while idle', () => {
		assert.equal(baptismTestimonyMs(state({ phase: 'idle' })), null)
	})

	it('per-person: reads pendingTestimonyMs once baptizing begins', () => {
		const s = state({ mode: 'per-person', phase: 'baptism', pendingTestimonyMs: 107_000 })
		assert.equal(baptismTestimonyMs(s), 107_000)
	})

	it('grouped: reads the CURRENT person being baptized, not the last one taken', () => {
		const s = state({
			mode: 'grouped',
			phase: 'baptism',
			baptismIndex: 1,
			people: [person(60_000, 30_000), person(107_000, 0), person(45_000, 0)],
		})
		assert.equal(baptismTestimonyMs(s), 107_000)
	})
})

describe('baptismPhaseWord', () => {
	it('reads armed while armed, never "baptism" — the same distinction the app draws for the same reason', () => {
		assert.equal(baptismPhaseWord(state({ phase: 'baptism', armed: true })), 'armed')
	})

	it('otherwise reads the phase itself', () => {
		assert.equal(baptismPhaseWord(state({ phase: 'idle' })), 'idle')
		assert.equal(baptismPhaseWord(state({ phase: 'testimony' })), 'testimony')
		assert.equal(baptismPhaseWord(state({ phase: 'baptism', armed: false })), 'baptism')
	})

	it('reads idle for a null state', () => {
		assert.equal(baptismPhaseWord(null), 'idle')
	})
})

describe('baptismPersonLabel', () => {
	it("testimony phase: the testimony person's own number, in either mode", () => {
		assert.equal(baptismPersonLabel(state({ phase: 'testimony', personNumber: 3, mode: 'grouped' })), 'Person 3')
	})

	it('grouped baptism phase: N of M once the testimony pass has filled people', () => {
		const s = state({
			mode: 'grouped',
			phase: 'baptism',
			personNumber: 7, // the frozen testimony counter — must not leak in as "7 of 7"
			baptismIndex: 2,
			people: Array.from({ length: 7 }, () => person(60_000, 0)),
		})
		assert.equal(baptismPersonLabel(s), '3 of 7')
	})

	it('per-person mode has no "of M", even mid-baptism', () => {
		const s = state({ mode: 'per-person', phase: 'baptism', personNumber: 2 })
		assert.equal(baptismPersonLabel(s), 'Person 2')
	})

	it('armed says armed, never a person number that reads as an active baptism', () => {
		const s = state({ mode: 'grouped', phase: 'baptism', armed: true, baptismIndex: 0, people: [person(60_000, 0)] })
		assert.equal(baptismPersonLabel(s), 'armed')
	})

	it('is blank while idle', () => {
		assert.equal(baptismPersonLabel(state({ phase: 'idle' })), '')
	})

	it('is blank for a null state', () => {
		assert.equal(baptismPersonLabel(null), '')
	})
})
