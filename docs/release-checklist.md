# Release checklist: 0.1.0 draft

This is a source draft. No npm, registry, or marketplace publication is
performed by the repository's scripts or CI.

## Source and ownership

- [ ] Obtain repository write access and push the reviewed draft branch.
- [ ] Establish a default branch and review/merge the source draft.
- [ ] Confirm Dactic's public integration license and branding approval.
- [ ] Confirm the designated GitHub maintainer in `glama.json` has write access.
- [ ] Run `npm ci`, `npm run verify`, and `npm audit --omit=dev`.
- [ ] Review `npm pack --dry-run` and Docker contents for disclosure boundaries.

## Authenticated release verification

- [ ] Test native HTTP OAuth in Cursor and Claude with an isolated account.
- [ ] Test stdio browser OAuth, refresh, expiry, revoked access, and permissions.
- [ ] Test a privately configured bearer credential and Docker against the service.
- [ ] Confirm tool discovery, pagination, harmless reads, and accurate errors.
- [ ] Confirm production tenant isolation using the backend's own test process.
- [ ] Populate LobeHub capabilities from the actual authenticated catalog.
- [ ] Record concrete client versions, results, and sanitized correlation IDs.

## npm and registry

- [ ] Confirm ownership of npm scope `@dactic` and release version availability.
- [ ] Publish the reviewed package using `npm publish --access public` from
      a trusted release workstation; confirm the package can be installed.
- [ ] Remove README's draft npm notice only after installation succeeds.
- [ ] Optionally add the now-published npm package to `server.json.packages`;
      match its exact version and the package's `mcpName`.
- [ ] Verify the DNS TXT proof for `dactic.io` and protect its private signing key
      outside the repository. Authenticate using the official publisher's DNS
      flow for `io.dactic/dactic-mcp`.
- [ ] Run the official `mcp-publisher publish` against reviewed `server.json`.
- [ ] Read back `io.dactic/dactic-mcp` from the official registry and inspect
      the version, repository URL, and remote transport.

Remote-only registry publication is valid independently of npm publication;
the committed manifest intentionally advertises only the hosted endpoint.
Do not add an npm installation option before that artifact is available.

## Directory submissions

- [ ] Cursor Marketplace: local load, logo, OAuth, then submit repository.
- [ ] cursor.directory: test submitted installation configuration.
- [ ] Claude: validate marketplace/plugin, test install, submit through the
      intended directory's current process. A marketplace file alone does not
      publish a listing or create a Claude Desktop `.mcpb` bundle.
- [ ] Glama: configure private test-profile credentials, run actual inspection,
      resolve findings, and record the real score. Grade A is a target.
- [ ] Cline: confirm setup using README/llms-install and submit 400x400 PNG.
- [ ] LobeHub: sign in and connect GitHub through its official CLI, review the
      introspected manifest, publish, and verify enrichment/validation status.
- [ ] xAI Grok Build: verify the current marketplace contribution requirements,
      test the bundle, and submit the proposed listing.
- [ ] awesome-mcp-servers: follow current contribution requirements and checks.

Track each submission URL and its actual status separately from code readiness.
Never mark approval or authenticated verification complete based on fixture tests.
