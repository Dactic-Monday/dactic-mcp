# Client and marketplace formats

| Target | Files / route | Verification before submission |
| --- | --- | --- |
| Official MCP Registry | `server.json` | Schema; DNS ownership; live endpoint; registry read-back |
| Cursor Marketplace | `.cursor-plugin/plugin.json`, `mcp.json`, `assets/logo.svg` | Local plugin load, OAuth, tool discovery |
| Portable Agent Plugins | `plugin.json`, `mcp.json`, `skills/` | Agent Plugins 1.0 schemas and components |
| cursor.directory | Repository and remote installation configuration | Listing form and actual Add-to-Cursor flow |
| Claude plugin marketplace | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.mcp.json` | `claude plugin validate .` and local plugin session |
| Glama | `glama.json`, `Dockerfile`, public source | Maintainer claim, container inspection or hosted connector test profile, actual score |
| Cline Marketplace | README, `llms-install.md`, `assets/logo-400.png` | Installation from documentation and a harmless call |
| LobeHub | `lhm.plugin.json` | Authenticated introspection, owner declaration, publish status |
| xAI Grok Build | Existing plugin bundle; marketplace contribution | Current marketplace format and install check |
| awesome-mcp-servers | Repository URL and contribution | Current contribution checklist and directory inspection |

No listing is approved merely because its files exist. The root portable
`mcp.json` uses `streamable-http`; Claude's `.mcp.json` uses `http`. Keep these
platform-specific spellings. Direct remote installation is preferred over
the stdio launcher where supported.

LobeHub's draft deliberately omits capability arrays until authenticated
introspection has captured the real catalog. Do not fill them with invented
tools. `glama.json` names the current checkout owner's GitHub account;
confirm the designated maintainer has repository write access before claiming.

## References checked 2026-11-03

- https://modelcontextprotocol.io/registry/remote-servers
- https://modelcontextprotocol.io/registry/authentication
- https://cursor.com/docs/reference/plugins
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugin-marketplaces
- https://glama.ai/mcp/methodology
- https://glama.ai/blog/2025-07-08-what-is-glamajson
- https://github.com/cline/mcp-marketplace
- https://lobehub.com/publish-mcp/skill.md
- https://x.ai/news/grok-plugin-marketplace
- https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md
