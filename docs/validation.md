# Draft validation: 2026-11-03

Verified for this source draft:

- `npm run verify`: five tests passed under local Node 26.10.0 and isolated
  Node 24 with networking disabled and a read-only source mount.
- Official schema snapshots validated registry, portable plugin, portable
  MCP configuration, and Glama metadata. Additional checks covered identity,
  versions, endpoint consistency, skill frontmatter, image dimensions, and
  workflow syntax.
- `claude plugin validate .claude-plugin/plugin.json` and
  `claude plugin validate .` both passed without warnings.
- `npm audit --omit=dev`: zero vulnerabilities reported at verification time.
- `npm pack --dry-run`: six files, limited to launcher source, package
  metadata, README, license, and notice.
- Docker build passed against its pinned Node 24 base image. `--version`
  returned `0.1.0`; image user is `node`. Image excludes tests, `.git`, `.env`,
  and development dependencies.

The fixture exercises initialization, server-sent notifications, tools
pagination, resource/prompt discovery, calls and tool errors, a real HTTP
403 rejection, credential-safe diagnostics, correlation headers, and process
shutdown. It uses synthetic context and a temporary credential-cache path.

Public discovery confirms the hosted MCP URL advertises OAuth authorization
and protected-resource metadata, including dynamic registration. No user
sign-in, token refresh, authenticated tool catalog, customer data access,
production isolation, marketplace scoring, or listing approval was tested.

Node 22 and Node 24 checks are configured in CI. Only Node 24 and local
Node 26 were executed during draft preparation. Node 22 CI remains pending.
Authenticated checks and publication remain release gates in
[the release checklist](release-checklist.md).
