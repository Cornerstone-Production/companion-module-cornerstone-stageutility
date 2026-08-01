# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report vulnerabilities privately through GitHub's
[**Private vulnerability reporting**](https://github.com/Cornerstone-Production/companion-module-cornerstone-stageutility/security/advisories/new)
(Security → Advisories → "Report a vulnerability"). We aim to acknowledge reports
within a few days and will coordinate a fix and disclosure timeline with you.

When reporting, please include:

- A description of the issue and its impact.
- Steps to reproduce (a proof of concept if possible).
- Affected version / commit and your environment.

## Scope & notes

This module runs inside [Bitfocus Companion](https://bitfocus.io/companion) and
talks to a Stage Utility server over the local network.

- **It holds no credentials of its own.** The connection is a host and port; any
  authentication belongs to the Stage Utility server.
- **LAN trust model.** The module assumes the Stage Utility server it is pointed
  at is trusted. It is not hardened against a hostile server on the same network.
- **Reportable here:** anything that lets a third party influence Companion
  through this module — command injection through a configuration field, a
  crash triggered by a malformed server response, or credentials being written
  somewhere they should not be.
- **Belongs upstream:** issues in the Stage Utility server itself go to
  [Stage-Utility](https://github.com/Cornerstone-Production/Stage-Utility/security/advisories/new);
  issues in Companion go to Bitfocus.

## Supported versions

The latest release is supported. Fixes are made on `main` and released from there.
