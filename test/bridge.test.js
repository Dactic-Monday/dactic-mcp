import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuration, classify, safeFrame, ENDPOINT } from '../src/bridge.js';

test('configuration fixes the remote destination and keeps bearer credentials out of argv', () => {
  const c = configuration({ DACTIC_MCP_TOKEN: 'synthetic-secret', DACTIC_REQUEST_ID: 'fixture-123' });
  assert.equal(c.endpoint, ENDPOINT);
  assert.equal(c.requestId, 'fixture-123');
  assert(!c.args.join(' ').includes('synthetic-secret'));
  assert(c.args.includes('Authorization:Bearer ${DACTIC_MCP_TOKEN}'));
  for (const url of ['https://other.example/mcp', ENDPOINT + '?token=x',
    'https://user:pass@mcp.app.dactic.io/mcp', 'file:///tmp/mcp', 'http://127.0.0.1.example/mcp']) {
    assert.throws(() => configuration({ DACTIC_MCP_URL: url }));
  }
  assert.throws(() => configuration({ DACTIC_MCP_TOKEN: 'a\r\nInjected:value' }));
  assert.throws(() => configuration({ DACTIC_MCP_TOKEN: '' }));
  assert.match(configuration({ DACTIC_REQUEST_ID: 'bad\nreference' }).requestId, /^[a-f0-9-]{36}$/);
});

test('OAuth defaults request base access and diagnostics classify causes without retaining bodies', () => {
  const c = configuration({});
  const metadata = JSON.parse(c.args[c.args.indexOf('--static-oauth-client-metadata') + 1]);
  assert.equal(metadata.scope, 'openid offline_access mcp/mcp:tools');
  assert(!metadata.scope.includes('usage:org'));
  assert.equal(classify('HTTP 401 unauthorized'), 'authentication_failed');
  assert.equal(classify('HTTP 403 forbidden'), 'permission_denied');
  assert.equal(classify('HTTP 429'), 'rate_limited');
  assert.equal(classify('ETIMEDOUT'), 'timeout');
  assert.equal(classify('ECONNREFUSED'), 'network_error');
  assert.equal(classify('HTTP 503'), 'upstream_unavailable');
  assert.equal(safeFrame('Authorization: secret'), undefined);
  assert.equal(safeFrame('    at connect (https://host/path?token=secret)'), 'at connect (location redacted)');
});

async function fixture(t, { forbidden = false } = {}) {
  const requests = [];
  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/mcp') { res.writeHead(405).end(); return; }
    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404).end();
      return;
    }
    let input = '';
    for await (const chunk of req) input += chunk;
    const message = JSON.parse(input);
    requests.push({ message, headers: req.headers });
    if (forbidden) {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'forbidden', private_diagnostic: 'DO_NOT_LOG_UPSTREAM_BODY' }));
      return;
    }
    if (message.id === undefined) { res.writeHead(202).end(); return; }
    let result;
    switch (message.method) {
      case 'initialize': result = { protocolVersion: message.params.protocolVersion,
        capabilities: { tools: { listChanged: true }, resources: {}, prompts: {} },
        serverInfo: { name: 'synthetic-fixture', version: '1.0.0' } }; break;
      case 'tools/list': result = message.params?.cursor ? { tools: [] } : {
        tools: [{ name: 'fixture_echo', description: 'Echo synthetic input.',
          inputSchema: { type: 'object', properties: { text: { type: 'string' } } } }], nextCursor: 'page-2' }; break;
      case 'resources/list': result = { resources: [] }; break;
      case 'prompts/list': result = { prompts: [] }; break;
      case 'tools/call': result = { content: [{ type: 'text', text: message.params.arguments.text }],
        ...(message.params.arguments.text === 'fixture-failure' ? { isError: true } : {}) }; break;
      default:
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } }));
        return;
    }
    if (message.method === 'tools/list' && !message.params?.cursor) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' })}\n\n`);
      res.end(`data: ${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n\n`);
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const cache = await mkdtemp(join(tmpdir(), 'dactic-fixture-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  const child = spawn(process.execPath, ['src/cli.js'], { cwd: new URL('..', import.meta.url),
    env: { ...process.env, DACTIC_MCP_URL: `http://127.0.0.1:${server.address().port}/mcp`,
      DACTIC_MCP_TOKEN: 'synthetic-secret', DACTIC_REQUEST_ID: 'fixture-123', MCP_REMOTE_CONFIG_DIR: cache },
    stdio: ['pipe', 'pipe', 'pipe'] });
  const ended = once(child, 'close');
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await ended;
  });
  let diagnostics = '';
  child.stderr.on('data', chunk => { diagnostics += chunk; });
  const pending = new Map();
  const notifications = [];
  let seq = 0;
  createInterface({ input: child.stdout }).on('line', line => {
    const message = JSON.parse(line); // Any diagnostic on stdout fails the fixture.
    if (message.id === undefined) notifications.push(message);
    else { pending.get(message.id)?.resolve(message); pending.delete(message.id); }
  });
  child.once('close', () => {
    for (const entry of pending.values()) entry.reject(new Error('Bridge exited before replying'));
    pending.clear();
  });
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Fixture timed out: ${method}; ${diagnostics}`)); }, 15000);
    pending.set(id, { resolve: message => { clearTimeout(timer); resolve(message); },
      reject: error => { clearTimeout(timer); reject(error); } });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }) + '\n');
  });
  return { child, ended, requests, request, notifications, diagnostics: () => diagnostics };
}

test('real stdio bridge forwards initialization, SSE notifications, discovery pagination, and calls', async t => {
  const f = await fixture(t);
  const init = await f.request('initialize', { protocolVersion: '2025-03-26', capabilities: {},
    clientInfo: { name: 'fixture-client', version: '1.0.0' } });
  assert.equal(init.result.serverInfo.name, 'synthetic-fixture');
  f.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const catalog = await f.request('tools/list');
  assert.equal(catalog.result.tools[0].name, 'fixture_echo');
  assert.equal(catalog.result.nextCursor, 'page-2');
  assert.deepEqual((await f.request('tools/list', { cursor: 'page-2' })).result.tools, []);
  assert(f.notifications.some(n => n.method === 'notifications/tools/list_changed'));
  assert.deepEqual((await f.request('resources/list')).result.resources, []);
  assert.deepEqual((await f.request('prompts/list')).result.prompts, []);
  assert.equal((await f.request('tools/call', { name: 'fixture_echo', arguments: { text: 'synthetic-value' } })).result.content[0].text, 'synthetic-value');
  assert.equal((await f.request('tools/call', { name: 'fixture_echo', arguments: { text: 'fixture-failure' } })).result.isError, true);
  for (const r of f.requests) {
    assert.equal(r.headers['x-request-id'], 'fixture-123');
    assert.equal(r.headers.authorization, 'Bearer synthetic-secret');
  }
  f.child.kill('SIGTERM');
  const [exit] = await f.ended;
  assert.equal(exit, 143);
  const diagnostics = f.diagnostics();
  assert(!diagnostics.includes('synthetic-secret'));
  assert(!diagnostics.includes('synthetic-value'));
  assert(diagnostics.includes('bridge.connected'));
  assert(diagnostics.includes('bridge.done'));
  assert(!diagnostics.includes('bridge.dependency.fail'), 'Normal timeout configuration must not report failures');
  for (const line of diagnostics.trim().split('\n')) assert.equal(JSON.parse(line).request_id, 'fixture-123');
});

test('configuration failures exit without starting a transport or echoing credential values', async () => {
  const child = spawn(process.execPath, ['src/cli.js'], {
    env: { ...process.env, DACTIC_MCP_TOKEN: 'secret\nvalue' }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stderr = ''; let stdout = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.stdout.on('data', chunk => { stdout += chunk; });
  assert.equal((await once(child, 'close'))[0], 2);
  assert.equal(stdout, '');
  assert(!stderr.includes('secret'));
  assert.equal(JSON.parse(stderr).code, 'invalid_credential');
});

test('upstream permission failures do not leak response bodies or bearer credentials', async t => {
  const f = await fixture(t, { forbidden: true });
  await assert.rejects(f.request('initialize', { protocolVersion: '2025-03-26', capabilities: {},
    clientInfo: { name: 'fixture-client', version: '1.0.0' } }), /Bridge exited before replying/);
  assert.equal((await f.ended)[0], 1);
  assert(!f.diagnostics().includes('DO_NOT_LOG_UPSTREAM_BODY'));
  assert(!f.diagnostics().includes('synthetic-secret'));
  assert(f.diagnostics().includes('permission_denied'));
});
