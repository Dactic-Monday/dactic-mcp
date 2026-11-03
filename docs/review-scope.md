# Review scope

This repository distributes the client integration and complete stdio
launcher source. The transport/OAuth implementation is the exact
`mcp-remote` version pinned in package.json and package-lock.json. The source
for that dependency is linked in NOTICE. The hosted backend remains private.

The integration has the same behavior for reviewers and users. Test fixtures
are isolated to `test/`, run only on loopback, and never ship in the npm
package or Docker build context. There is no reviewer detection, fake tool
catalog, alternate review behavior, or authentication bypass.

## What reviewers can verify

- Native remote connection configuration and the hosted OAuth discovery.
- Local npm installation, child process invocation without a shell,
  credential handling, lifecycle diagnostics, and shutdown.
- Real MCP initialization, discovery, pagination, calls, and failures through
  the pinned transport using the offline fixture suite.
- Docker build and execution as a non-root user.
- Public package contents, licenses, and each platform's manifests.

Authenticated service tests require a dedicated account with synthetic
context and normal authorization. These tests must be performed separately;
the offline suite does not demonstrate tenant isolation or backend behavior.
Do not place reviewer credentials in this repository, an issue, or a listing.

The service's public schemas, annotations, and instructions may be indexed
by marketplaces. Keep those accurate and free of customer data. Proprietary
retrieval, ranking, orchestration, prompts, databases, and infrastructure are
not included. The MIT license does not license the hosted backend.
