# Validation schema snapshots

Downloaded on 2026-11-03 from these canonical sources:

- `registry.schema.json`: https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
- `plugin.schema.json`: https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- `mcp.schema.json`: https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
- `glama.schema.json`: https://glama.ai/mcp/schemas/server.json

Snapshots let offline validation use stable inputs. Update deliberately when
adopting a new schema, retaining its canonical identifier and rerunning checks.
Claude has its own `claude plugin validate` command; Cursor and LobeHub need
their native installation/publishing checks in addition to local consistency
checks. Local consistency checks are not vendor certification.
