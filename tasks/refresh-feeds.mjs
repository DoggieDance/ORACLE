// Herald feed refresh — no AI, no judgment, just plumbing.
// Fetches r/sealedmtgdeals + r/magicTCG, filters mechanically, and writes the
// DEALS/WIRE arrays to feeds.json. NEWS (Dispatches) is editorial and lives in
// index.html — this script never touches index.html, so it can NEVER collide
// with the app build. Same posts in the same order = no rewrite (no commit).
//
// This replaces the old index.html-splicing refresher. The app reads feeds.json
// at runtime; the baked-in arrays in index.html remain only as a first-paint
// fallback.
import { readFileSync, writeFileSync } from 'node:fs';

// Target file: first CLI arg wins; defaults to feeds.json next to the repo root.
const FILE = process.argv[2] || new URL('../feeds.json', import.meta.url).pathname;
const UA = { 'user-agent': 'oracle-herald/1.0 (github.com/DoggieDance/ORACLE)' };
const DEAD = /sold out|sold-out|expired|dead|ended/i;

// Reddit blocks anonymous requests from datacenter IPs (GitHub runners get
// HTTP 403). Application-only OAuth is the sanctioned lane: with
// REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET set (repo Actions secrets) we fetch a
// client_credentials token and use oauth.reddit.com. With no creds (e.g. a home
// machine) we fall back to anonymous www access.
async function redditToken() {
  const id = process.env.REDDIT_CLIENT_ID, sec = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !sec) return null;
  const r = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'authorization': 'Basic ' + Buffer.from(id + ':' + sec).toString('base64'),
      'user-agent': UA['user-agent'],
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) throw new Error('reddit auth -> HTTP ' + r.status);
  const d = await r.json();
  if (!d.access_token) throw new Error('reddit auth: no token in response');
  return d.access_token;
}

async function grab(path, token) {
  const url = token
    ? 'https://oauth.reddit.com' + path
    : 'https://www.reddit.com' + path.replace(/\?/, '.json?');
  const headers = { ...UA };
  if (token) headers['authorization'] = 'bearer ' + token;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
  const d = await r.json();
  return ((d.data && d.data.children) || []).map(x => x.data).filter(p => p && p.title);
}

function entry(p) {
  return { t: p.title.trim(), u: 'https://www.reddit.com' + p.permalink, s: p.score || 0, c: p.created_utc || 0, f: (p.link_flair_text || '').trim() };
}

// Identity ignores score/age drift so only real content changes cause a write.
function identity(list) { return JSON.stringify(list.map(p => [p.u, p.t, p.f])); }

// Read the current feeds.json (tolerate a missing/garbage file on first run).
let cur = { deals: [], wire: [] };
try { cur = JSON.parse(readFileSync(FILE, 'utf8')); } catch (e) { console.log('no readable feeds.json yet - will create it'); }
if (!Array.isArray(cur.deals)) cur.deals = [];
if (!Array.isArray(cur.wire)) cur.wire = [];

let rawDeals, rawWire;
try {
  let token = null;
  try { token = await redditToken(); } catch (e) { console.log('::warning::reddit oauth failed (' + e.message + ') - trying anonymous'); }
  [rawDeals, rawWire] = await Promise.all([
    grab('/r/sealedmtgdeals/new?limit=25&raw_json=1', token),
    grab('/r/magicTCG/hot?limit=20&raw_json=1', token)
  ]);
} catch (e) {
  // Reddit throttles some cloud IPs. Stale feeds beat a broken pipeline:
  // warn and exit clean; the next run (or a home-IP run) catches up.
  console.log('::warning::reddit unreachable - ' + e.message + ' - keeping current feeds');
  process.exit(0);
}

const deals = rawDeals
  .filter(p => !p.stickied && !DEAD.test((p.link_flair_text || '') + ' ' + p.title))
  .slice(0, 6).map(entry);

const wire = rawWire
  .filter(p => !p.stickied && !p.over_18)
  .filter(p => /official spoiler/i.test(p.link_flair_text || '') || (p.score || 0) >= 300)
  .slice(0, 6).map(entry);

if (deals.length < 3 || wire.length < 3) {
  console.log('thin results (deals=' + deals.length + ', wire=' + wire.length + ') - keeping current feeds');
  process.exit(0);
}

const sameDeals = identity(cur.deals) === identity(deals);
const sameWire = identity(cur.wire) === identity(wire);
if (sameDeals && sameWire) {
  console.log('feeds unchanged - nothing to do');
  process.exit(0);
}

const out = {
  updated: new Date().toISOString(),
  deals: sameDeals ? cur.deals : deals,
  wire:  sameWire  ? cur.wire  : wire
};
writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
console.log('feeds.json updated: deals=' + (!sameDeals) + ' wire=' + (!sameWire));
