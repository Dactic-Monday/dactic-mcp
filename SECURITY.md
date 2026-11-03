# Security

Do not disclose vulnerabilities with exploit details or credentials in a
public issue. Use GitHub's private vulnerability reporting for this repository
when enabled, or contact `contact@dactic.io` to arrange a private report.
Include affected version, impact, and a reproduction using synthetic data.
Never include customer records, bearer tokens, OAuth codes, or token caches.

The bridge runs a pinned `mcp-remote` dependency without a shell. Protocol
requests are sent to the hosted Dactic endpoint; a loopback URL override is
available for local fixtures. No arbitrary remote origin override is accepted.
Your MCP host's approvals and the backend's authorization remain applicable.
Tool results are returned to the MCP host and may enter that host's model
context. Review the service and host data policies before connecting.

Bearer credentials stay in the process environment and HTTPS requests.
OAuth uses a local credential cache managed by `mcp-remote`. Protect that
directory, avoid shared accounts, and revoke access using the supported
account controls. No debug log passthrough is exposed by this launcher.

Only the current published version will receive fixes after release.
Marketplace inspectors must use an isolated, least-privilege test account
provided through their private test-profile flow. Inspection must not be
implemented by disabling authentication or returning fake production tools.
