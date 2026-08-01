// sync-manifest.mjs — the manifest's version is derived, never typed.
//
// Companion reads companion/manifest.json; npm, the release tooling and every
// human read package.json. Both were maintained by hand and drifted: this module
// shipped a manifest saying 1.0.0 while package.json said 1.2.0, so Companion
// reported the wrong version to users across two releases.
//
// package.json is the single source of truth. `yarn build` runs this, so a built
// module cannot carry a stale version. CI runs `--check`, which changes nothing
// and fails if the committed manifest disagrees.
//
//   node scripts/sync-manifest.mjs           write the version through
//   node scripts/sync-manifest.mjs --check   verify only, for CI

import { readFileSync, writeFileSync } from 'node:fs'

const check = process.argv.includes('--check')
const pkgUrl = new URL('../package.json', import.meta.url)
const manifestUrl = new URL('../companion/manifest.json', import.meta.url)

const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8'))
const raw = readFileSync(manifestUrl, 'utf8')
const manifest = JSON.parse(raw)

const problems = []

// Fields that are NOT generated — a human owns them, so they are validated
// rather than overwritten. An empty one is rejected by the module registry, and
// a missing entrypoint is a module that installs and then does nothing.
if (!manifest.runtime?.entrypoint) problems.push('runtime.entrypoint is missing')
for (const field of ['id', 'name', 'shortname', 'manufacturer', 'products']) {
	const v = manifest[field]
	if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
		problems.push(`${field} is empty`)
	}
}
if (problems.length) {
	throw new Error(`manifest is invalid:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
}

if (manifest.version === pkg.version) {
	console.log(`manifest in sync — v${pkg.version}`)
} else if (check) {
	throw new Error(
		`manifest is stale: it says ${manifest.version}, package.json says ${pkg.version}.\n` +
			'  Run `yarn sync-manifest` and commit the result — package.json is the source of truth.',
	)
} else {
	const next = raw.replace(/("version"\s*:\s*)"[^"]*"/, (_m, prefix) => `${prefix}${JSON.stringify(pkg.version)}`)
	if (next === raw) throw new Error('could not find a version field to update in the manifest')
	writeFileSync(manifestUrl, next)
	console.log(`manifest version ${manifest.version} -> ${pkg.version}`)
}
