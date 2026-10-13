// A preset's variable references name the connection by its label, never by the
// module id: the id is a fixed identifier that can change across releases while
// a saved connection keeps whatever label the user gave it.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { UpdatePresets } from './presets.js'
import { StateCache } from './state.js'
import type ModuleInstance from './main.js'

function build(label: string): Record<string, any> {
	let defs: Record<string, any> = {}
	const self = {
		label,
		state: new StateCache(),
		setPresetDefinitions: (_sections: unknown, d: Record<string, any>) => (defs = d),
	}
	UpdatePresets(self as unknown as ModuleInstance)
	return defs
}

describe('preset variable references', () => {
	it('prefix every reference with the connection label', () => {
		const defs = build('my_label')
		const prefixes = new Set<string>()
		let references = 0
		for (const def of Object.values(defs)) {
			for (const m of String(def.style?.text ?? '').matchAll(/\$\(([^:)]*):/g)) {
				references++
				prefixes.add(m[1])
			}
		}
		assert.ok(references > 10, `found only ${references} references — the scan is broken`)
		assert.deepEqual([...prefixes], ['my_label'])
	})
})
