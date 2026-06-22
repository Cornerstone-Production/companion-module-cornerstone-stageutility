# companion-module-cornerstone-stageutility

A [Bitfocus Companion](https://bitfocus.io/companion) module for **Cornerstone Stage Utility** — drive
PCO Services Live, route Views onto screens, reload kiosk displays, and surface mic RF/battery, the
PCO countdown, ProPresenter status and captions on a Stream Deck. It talks to Stage Utility purely
over its HTTP + SSE API on the LAN (no auth).

See [companion/HELP.md](./companion/HELP.md) for the action/feedback/variable reference and
[LICENSE](./LICENSE) (MIT).

## Develop

This is a standard `@companion-module/base` (v2.x) module using Yarn 4 (via corepack).

```sh
corepack enable
yarn install
yarn build      # compile src → dist
yarn dev        # watch-compile
yarn lint       # eslint + prettier
yarn package    # validate manifest + build the distributable .tgz
```

The module connects to a Stage Utility server; run one locally (default `http://localhost:8788`) to
test against. Set the connection's Host/Port in Companion to point at it.

## Install (sideload, private use)

This module is distributed privately for in-house use rather than the public Bitfocus registry.

1. On each machine running Companion, create a developer-modules folder, e.g. `~/companion-modules/`.
2. Clone or copy this repo into it and `yarn install && yarn build` (so `dist/` exists), **or** drop
   in an unpacked `yarn package` artifact.
3. In Companion: **Settings → ⚙ (Developer) → Developer modules path** → select that folder, enable
   developer modules, and restart Companion.
4. Add the connection: **Cornerstone → Stage Utility**.

Alternatively start Companion with `--extra-module-path /path/to/companion-modules` (or set
`COMPANION_DEV_MODULES`).

## Releasing (later, optional public listing)

The module id/manifest already conform to Bitfocus conventions
(`companion-module-cornerstone-stageutility`, id `cornerstone-stageutility`). To publish: make the
repo public, tag a semver release, and submit the tag via the Bitfocus developer portal. Keep the
module `id` stable across versions.
