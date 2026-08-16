// One-command real-machine smoke test for dsh-agent-memory.
// Verifies the full chain in a separate headless DSH process: plugin load,
// domain open, remember, recall, persistence file, then cleans up.
//
// Prereqs: dsh on PATH; headless profile patched with storage trio + dsh-agent-memory
// (see presets/README.md and ~/.dsh/profiles/headless/cordis.patch.yml).
// Usage: node scripts/smoke.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DSH_HOME = process.env.DSH_HOME ?? join(homedir(), '.dsh');
const STORAGE = join(DSH_HOME, 'storages', 'memory.json');
// dsh CLI entry, resolved from the shared profile node_modules so the script
// does not depend on PATH or platform-specific launchers (.ps1/.cmd).
const DSH_BIN = join(DSH_HOME, 'profiles', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
const MARKER = `冒烟验证${Date.now()}`;

function fail(msg) {
  console.error(`[smoke] FAIL: ${msg}`);
  process.exit(1);
}

function run() {
  console.log('[smoke] launching headless session (remember + recall)...');
  const prompt = `用 memory_remember 记住一条记忆:内容='${MARKER} 冒烟测试 通过',kind='fact',scope='user',tags=['smoke']。然后用 memory_recall 查询'冒烟测试' 并原样报告返回的 JSON。`;
  let out;
  try {
    out = execFileSync(process.execPath, [DSH_BIN, '--profile', 'headless', prompt], {
      encoding: 'utf8',
      timeout: 240_000,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const detail = err.stderr ? String(err.stderr).slice(0, 800) : String(err.message).slice(0, 800);
    fail(`headless process failed: ${detail}`);
  }
  return out;
}

function assertPersisted() {
  if (!existsSync(STORAGE)) fail(`persistence file missing: ${STORAGE}`);
  const raw = readFileSync(STORAGE, 'utf8');
  if (!raw.includes(MARKER)) fail('persisted record does not contain the smoke marker');
  const stats = statSync(STORAGE);
  console.log(`[smoke] persistence ok (${stats.size} bytes, marker found)`);
}

// 1. preconditions
if (!existsSync(join(DSH_HOME, 'profiles', 'headless', 'package.json'))) {
  fail('headless profile not initialized — run: dsh --profile headless "hi"');
}
const patched = readFileSync(join(DSH_HOME, 'profiles', 'headless', 'cordis.patch.yml'), 'utf8');
if (!patched.includes("dsh-agent-memory")) fail('headless patch missing dsh-agent-memory row (see presets/README.md)');
if (!existsSync(join(DSH_HOME, 'profiles', 'node_modules', 'dsh-agent-memory')) &&
    !existsSync(join(DSH_HOME, 'profiles', 'headless', 'node_modules', 'dsh-agent-memory'))) {
  fail('dsh-agent-memory not installed into headless profile');
}

// 2. run
const output = run();
if (!output.includes(MARKER)) fail('recall did not surface the remembered content');
if (!/mem_[0-9a-f]{16}/.test(output)) fail('recall result missing a memory id');
console.log('[smoke] remember+recall round trip ok');

// 3. persistence
assertPersisted();

// 4. cleanup
rmSync(STORAGE, { force: true });
console.log('[smoke] PASS — full chain verified and test data cleaned');
