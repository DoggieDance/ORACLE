// Herald feed refresh via Reddit RSS - no API key, no OAuth, no ticket.
// Reddit blocks anonymous JSON (403) but serves public RSS to a browser UA from
// a residential IP. RSS is rate-limited (fetch sequentially + retry on 429) and
// thinner than JSON: it has NO score and NO stickied flag, and its <category>
// is the SUBREDDIT, not the post flair. So we:
//   - pull real flair only if a non-subreddit <category> exists (else blank),
//   - drop recurring mod/sticky threads by title (they have no flair signal),
//   - rank likely spoilers/news (set-code "[XXX]" prefix or a spoiler flair) first.
// Writes feeds.json only - never index.html. Each feed is independent: one
// throttled feed doesn't block the other. Exits via return (no process.exit()).
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const DEAD = /sold out|sold-out|expired|dead|ended/i;
// Recurring mod/sticky threads we don't want in the news rail.
const MOD = /\b(daily (questions|discussion)|weekly|wound-?up|vent here|free talk|megathread|what should i (buy|brew|play)|deck help|rules? (thread|question)|moderator|announcement|self.?promo|sticky)\b/i;
const SETCODE = /^\[[A-Z0-9]{2,5}\]/;               // e.g. [HOB], [FIN] - spoiler/news tag
const SPOILER = /official spoiler|spoiler|leak|preview/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function decode(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;|&#0?39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function parseAtom(xml, sub) {
  const out = [];
  const entries = xml.split('<entry>').slice(1);
  for (const raw of entries) {
    const e = raw.split('</entry>')[0];
    const title = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const href  = (e.match(/<link[^>]*href="([^"]+)"/) || [])[1];
    const pub   = (e.match(/<published>([\s\S]*?)<\/published>/) || [])[1]
              || (e.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1];
    // Reddit's category is usually the subreddit; real flair (if present) is a
    // different term. Take the first category that isn't the subreddit.
    const cats = [...e.matchAll(/<category[^>]*\bterm="([^"]*)"/g)].map(m => decode(m[1]).trim());
    const flair = cats.find(c => c && c.toLowerCase() !== String(sub).toLowerCase()) || '';
    if (!title || !href) continue;
    const c = pub ? Math.floor(Date.parse(pub) / 1000) : 0;
    out.push({ t: decode(title).trim(), u: href, s: 0, c: c || 0, f: flair });
  }
  return out;
}

async function grab(url, sub, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    let r;
    try {
      r = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'application/atom+xml, application/xml, text/xml' } });
    } catch (netErr) {
      if (attempt === tries) throw netErr;
      await sleep(attempt * 4000);
      continue;
    }
    if (r.ok) return parseAtom(await r.text(), sub);
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

async function tryFeed(label, url, sub) {
  try { return await grab(url, sub); }
  catch (e) { console.log('::warning::' + label + ' feed unavailable - ' + e.message + ' - keeping current'); return null; }
}

function identity(list) { return JSON.stringify(list.map(p => [p.u, p.t, p.f])); }

function pickDeals(raw) {
  const d = raw.filter(p => !DEAD.test(p.f + ' ' + p.t) && !MOD.test(p.t)).slice(0, 6);
  return d.length >= 3 ? d : null;
}
function pickWire(raw) {
  const clean = raw.filter(p => !MOD.test(p.t));
  const isNews = p => SPOILER.test(p.f) || SETCODE.test(p.t);
  const w = [...clean.filter(isNews), ...clean.filter(p => !isNews(p))].slice(0, 6);
  return w.length >= 3 ? w : null;
}

async function main() {
  const FILE = process.argv[2] || new URL('../feeds.json', import.meta.url).pathname;

  let cur = { deals: [], wire: [] };
  try { cur = JSON.parse(readFileSync(FILE, 'utf8')); } catch (e) { console.log('no readable feeds.json yet - will create it'); }
  if (!Array.isArray(cur.deals)) cur.deals = [];
  if (!Array.isArray(cur.wire)) cur.wire = [];

  const rawDeals = await tryFeed('deals', 'https://www.reddit.com/r/sealedmtgdeals/new/.rss?limit=25', 'sealedmtgdeals');
  await sleep(2500);
  const rawWire  = await tryFeed('wire',  'https://www.reddit.com/r/magicTCG/hot/.rss?limit=25', 'magicTCG');

  if (!rawDeals && !rawWire) { console.log('both feeds unreachable - keeping current feeds'); return; }

  const deals = rawDeals ? (pickDeals(rawDeals) || cur.deals) : cur.deals;
  const wire  = rawWire  ? (pickWire(rawWire)   || cur.wire)  : cur.wire;

  const sameDeals = identity(cur.deals) === identity(deals);
  const sameWire = identity(cur.wire) === identity(wire);
  if (sameDeals && sameWire) { console.log('feeds unchanged - nothing to do'); return; }

  writeFileSync(FILE, JSON.stringify({ updated: new Date().toISOString(), deals, wire }, null, 2) + '\n');
  console.log('feeds.json updated (RSS): deals=' + (!sameDeals) + ' wire=' + (!sameWire));
}

main().catch(e => { console.log('::warning::refresh error - ' + (e && e.message) + ' - keeping current feeds'); process.exitCode = 0; });
