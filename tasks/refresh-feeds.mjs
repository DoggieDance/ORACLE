// Herald feed refresh — no AI, no judgment, just plumbing.
// Fetches r/sealedmtgdeals + r/magicTCG, filters mechanically, and splices
// the DEALS and WIRE arrays in index.html. NEWS (Dispatches) is editorial
// and is NOT touched here — see tasks/herald-refresh.md for the curated side.
// Commits happen upstream (workflow/launchd) only when this script reports
// a real change: same posts in the same order = no rewrite, so score drift
// alone never causes a commit.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../index.html', import.meta.url).pathname.includes('tasks')
  ? new URL('../index.html', import.meta.url).pathname
  : 'index.html';
const UA = { 'user-agent': 'oracle-herald/1.0 (github.com/DoggieDance/ORACLE)' };
const DEAD = /sold out|sold-out|expired|dead|ended/i;

// Reddit blocks anonymous requests from datacenter IPs (GitHub runners get
// HTTP 403). Application-only OAuth is the sanctioned lane: with
// REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET set (repo Actions secrets), we
// fetch a client_credentials token and use oauth.reddit.com. With no creds
// (e.g. running on a home machine), we fall back to anonymous www access.
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

function serialize(list, nl) {
  return list.map(p => `    { t: ${JSON.stringify(p.t)}, u: ${JSON.stringify(p.u)}, s: ${p.s}, c: ${p.c}, f: ${JSON.stringify(p.f)} },`).join(nl);
}

function splice(src, name, body, nl) {
  const start = src.indexOf('const ' + name + ' = [');
  if (start < 0) throw new Error(name + ' anchor missing');
  const open = src.indexOf('[', start);
  const close = src.indexOf('];', open);
  if (close < 0) throw new Error(name + ' close missing');
  return src.slice(0, open + 1) + nl + body + nl + src.slice(close);
}

function identity(list) { return JSON.stringify(list.map(p => [p.u, p.t, p.f])); }

function current(src, name) {
  const start = src.indexOf('const ' + name + ' = [');
  const close = src.indexOf('];', start);
  const chunk = src.slice(start, close);
  const out = [];
  const re = /\{ t: (".*?"), u: (".*?"), s: (\d+), c: (\d+), f: (".*?") \}/g;
  let m;
  while ((m = re.exec(chunk))) out.push({ t: JSON.parse(m[1]), u: JSON.parse(m[2]), s: +m[3], c: +m[4], f: JSON.parse(m[5]) });
  return out;
}

const src = readFileSync(FILE, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';

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
  // warn and exit clean; the next run (or a run from a home IP) catches up.
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

const sameDeals = identity(current(src, 'DEALS')) === identity(deals);
const sameWire = identity(current(src, 'WIRE')) === identity(wire);
if (sameDeals && sameWire) {
  console.log('feeds unchanged - nothing to do');
  process.exit(0);
}

let out = src;
if (!sameDeals) out = splice(out, 'DEALS', serialize(deals, nl), nl);
if (!sameWire) out = splice(out, 'WIRE', serialize(wire, nl), nl);

if (!out.trimEnd().endsWith('</html>')) throw new Error('sanity: output does not end with </html>');
writeFileSync(FILE, out);
console.log('feeds updated: deals=' + (!sameDeals) + ' wire=' + (!sameWire));
