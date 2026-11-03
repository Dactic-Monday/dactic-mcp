#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { launch, ConfigurationError, requestIdFor, safeFrame } from './bridge.js';

const args = process.argv.slice(2);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (args.length === 1 && args[0] === '--version') {
  console.log(pkg.version);
} else if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log(`Dactic MCP stdio bridge ${pkg.version}
Usage: dactic-mcp [--help | --version]
Connects to https://mcp.app.dactic.io/mcp using OAuth in your browser.
DACTIC_MCP_TOKEN: optional bearer credential supplied by the user (headless mode).
DACTIC_REQUEST_ID: optional correlation reference.
DACTIC_MCP_URL: production endpoint or loopback fixture for local verification.
MCP_REMOTE_CONFIG_DIR: local OAuth cache directory (contains credentials).
Protocol messages use stdout; safe lifecycle diagnostics use stderr.`);
} else if (args.length) {
  console.error('Unsupported arguments. Run dactic-mcp --help.');
  process.exitCode = 2;
} else {
  try {
    process.exitCode = await launch();
  } catch (error) {
    console.error(JSON.stringify({ event: 'bridge.configuration.fail',
      request_id: requestIdFor(), code: error instanceof ConfigurationError ? error.code : 'initialization_failed',
      message: error instanceof ConfigurationError ? error.message : 'Check installed dependencies. Run dactic-mcp --help.',
      exception: error.name, frames: (error.stack || '').split('\n').slice(1).map(safeFrame).filter(Boolean) }));
    process.exitCode = 2;
  }
}
