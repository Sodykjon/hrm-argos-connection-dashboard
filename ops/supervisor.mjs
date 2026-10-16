// Keeps the dashboard up on the HRISD PC (http://192.168.17.111:3010), since Upstash's free plan
// ran out on 16.10.2026: `next start` on the LAN, restarted if it dies. Started at Windows sign-in
// by the «HRM ARGOS dashboard» scheduled task (ops/install-autostart.ps1); logs go to logs/.
//
// Settings come from ops/server.env (git-ignored): ADMIN_PASSWORD, SITE_PASSWORD, BOT_API_TOKEN,
// DATA_DIR. Uploads are kept as files in DATA_DIR (LOCAL_STORE=1, lib/store.ts) — no KV — and a
// copy of DATA_DIR is taken once a day into DATA_DIR/../hrm-argos-dashboard-backup/<date>.
//
// Run: node ops/supervisor.mjs
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const LOGS = join(ROOT, 'logs');
const PORT = 3010;
mkdirSync(LOGS, { recursive: true });

const fileEnv = Object.fromEntries(readFileSync(join(ROOT, 'ops', 'server.env'), 'utf8').split(/\r?\n/)
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const DATA_DIR = resolve(fileEnv.DATA_DIR || join(ROOT, '.data'));
const BACKUPS = join(dirname(DATA_DIR), 'hrm-argos-dashboard-backup');
mkdirSync(DATA_DIR, { recursive: true });

const stamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' });
const main = createWriteStream(join(LOGS, 'supervisor.log'), { flags: 'a' });
const say = (msg) => { const line = `${stamp()} ${msg}\n`; main.write(line); process.stdout.write(line); };

function waitPort(port, ms) {
  const until = Date.now() + ms;
  return new Promise((ok, fail) => {
    const tryOnce = () => {
      const s = createConnection({ host: '127.0.0.1', port }, () => { s.destroy(); ok(); });
      s.on('error', () => {
        s.destroy();
        if (Date.now() > until) fail(new Error(`port ${port} ochilmadi`));
        else setTimeout(tryOnce, 1000);
      });
    };
    tryOnce();
  });
}

// ---- take the port over: a stopped task leaves its `next start` child running -----------------
function listener(port) {
  const out = execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'latin1' });
  for (const line of out.split(/\r?\n/)) {
    const m = line.trim().split(/\s+/);
    if (m.length >= 5 && m[1].endsWith(`:${port}`) && /LISTEN/i.test(m[3])) return Number(m[4]);
  }
  return null;
}
function processName(pid) {
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Process -Id ${pid}).ProcessName`],
      { encoding: 'utf8', windowsHide: true }).trim();
  } catch { return ''; }
}
const PID_FILE = join(LOGS, 'supervisor.pid');
function takeover() {
  if (existsSync(PID_FILE)) {
    const old = Number(readFileSync(PID_FILE, 'utf8'));
    if (old && old !== process.pid && /node/i.test(processName(old))) {
      try { execFileSync('taskkill', ['/PID', String(old), '/F'], { stdio: 'ignore' }); } catch { /* gone */ }
      say(`oldingi supervisor toʻxtatildi (pid ${old})`);
    }
  }
  writeFileSync(PID_FILE, String(process.pid));
  const pid = listener(PORT);
  if (pid && /node/i.test(processName(pid))) {
    try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* gone */ }
    say(`eski nusxa toʻxtatildi (pid ${pid})`);
  } else if (pid) say(`${PORT} ni boshqa dastur egallagan (pid ${pid}) — tegmayman`);
}

// ---- daily copy of the data, 30 kept ------------------------------------------------------------
function backup() {
  const day = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
  const dest = join(BACKUPS, day);
  if (existsSync(dest)) return;
  try {
    mkdirSync(BACKUPS, { recursive: true });
    cpSync(DATA_DIR, dest, { recursive: true, filter: (p) => !p.endsWith('.tmp') });
    const days = readdirSync(BACKUPS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    for (const d of days.slice(0, -30)) rmSync(join(BACKUPS, d), { recursive: true, force: true });
    say(`zaxira: ${dest}`);
  } catch (e) { say(`zaxira xatosi: ${e.message}`); }
}

// ---- the server ---------------------------------------------------------------------------------
const NEXT = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
let stopping = false;
let child = null;
async function run(attempt = 0) {
  if (stopping) return;
  const log = createWriteStream(join(LOGS, 'web.log'), { flags: 'a' });
  log.write(`\n${stamp()} ---- ishga tushdi ----\n`);
  child = spawn(process.execPath, [NEXT, 'start', '-p', String(PORT), '-H', '0.0.0.0'], {
    cwd: ROOT,
    env: { ...process.env, ...fileEnv, DATA_DIR, LOCAL_STORE: '1', NODE_ENV: 'production' },
    windowsHide: true,
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  say(`[web] pid ${child.pid}`);
  const started = Date.now();
  child.on('exit', (code) => {
    child = null;
    if (stopping) return;
    const next = Date.now() - started > 60_000 ? 0 : attempt + 1;
    const delay = Math.min(60_000, 2000 * 2 ** Math.min(next, 5));
    say(`[web] toʻxtadi (kod ${code}) — ${Math.round(delay / 1000)} s dan keyin qayta`);
    setTimeout(() => run(next), delay);
  });
  await waitPort(PORT, 90_000).then(() => say(`[web] tayyor :${PORT}`), (e) => say(`[web] ${e.message}`));
}

function stop() {
  stopping = true;
  say('toʻxtatilmoqda');
  child?.kill();
  setTimeout(() => process.exit(0), 3000);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

if (!existsSync(join(ROOT, '.next', 'BUILD_ID'))) { say('.next yoʻq — avval: npm run build'); process.exit(1); }
say(`supervisor ishga tushdi (pid ${process.pid}), maʼlumot: ${DATA_DIR}`);
takeover();
await new Promise((r) => setTimeout(r, 1500));
backup();
setInterval(backup, 3600_000);
await run();
