import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

export default generateEslintConfig({
	enableTypescript: true,
	// The compiled output `yarn test` runs against — never lint it, the same
	// way `dist` (the published build) is already excluded.
	ignores: ['**/dist-test/*'],
}).then((config) => [
	...config,
	{
		// node:test's describe/it return a Promise, and this repo's test files
		// never await one — the run is asynchronous by nature and the runner
		// itself awaits registration, not the caller. no-floating-promises does
		// not know the test runner's own contract, so it would otherwise demand
		// every describe/it be wrapped in `void`.
		files: ['src/**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-floating-promises': 'off',
		},
	},
])
