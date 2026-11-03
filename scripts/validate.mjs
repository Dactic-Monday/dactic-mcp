import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
for (const [file, name, modern] of [['server.json','registry',false],
  ['plugin.json','plugin',true], ['mcp.json','mcp',true], ['glama.json','glama',false]]) {
  const ajv = addFormats(new (modern ? Ajv2020 : Ajv)({ strict: false, allErrors: true }));
  const validate = ajv.compile(json(`schemas/${name}.schema.json`));
  assert(validate(json(file)), `${file}: ${JSON.stringify(validate.errors)}`);
}
const pkg = json('package.json');
const portable = json('plugin.json');
const endpoint = 'https://mcp.app.dactic.io/mcp';
const repository = 'https://github.com/Dactic-Monday/dactic-v1-mcp-public';
for (const file of ['.cursor-plugin/plugin.json','.claude-plugin/plugin.json','plugin.json']) {
  const p = json(file);
  assert.equal(p.version, pkg.version, `${file} version drift`);
  assert.equal(p.name, portable.name);
  assert.equal(p.repository, repository);
  if (p.mcpServers) assert(existsSync(p.mcpServers));
  if (p.logo) assert(existsSync(p.logo));
}
assert.equal(json('server.json').version, pkg.version);
assert.equal(json('server.json').name, pkg.mcpName);
assert(json('server.json').description.length <= 100);
assert.equal(json('server.json').repository.url, repository);
assert.equal(json('server.json').remotes[0].url, endpoint);
assert.equal(json('mcp.json').mcpServers.dactic.url, endpoint);
assert.equal(json('.mcp.json').mcpServers.dactic.url, endpoint);
assert.equal(json('.mcp.json').mcpServers.dactic.type, 'http');
assert(!json('server.json').packages, 'Do not advertise the unpublished npm artifact');
const lhm = json('lhm.plugin.json');
assert.equal(lhm.version, pkg.version);
assert.equal(lhm.cloudEndpoint, endpoint);
assert.match(lhm.identifier, /^[a-z0-9][a-z0-9_-]*$/);
assert(lhm.name.length > 0);
const marketplace = json('.claude-plugin/marketplace.json');
assert.equal(marketplace.plugins[0].name, portable.name);
assert.equal(marketplace.plugins[0].source, './');
for (const dir of readdirSync('skills')) {
  const content = read(`skills/${dir}/SKILL.md`);
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(content);
  assert(frontmatter, `Missing frontmatter: ${dir}`);
  const skill = parse(frontmatter[1]);
  assert.equal(skill.name, dir);
  assert(skill.description.length > 0);
}
for (const [file, size] of [['assets/logo-512.png',512],['assets/logo-400.png',400]]) {
  const png = readFileSync(file);
  assert.equal(png.toString('hex',0,8), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
assert(read('assets/logo.svg').includes('<svg'));
parse(read('.github/workflows/verify.yml'));
const pack = JSON.parse(execFileSync('npm', ['pack','--dry-run','--json','--ignore-scripts'], { encoding:'utf8' }))[0];
const allowed = /^(src\/[^/]+\.js|README\.md|LICENSE|NOTICE|package\.json)$/;
for (const file of pack.files) assert(allowed.test(file.path), `Unexpected npm file: ${file.path}`);
assert(pack.files.some(file => file.path === 'src/cli.js'));
console.log(`Validated official schema snapshots, platform consistency, assets, skill, workflow, and ${pack.files.length} npm files.`);
