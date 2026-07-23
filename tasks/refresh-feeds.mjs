// Herald feed refresh via Reddit RSS - no API key, no OAuth, no ticket.
// Reddit blocks anonymous JSON (403) but serves public RSS to a browser UA from
// a residential IP. RSS is rate-limited, so we fetch the two feeds SEQUENTIALLY
// with a gap, retry on 429 (honoring Retry-After), and - importantly - treat the
// two feeds INDEPENDENTLY: if one is throttled, we still update the other and
// keep the throttled one's current data. Only when BOTH fail do we no-op.
// Writes feeds.json only - never index.html - so a refresh can't collide with
// the app build.
//
// RSS carries no score, so entries get s:0; the app hides the score chip when
// s<=0. All logic runs in main() and exits via return (never process.exit()).
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const DEAD = /sold out|sold-out|expired|dead|ended/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function decode(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;|&#0?39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function parseAtom(xml) {
  const out = [];
  const entries = xml.split('<entry>').slice(1);
  for (const raw of entries) {
    const e = raw.split('</entry>')[0];
    const title = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const href  = (e.match(/<link[^>]*href="([^"]+)"/) || [])[1];
    const pub   = (e.match(/<published>([\s\S]*?)<\/published>/) || [])[1]
              || (e.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1];
    const flair = (e.match(/<category[^>]*\bterm="([^"]*)"/) || [])[1] || '';
    if (!title || !href) continue;
    const c = pub ? Math.floor(Date.parse(pub) / 1000) : 0;
    out.push({ t: decode(title).trim(), u: href, s: 0, c: c || 0, f: decode(flair).trim() });
  }
  return out;
}

async function grab(url, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    let r;
    try {
      r = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'application/atom+xml, application/xml, text/xml' } });
    } catch (netErr) {
      if (attempt === tries) throw netErr;
      await sleep(attempt * 4000);
      continue;
    }
    if (r.ok) return parseAtom(await r.text());
    if ((r.status === 429 || r.status >= 500) && attempt < tries) {
      const ra = parseInt(r.headers.get('retry-after') || '', 10);
      const wait = (Number.isFinite(ra) ? Math.min(ra, 60) : attempt * 6) * 1000;
      console.log('throttled (HTTP ' + r.status + ') on ' + url + ' - waiting ' + (wait / 1000) + 's (attempt ' + attempt + '/' + tries + ')');
      await sleep(wait);
      continue;
    }
    throw new Error(url + ' -> HTTP ' + r.status);
  }
}

// Fetch one feed, returning null (not throwing) on failure so the other feed
// can still update.
async function tryFeed(label, url) {
  try { return await grab(url); }
  catch (e) { console.log('::warning::' + label + ' feed unavailable - ' + e.message + ' - keeping current'); return null; }
}

function identity(list) { return JSON.stringify(list.map(p => [p.u, p.t, p.f])); }

function pickDeals(raw) { const d = raw.filter(p => !DEAD.test(p.f + ' ' + p.t)).slice(0, 6); return d.length >= 3 ? d : null; }
function pickWire(raw) {
  const s = raw.filter(p => /official spoiler/i.test(p.f));
  const r = raw.filter(p => !/official spoiler/i.test(p.f));
  const w = [...s, ...r].slice(0, 6);
  return w.length >= 3 ? w : null;
}

async function main() {
  const FILE = process.argv[2] || new URL('../feeds.json', import.meta.url).pathname;

  let cur = { deals: [], wire: [] };
  try { cur = JSON.parse(readFileSync(FILE, 'utf8')); } catch (e) { console.log('no readable feeds.json yet - will create it'); }
  if (!Array.isArray(cur.deals)) cur.deals = [];
  if (!Array.isArray(cur.wire)) cur.wire = [];

  const rawDeals = await tryFeed('deals', 'https://www.reddit.com/r/sealedmtgdeals/new/.rss?limit=25');
  await sleep(2500);
  const rawWire  = await tryFeed('wire',  'https://www.reddit.com/r/magicTCG/hot/.rss?limit=25');

  if (!rawDeals && !rawWire) { console.log('both feeds unreachable - keeping current feeds'); return; }

  const deals = rawDeals ? (pickDeals(rawDeals) || cur.deals) : cur.deals;
  const wire  = rawWire  ? (pickWire(rawWire)   || cur.wire)  : cur.wire;

  const sameDeals = identity(cur.deals) === identity(deals);
  const sameWire = identity(cur.wire) === identity(wire);
  if (sameDeals && sameWire) { console.log('feeds unchanged - nothing to do'); return; }

  const outObj = { updated: new Date().toISOString(), deals, wire };
  writeFileSync(FILE, JSON.stringify(outObj, null, 2) + '\n');
  console.log('feeds.json updated (RSS): deals=' + (!sameDeals) + ' wire=' + (!sameWire));
}

main().catch(e => { console.log('::warning::refresh error - ' + (e && e.message) + ' - keeping current feeds'); process.exitCode = 0; });
