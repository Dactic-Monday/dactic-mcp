import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

export const ENDPOINT = 'https://mcp.app.dactic.io/mcp';
const require = createRequire(import.meta.url);

export class ConfigurationError extends Error {
  constructor(code, message) { super(message); this.name = 'ConfigurationError'; this.code = code; }
}

export function requestIdFor(env = process.env) {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(env.DACTIC_REQUEST_ID || '')
    ? env.DACTIC_REQUEST_ID : randomUUID();
}

export function configuration(env = process.env) {
  let endpoint;
  try { endpoint = new URL(env.DACTIC_MCP_URL || ENDPOINT); }
  catch { throw new ConfigurationError('invalid_endpoint', 'DACTIC_MCP_URL must be a valid Dactic or loopback HTTP(S) URL.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      (!local && endpoint.href !== ENDPOINT) ||
      (local && !['http:', 'https:'].includes(endpoint.protocol))) {
    throw new ConfigurationError('invalid_endpoint', 'DACTIC_MCP_URL must be the Dactic endpoint or a loopback HTTP(S) test server without credentials, query, or fragment.');
  }
  if (env.DACTIC_MCP_TOKEN !== undefined &&
      (!env.DACTIC_MCP_TOKEN.trim() || /\s/.test(env.DACTIC_MCP_TOKEN))) {
    throw new ConfigurationError('invalid_credential', 'DACTIC_MCP_TOKEN must be a nonempty bearer credential without whitespace.');
  }
  const requestId = requestIdFor(env);
  const args = [endpoint.href, '--transport', 'http-only', '--auth-timeout', '120',
    '--connect-timeout', '15', '--headers-timeout', '60', '--body-timeout', '300',
    '--header', `X-Request-ID:${requestId}`];
  if (env.DACTIC_MCP_TOKEN) args.push('--header', 'Authorization:Bearer ${DACTIC_MCP_TOKEN}');
  else args.push('--static-oauth-client-metadata', JSON.stringify({
    scope: 'openid offline_access mcp/mcp:tools', token_endpoint_auth_method: 'none',
  }));
  return { endpoint: endpoint.href, requestId, args };
}

export function classify(text) {
  if (/\b401\b|unauthorized|invalid.token/i.test(text)) return 'authentication_failed';
  if (/\b403\b|forbidden/i.test(text)) return 'permission_denied';
  if (/\b429\b|rate.limit/i.test(text)) return 'rate_limited';
  if (/timeout|timed.out|ETIMEDOUT/i.test(text)) return 'timeout';
  if (/ECONNREFUSED|ENOTFOUND|fetch failed|ECONNRESET/i.test(text)) return 'network_error';
  if (/\b50[0-9]\b/.test(text)) return 'upstream_unavailable';
  return 'transport_error';
}

// Preserve stack function names, never response bodies, credentials, or auth URLs.
export function safeFrame(line) {
  if (!/^\s+at\s/.test(line)) return undefined;
  const name = /^\s+at\s+(?:async\s+)?([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\s+\(/.exec(line);
  return name ? `at ${name[1]} (location redacted)` : 'at (location redacted)';
}

export function launch({ env = process.env, stderr = process.stderr } = {}) {
  const config = configuration(env);
  const started = Date.now();
  const emit = (event, fields = {}) => stderr.write(JSON.stringify({
    event, request_id: config.requestId, ...fields,
  }) + '\n');
  const remotePackage = require.resolve('mcp-remote/package.json');
  const manifest = JSON.parse(readFileSync(remotePackage, 'utf8'));
  const executable = resolve(dirname(remotePackage), manifest.bin['mcp-remote']);
  emit('bridge.start', { endpoint: config.endpoint, transport: 'streamable-http' });
  const child = spawn(process.execPath, [executable, ...config.args], {
    env, stdio: ['inherit', 'inherit', 'pipe'], shell: false,
  });
  let cause = 'transport_error';
  let stopping;
  let killTimer;
  const lines = createInterface({ input: child.stderr });
  lines.on('line', line => {
    if (safeFrame(line)) {
      emit('bridge.dependency.trace', { frame: safeFrame(line) });
    } else if (/Local STDIO server running/.test(line)) {
      emit('bridge.connected', { duration_ms: Date.now() - started });
    } else if (/Please authorize|Could not open a browser/i.test(line)) {
      emit('bridge.authorization_required', { message: 'Complete sign-in in your browser. If it cannot open, use a host with native remote OAuth support.' });
    } else if (/error|failed|refused|timed.out|ETIMEDOUT|code:\s*[45][0-9]{2}/i.test(line)) {
      // Only classify dependency diagnostics. Arbitrary provider text is not logged.
      cause = classify(line);
      emit('bridge.dependency.fail', { code: cause });
    }
  });
  const stop = signal => {
    if (stopping) return;
    stopping = signal;
    emit('bridge.stop', { signal });
    child.kill(signal);
    killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
    killTimer.unref();
  };
  const onInt = () => stop('SIGINT');
  const onTerm = () => stop('SIGTERM');
  process.once('SIGINT', onInt);
  process.once('SIGTERM', onTerm);
  child.once('error', error => {
    cause = classify(error.code || '');
    emit('bridge.spawn.fail', { code: cause, exception: error.name,
      frames: (error.stack || '').split('\n').slice(1).map(safeFrame).filter(Boolean) });
  });
  return new Promise(resolveExit => child.once('close', (code, signal) => {
    clearTimeout(killTimer);
    process.removeListener('SIGINT', onInt);
    process.removeListener('SIGTERM', onTerm);
    lines.close();
    const exitCode = stopping === 'SIGINT' ? 130 : stopping === 'SIGTERM' ? 143 : code ?? 1;
    emit(exitCode === 0 || stopping ? 'bridge.done' : 'bridge.fail', {
      exit_code: exitCode, signal, duration_ms: Date.now() - started,
      ...(exitCode !== 0 && !stopping ? { code: cause,
        message: 'MCP connection failed. Check authentication, access, and endpoint availability; use request_id for support.' } : {}),
    });
    resolveExit(exitCode);
  }));
}
