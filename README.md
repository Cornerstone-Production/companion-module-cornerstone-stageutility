# Stage Utility for Bitfocus Companion

A [Bitfocus Companion](https://bitfocus.io/companion) module for
[Stage Utility](https://github.com/Cornerstone-Production/Stage-Utility), the
church stage-monitor server.

Drive PCO Services Live, route views onto screens, black out an output, reload
displays, and read mic RF and battery, the PCO countdown, ProPresenter status,
captions, people counts and OBS, REAPER, Resi and YouTube status from a Stream
Deck.

The module connects to Stage Utility over its HTTP and SSE API on the local
network. There is no authentication — the API is LAN-only by design.

[companion/HELP.md](./companion/HELP.md) is the full action, feedback and
variable reference, and is what Companion shows in-app.

## Install

Requires **Companion 4.3.0 or newer** — the module targets the v2 connection API
added in that release, and will not start on anything older.

Download the `.tgz` from the
[latest release](https://github.com/Cornerstone-Production/companion-module-cornerstone-stageutility/releases)
and add it to Companion as a module.

Then add the connection — **Cornerstone → Stage Utility** — and enter the Stage
Utility server's IP and port. Companion takes host and port separately and
cannot resolve a DNS name, so use the address shown in Stage Utility under
Settings → Integrations → Bitfocus Companion.

### Running from source

For development, or to run a modified copy:

```sh
corepack enable
yarn install
yarn build
```

Point Companion at the folder holding this repository under
**Settings → Developer → Developer modules path**, enable developer modules, and
restart Companion. Starting Companion with `--extra-module-path /path/to/modules`
does the same.

## Develop

A standard `@companion-module/base` v2 module on Yarn 4 via corepack.

```sh
yarn build      # compile src to dist
yarn dev        # watch-compile
yarn lint       # eslint, prettier, and the manifest check
yarn package    # validate the manifest and build the distributable .tgz
```

Run a Stage Utility server to test against — `http://localhost:8788` by default
— and point the connection's host and port at it.

The version lives in `package.json`. `companion/manifest.json` is generated from
it, so never edit the version there: `yarn build` writes it through, and
`yarn lint` fails on a mismatch.

## Branches and releases

`main` ← `beta` ← feature branches. Work lands on `beta`; `main` only ever
receives `beta`.

Releases are cut automatically from
[Conventional Commits](https://www.conventionalcommits.org). A push to `beta`
publishes a prerelease `X.Y.Z-beta.N`; a push to `main` publishes the release
`X.Y.Z`. A push carrying only `docs`, `chore`, `ci`, `build`, `test` or
`refactor` commits publishes nothing.

Every release carries the `.tgz` Companion installs, built by Bitfocus's own
`companion-module-build` and verified before publishing.

## Licence

[MIT](./LICENSE) — the convention across Companion modules, and Companion itself.

Stage Utility, the server this module talks to, is
[GPL-3.0-or-later](https://github.com/Cornerstone-Production/Stage-Utility/blob/main/LICENSE).
Installing this module does not change that.
