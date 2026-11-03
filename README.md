# Dactic MCP

Connect MCP clients to your Dactic work context through the hosted service at
**https://mcp.app.dactic.io/mcp**. A Dactic account and access to the requested
capabilities are required. Available tools depend on your account and permissions.

This repository contains the public client manifests, installation guidance,
and complete source for the stdio launcher. The launcher uses the pinned
`mcp-remote` transport and OAuth implementation. Backend processing remains
on the hosted Dactic service. Reviewers and users use the same integration.

**Draft release:** the npm installation example is reserved for after
`@dactic/mcp-server@0.1.0` is published. Use a local checkout today. Marketplace
approval and authenticated production verification are tracked in
[the release checklist](docs/release-checklist.md).

## Connect directly (recommended)

Add a Streamable HTTP MCP server with URL `https://mcp.app.dactic.io/mcp`
in your client's MCP settings, then complete the client's OAuth sign-in and
consent flow. No API key is embedded in this repository.

For Cursor, merge the following entry into your existing MCP configuration:

```json
{"mcpServers":{"dactic":{"url":"https://mcp.app.dactic.io/mcp"}}}
```

For Claude Code, use the bundled `.mcp.json` or run:

```sh
claude mcp add --transport http dactic https://mcp.app.dactic.io/mcp
```

The repository also includes Cursor, Claude, and portable plugin manifests.
For a local Claude plugin check, run `claude plugin validate .`; for a local
session, run `claude --plugin-dir /absolute/path/to/dactic-v1-mcp-public`.
See [client installation](docs/clients.md) for the marketplace formats.

## Connect through stdio

Install Node.js 22.12 or later. From a checkout:

```sh
npm ci
npm run verify
node src/cli.js --help
```

Merge [examples/stdio.local.json](examples/stdio.local.json) into the host's
configuration and replace its absolute path with your checkout path. Launch
from the MCP host so stdin/stdout stay connected. The bridge opens your browser
when OAuth consent is needed. Do not enter account credentials in client JSON.

After the npm release, [examples/stdio.npm.json](examples/stdio.npm.json) runs
the same bridge using `npx -y @dactic/mcp-server@0.1.0`.

### Headless environments and Docker

When your account supports a Dactic bearer credential, supply it through the
`DACTIC_MCP_TOKEN` environment variable. Configure the value in your host's
secret settings or a private environment; never commit it. The bridge passes
a literal environment placeholder to its child process, never the credential
in process arguments. OAuth and bearer credentials retain the backend's
normal permission checks.

```sh
docker build -t dactic-mcp:local .
docker run --rm -i -e DACTIC_MCP_TOKEN dactic-mcp:local
```

This uses an already-set host environment variable. Do not use `-t`: stdout
must remain a clean MCP stream. Headless Docker requires a bearer credential;
an interactive browser OAuth callback is not configured by this container.

## Configuration and diagnostics

| Variable | Behavior |
| --- | --- |
| `DACTIC_MCP_TOKEN` | Optional bearer credential; omitted means browser OAuth |
| `DACTIC_REQUEST_ID` | Optional safe correlation ID; otherwise a UUID is created |
| `MCP_REMOTE_CONFIG_DIR` | Optional OAuth cache directory; contains credentials |
| `DACTIC_MCP_URL` | Production URL or a loopback fixture for local verification |

OAuth requests the base scopes `openid offline_access mcp/mcp:tools`.
Additional capabilities depend on server authorization and client consent;
this launcher does not request organization-wide usage scopes by default.
OAuth storage and refresh are handled by `mcp-remote`, normally under
`~/.mcp-auth`. Protect that cache like a password and do not share it.

The bridge writes only protocol messages to stdout. JSON lifecycle diagnostics
go to stderr with a `request_id`, which is also sent as `X-Request-ID` to the
service. Logs classify connection failures and retain safe stack function
frames; upstream response bodies, authorization URLs, and credentials are
discarded. Search diagnostics by `request_id` and events `bridge.fail` or
`bridge.dependency.fail`. Connection establishment is bounded by a 15-second
connect timeout, 60-second headers timeout, 300-second body idle timeout,
and 120-second browser authorization callback timeout.

For authentication failures, reconnect using your host's sign-in flow. For
permission failures, check account access; repeated authentication will not
grant new permissions. For network errors, check endpoint availability and
your network. Share only a correlation reference with support.

## Public source boundary

Public code implements transport and integration configuration. It contains no
retrieval engine, internal prompts, database access, production infrastructure,
or customer fixtures. Tool descriptions and schemas returned by the service
are visible to MCP clients and may be captured by directory inspection.
See [review scope](docs/review-scope.md), [security](SECURITY.md), and
[the Dactic privacy policy](https://dactic.io/privacy).

## Development

`npm run verify` checks official schema snapshots, manifest consistency,
assets, packaging boundaries, and offline protocol integration tests against
a synthetic loopback MCP server. Tests do not contact Dactic or read user
credentials. CI runs the same checks and builds the non-root Docker image.
No registry or marketplace publication runs in CI.

Source is licensed under MIT. Branding and the hosted service are outside
that license; see [NOTICE](NOTICE).
