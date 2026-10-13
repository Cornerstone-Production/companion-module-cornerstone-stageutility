// This repository is public. A private LAN address, a personal email or a
// workstation path in the tracked tree is a leak, and it ships with every
// release. This walks the exact tracked set (`git ls-files`) and fails on:
//
//   - a private IPv4 address outside the placeholder /24s below
//   - an email address that is not at a reserved example domain or a GitHub
//     noreply address
//   - a /Users/<name> or /home/<name> path whose name is not a placeholder
//   - a term from the PRIVATE_TERMS secret, or a gitignored .private-terms file,
//     one per line; the list is secret, so a finding names its index, never it
//
// It names no real value: it classifies by shape, so the allowlists below are
// the only things a contributor may widen, and they hold placeholders only.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

/** Documentation placeholders. Anything private outside these is a real address. */
const PLACEHOLDER_IPV4_PREFIXES = ['192.168.1.']
const PLACEHOLDER_EMAIL_DOMAINS = ['example.com', 'example.org', 'example.net', 'users.noreply.github.com']
const PLACEHOLDER_HOME_NAMES = ['you', 'user', 'username', 'name', 'me', 'example']
/** Machine-generated or opaque files: a lockfile hash is not prose. */
const SKIPPED_FILES = ['yarn.lock', 'package-lock.json', 'pnpm-lock.yaml']

const IPV4 = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g
const HOME_PATH = /\/(?:Users|home)\/([A-Za-z0-9._-]+)/g

function isPrivateIpv4(o: number[]): boolean {
	if (o.some((n) => n > 255)) return false
	const [a, b] = o
	return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
}

/** PRIVATE_TERMS plus a local .private-terms, lowercased, blanks dropped. */
function privateTerms(root: string): string[] {
	let raw = process.env.PRIVATE_TERMS ?? ''
	const local = join(root, '.private-terms')
	if (existsSync(local)) raw += '\n' + readFileSync(local, 'utf8')
	return raw
		.split('\n')
		.map((t) => t.trim().toLowerCase())
		.filter((t) => t !== '')
}

/** Every offence in one file's text, as `line: kind: value`. */
export function findOffences(text: string, terms: string[] = []): string[] {
	const out: string[] = []
	text.split('\n').forEach((line, i) => {
		const at = (kind: string, value: string) => out.push(`${i + 1}: ${kind}: ${value}`)
		for (const m of line.matchAll(IPV4)) {
			const ip = m[0]
			const octets = [m[1], m[2], m[3], m[4]].map(Number)
			if (isPrivateIpv4(octets) && !PLACEHOLDER_IPV4_PREFIXES.some((p) => ip.startsWith(p))) at('private-ip', ip)
		}
		for (const m of line.matchAll(EMAIL)) {
			if (!PLACEHOLDER_EMAIL_DOMAINS.includes(m[1].toLowerCase())) at('email', m[0])
		}
		for (const m of line.matchAll(HOME_PATH)) {
			if (!PLACEHOLDER_HOME_NAMES.includes(m[1].toLowerCase())) at('home-path', m[0])
		}
		const lowered = line.toLowerCase()
		terms.forEach((term, n) => {
			if (lowered.includes(term)) at('private-term', `#${n + 1}`)
		})
	})
	return out
}

function trackedFiles(root: string): string[] {
	return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
		.split('\0')
		.filter((f) => f !== '')
}

function repoRoot(): string {
	return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
}

describe('public hygiene', () => {
	// The detectors are the thing under guard, so prove they fire. Fixtures are
	// assembled at runtime so this file does not trip the scan it defines.
	it('flags a private IP, a stray email and a home path, and passes placeholders', () => {
		const ip = ['10', '9', '8', '7'].join('.')
		const mail = ['someone', 'corp.test'].join('@')
		const home = ['', 'Users', 'jdoe'].join('/')
		assert.deepEqual(findOffences(`host ${ip}`), [`1: private-ip: ${ip}`])
		assert.deepEqual(findOffences(`mail ${mail}`), [`1: email: ${mail}`])
		assert.deepEqual(findOffences(`cd ${home}/src`), [`1: home-path: ${home}`])

		assert.deepEqual(findOffences('host 192.168.1.50 and 8.8.8.8 and 1.2.3.4'), [])
		assert.deepEqual(findOffences('a@example.com b@example.org 1+2@users.noreply.github.com'), [])
		assert.deepEqual(findOffences('/Users/you/x /home/user/y'), [])

		// A term match names the index and never echoes the term.
		assert.deepEqual(findOffences('the Some Ministry service', ['unused', 'some ministry']), ['1: private-term: #2'])
	})

	it('finds no private address, personal email or home path in the tracked tree', () => {
		const root = repoRoot()
		const files = trackedFiles(root)
		const terms = privateTerms(root)
		if (terms.length === 0) console.log('[hygiene] PRIVATE_TERMS not set; checking generic rules only')
		// An empty or truncated walk would pass vacuously.
		assert.ok(files.length > 20, `walked only ${files.length} tracked files — the walk is broken`)

		const offenders: string[] = []
		let scanned = 0
		for (const file of files) {
			if (SKIPPED_FILES.includes(file.split('/').pop() ?? '')) continue
			const buf = readFileSync(join(root, file))
			if (buf.subarray(0, 8192).includes(0)) continue // binary
			scanned++
			for (const o of findOffences(buf.toString('utf8'), terms)) offenders.push(`${file}:${o}`)
		}
		assert.ok(scanned > 20, `scanned only ${scanned} text files`)
		assert.deepEqual(offenders.sort(), [])
	})
})
