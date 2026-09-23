import type { BaptismPersonDTO, BaptismStateDTO } from './types.js'

// Pure baptism-timer math, mirroring the app's main/services/baptism-elapsed.ts
// (isPaused), renderer/main/use-baptism-state.ts (summarizeBaptism) and the
// baptism-timer layout object's phase/person fields
// (renderer/main/layout-renderer.tsx) — so a Stream Deck and the app's own
// stage display never disagree about what a phase, a person or a count means.
//
// Kept pure and dependency-free (no StateCache, no clock reads except where a
// caller passes one in), the same reasoning pvp.ts documents: every case here
// is testable without a running module.

/** A segment's own fields — `segmentStartedAt`/`segmentAccumMs` off the DTO,
 *  named separately so the elapsed math below does not require a whole
 *  BaptismStateDTO for a calculation that only ever reads these two. */
export interface BaptismSegment {
	segmentStartedAt: string | null
	segmentAccumMs?: number
}

/**
 * Elapsed milliseconds for a segment, paused or running — mirrors the app's
 * `segmentElapsedMs` exactly: "time already banked, plus time since it last
 * resumed". `nowMs` is the caller's delivery-compensated `serverNowMs()`, so a
 * clock here counts smoothly between SSE pushes instead of stepping once per
 * frame.
 */
export function baptismSegmentElapsedMs(seg: BaptismSegment, nowMs: number): number {
	const banked = Math.max(0, seg.segmentAccumMs ?? 0)
	if (!seg.segmentStartedAt) return banked
	const started = Date.parse(seg.segmentStartedAt)
	if (!Number.isFinite(started)) return banked
	return banked + Math.max(0, nowMs - started)
}

/** True once a running clock has been explicitly paused. Armed looks
 *  identical on the wire (no start, nothing banked) but is not paused — it has
 *  never run, so there is nothing to resume. Idle is not paused either: there
 *  is no session at all. */
export function baptismIsPaused(state: BaptismStateDTO | null): boolean {
	return !!state && state.phase !== 'idle' && !state.armed && !state.segmentStartedAt
}

export interface BaptismSummary {
	/** People actually baptized — baptizeMs > 0. NEVER people.length: in
	 *  grouped mode `people` fills during the testimony pass, before anyone is
	 *  baptized, with `baptizeMs` sitting at 0 until a baptism actually closes
	 *  that entry. The app's own summarizeBaptism was once fixed for exactly
	 *  this miscount — counting three testimonies as three baptisms with
	 *  nobody in the water yet — and this mirrors that fix rather than
	 *  re-deriving it badly. */
	count: number
	/** Average testimony length, over everyone who testified. */
	avgTestimonyMs: number
	/** Average baptism length, over people actually baptized — divided by
	 *  `count`, not by `people.length`. */
	avgBaptizeMs: number
}

export function summarizeBaptism(people: readonly BaptismPersonDTO[] | undefined): BaptismSummary {
	const list = people ?? []
	const baptized = list.filter((p) => p.baptizeMs > 0)
	const totalTestimonyMs = list.reduce((a, p) => a + p.testimonyMs, 0)
	const totalBaptizeMs = baptized.reduce((a, p) => a + p.baptizeMs, 0)
	return {
		count: baptized.length,
		avgTestimonyMs: list.length ? totalTestimonyMs / list.length : 0,
		avgBaptizeMs: baptized.length ? totalBaptizeMs / baptized.length : 0,
	}
}

/**
 * This person's own testimony, once banked — NOT the live segment clock
 * (`baptism_segment`'s job). Null while nothing is banked yet: idle, or their
 * testimony is still running, in which case `baptism_segment` is the ticking
 * value for that same stretch.
 */
export function baptismTestimonyMs(state: BaptismStateDTO | null): number | null {
	if (!state || state.phase !== 'baptism') return null
	return state.mode === 'per-person'
		? (state.pendingTestimonyMs ?? 0)
		: (state.people[state.baptismIndex]?.testimonyMs ?? 0)
}

/** The word — armed reads as its own phase rather than "baptism", the same
 *  distinction the app's baptism-timer object draws for its `phase` field and
 *  its `live` field's fallback: armed has no clock running, and "baptism"
 *  here would claim one does. */
export function baptismPhaseWord(state: BaptismStateDTO | null): string {
	if (!state) return 'idle'
	return state.armed ? 'armed' : state.phase
}

/**
 * "Person 3", or "3 of 7" in grouped mode once the testimony pass has filled
 * `people` — mirrors the app's baptism-timer `person` field exactly.
 *
 * `personNumber` is the TESTIMONY counter in grouped mode and freezes once the
 * baptism section arms; the person being baptized is `baptismIndex` (0-based)
 * of `people.length`, only meaningful once the testimony pass has run.
 * Per-person mode never has a total, so it is always "Person N". Armed reads
 * "armed" rather than "1 of 7" — indistinguishable from person 1 already being
 * baptized, the same ambiguity the app's `live` field already guards against.
 */
export function baptismPersonLabel(state: BaptismStateDTO | null): string {
	if (!state || state.phase === 'idle') return ''
	if (state.armed) return 'armed'
	if (state.phase === 'testimony' || state.mode === 'per-person') return `Person ${state.personNumber}`
	return `${state.baptismIndex + 1} of ${state.people.length}`
}
