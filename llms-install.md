# Install Dactic MCP

Use the hosted Streamable HTTP endpoint `https://mcp.app.dactic.io/mcp` when
the user's host supports remote OAuth MCP. Merge a `dactic` entry into the
host's existing `mcpServers` configuration; do not replace other entries.
Cursor uses `{ "url": "https://mcp.app.dactic.io/mcp" }`; Claude Code uses
`{ "type": "http", "url": "https://mcp.app.dactic.io/mcp" }`.

Let the user complete sign-in and consent in the browser. Never ask for their
password, extract tokens from another application, or print OAuth caches.

For a stdio-only host, use Node.js >=22.12, run `npm ci` in a checkout,
and configure `node /absolute/path/to/checkout/src/cli.js` as the command.
The bridge uses browser OAuth on a desktop. Headless execution needs a
user-provided bearer credential in `DACTIC_MCP_TOKEN` through private secret
configuration. Do not embed the value in arguments or repository files.

The npm package is a draft until publication is confirmed. Do not attempt to
install an unavailable `@dactic/mcp-server` release; use the checkout instead.

Verify initialization and tool discovery. With the user's authorization, try
a harmless read against their own test context. A successful fixture test
does not establish production authentication. Never invoke a mutating tool
just to test the connection. Report auth, permission, and network failures
accurately, using the bridge's `request_id` for support.
