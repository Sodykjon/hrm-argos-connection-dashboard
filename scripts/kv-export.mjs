// One-off move off Upstash (16.10.2026): copies every key of the KV into DATA_DIR as the files
// lib/store.ts reads when LOCAL_STORE=1 («a:b» → a_b.json). Keys already there are overwritten.
//
//   node --env-file=.env.upstash scripts/kv-export.mjs <DATA_DIR>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const dir = process.argv[2];
if (!url || !token || !dir) throw new Error('kerak: UPSTASH_REDIS_REST_URL/TOKEN va DATA_DIR');

async function cmd(...args) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(args) });
  const j = await r.json();
  if (j.error) throw new Error(`${args[0]}: ${j.error}`);
  return j.result;
}

mkdirSync(dir, { recursive: true });
const keys = [];
let cursor = '0';
do {
  const [next, batch] = await cmd('SCAN', cursor, 'COUNT', '1000');
  keys.push(...batch);
  cursor = next;
} while (cursor !== '0');
keys.sort();
let bytes = 0;
for (const k of keys) {
  const type = await cmd('TYPE', k);
  if (type !== 'string') { console.log(`o'tkazib yuborildi (${type}): ${k}`); continue; }
  const raw = await cmd('GET', k);
  // @upstash/redis stores JSON text; keep it as is so the file is what readKey parses.
  let text = raw;
  try { JSON.parse(raw); } catch { text = JSON.stringify(raw); }
  writeFileSync(join(dir, `${k.replace(/:/g, '_')}.json`), text, 'utf8');
  bytes += text.length;
  console.log(`${k}  ${(text.length / 1024).toFixed(0)} KB`);
}
console.log(`${keys.length} kalit, ${(bytes / 1048576).toFixed(1)} MB → ${dir}`);
