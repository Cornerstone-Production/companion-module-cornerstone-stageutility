import type { PvpLayerDTO } from './types.js'

// Pure ProVideoPlayer math, mirroring the app's renderer/main/pvp-progress.ts
// and pvp-now.tsx so the Stream Deck agrees with the wall. Kept pure and
// dependency-free (no StateCache, no clock reads) so every case is testable
// without a running module — there is no test runner wired up in this repo
// (no test script in package.json, no vitest/jest/mocha config), so these are
// written to be trivially exercised by hand or by whichever runner is added
// later.

/** A layer is "showing something" — mirrors main/types/pvp.ts hasContent(). */
export const hasContent = (l: PvpLayerDTO): boolean => l.state !== 'empty'

/**
 * Which layer counts as "now", with no layer chosen.
 *
 * Mirrors renderer/main/pvp-now.tsx chooseNowLayer's un-named branch (line 58):
 * "follows content, preferring the FIRST layer in PVP's own stack order that
 * holds something" — the same rule pvp-object.tsx's default filter uses. This
 * module has no per-button layer-name option (out of scope here), so it always
 * takes that branch.
 */
export function pvpNowLayer(layers: readonly PvpLayerDTO[]): PvpLayerDTO | null {
	return layers.find(hasContent) ?? null
}

export interface PvpProgress {
	/** Seconds into the clip, clamped to [0, durationSec]. */
	elapsedSec: number
	/** Seconds left, clamped to [0, durationSec]. */
	remainingSec: number
	durationSec: number
}

/**
 * Mirrors renderer/main/pvp-progress.ts computePvpProgress exactly (elapsed =
 * anchorElapsedSec + playbackRate * (serverNowMs - anchorMs) / 1000, clamped to
 * [0, duration]). Returns null for nothing to time: no layer, no duration, no
 * anchor, or an unparsable sample timestamp — same as the widget.
 */
export function pvpProgress(
	layer: PvpLayerDTO | null,
	sampledAt: string | null,
	serverNowMs: number,
): PvpProgress | null {
	if (!layer) return null
	const duration = layer.durationSec
	if (duration == null || duration <= 0) return null
	if (layer.anchorElapsedSec == null) return null

	const anchorMs = Date.parse(sampledAt ?? '')
	if (!Number.isFinite(anchorMs)) return null

	const sinceAnchorSec = (serverNowMs - anchorMs) / 1000
	const raw = layer.anchorElapsedSec + layer.playbackRate * sinceAnchorSec
	const elapsedSec = Math.min(duration, Math.max(0, raw))

	return { elapsedSec, remainingSec: duration - elapsedSec, durationSec: duration }
}

export type PvpBadge = 'empty' | 'still' | 'paused' | 'playing' | 'ended'

/**
 * The state word, mirroring renderer/main/pvp-now.tsx nowBadge exactly:
 * "playing" is playbackRate > 0 (never the DTO's raw "video" state word, which
 * says nothing about whether a paused clip is rolling); a paused clip is the
 * one that still has a duration/progress; a still is the one that does not.
 */
export function pvpBadge(layer: PvpLayerDTO | null, progress: PvpProgress | null): PvpBadge {
	if (!layer || !hasContent(layer)) return 'empty'
	// A clip that ran out and is holding its last frame. PVP keeps reporting the
	// rate it stopped at (1 was observed), so the state must be read before the
	// rate, or a finished bumper reads "playing" for the rest of the service.
	if (layer.state === 'ended') return 'ended'
	if (layer.playbackRate > 0) return 'playing'
	return progress ? 'paused' : 'still'
}

/**
 * Formats a duration exactly like renderer/main/pco-timer.ts fmtDuration: days
 * for a long wait ("6d 2h"), h:mm:ss past an hour, else m:ss. Negative → a
 * leading "−".
 */
export function pvpFmtDuration(totalSec: number): string {
	const neg = totalSec < 0
	const s = Math.abs(Math.round(totalSec))
	const days = Math.floor(s / 86400)
	if (days >= 1) {
		const h = Math.floor((s % 86400) / 3600)
		return `${neg ? '−' : ''}${days}d ${h}h`
	}
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	const sec = s % 60
	const body =
		h > 0
			? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
			: `${m}:${String(sec).padStart(2, '0')}`
	return neg ? `−${body}` : body
}

/**
 * Strips a trailing file extension for a shorter media label. Same rule as the
 * app's compact ProVideoPlayer widget (renderer/main/pvp-now.tsx
 * stripExtension), so a button and a wall tile show the same words.
 */
export function stripExtension(name: string): string {
	const dot = name.lastIndexOf('.')
	return dot > 0 ? name.slice(0, dot) : name
}
