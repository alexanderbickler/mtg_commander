// Vercel serverless function: GET /api/deck?url=<deck link from Moxfield, Archidekt, TappedOut, Deckstats or MTGGoldfish>
// Returns {src, name, url, commanders: [...], cards: ["1 Sol Ring", ...]} with CORS headers for the rater's origins.
//
// Browsers can't read these sites' decks from another site (no CORS permission), but a server can.
// This only fetches deck pages from the supported sites, so it can't be used as an open proxy.
//
// Environment variables (all optional):
//   ALLOWED_ORIGINS      comma-separated origins allowed to call this (default: the GitHub Pages site and localhost)
//   MOXFIELD_USER_AGENT  the user agent Moxfield approves if you're granted API access; without it Moxfield usually refuses

const DEFAULT_ORIGINS = ["https://alexanderbickler.github.io", "http://localhost:3000", "http://127.0.0.1:3000"];
const TIMEOUT_MS = 8000;
const MAX_CARDS = 400;
const MAX_BYTES = 2_000_000;   // a decklist page is far smaller; stop reading anything bigger
const UA = "CommanderBracketRater/1.0 (+https://alexanderbickler.github.io/mtg_commander/)";

// Only real deck links from the two supported sites.
function parseDeckUrl(raw){
  let u;
  try { u = new URL(String(raw || "")); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const mox = host === "moxfield.com" && u.pathname.match(/^\/decks\/([\w-]{1,64})\/?/);
  if (mox) return {site: "Moxfield", id: mox[1], url: `https://moxfield.com/decks/${mox[1]}`};
  const arch = host === "archidekt.com" && u.pathname.match(/^\/decks\/(\d{1,12})(\/|$)/);
  if (arch) return {site: "Archidekt", id: arch[1], url: `https://archidekt.com/decks/${arch[1]}`};
  // tappedout.net/mtg-decks/<slug>/
  const to = host === "tappedout.net" && u.pathname.match(/^\/mtg-decks\/([a-z0-9-]{1,120})\/?/i);
  if (to) return {site: "TappedOut", id: to[1], url: `https://tappedout.net/mtg-decks/${to[1]}/`};
  // deckstats.net/decks/<owner>/<id>-<slug>/ or the short deckstats.net/decks/<id>-<slug>
  const ds = host === "deckstats.net" && u.pathname.match(/^\/decks\/(\d{1,12}(?:-[\w-]{0,120})?)(?:\/(\d{1,12}(?:-[\w-]{0,120})?))?\/?$/);
  if (ds) { const path = "/decks/" + ds[1] + (ds[2] ? "/" + ds[2] : "") + "/"; return {site: "Deckstats", id: path, url: "https://deckstats.net" + path}; }
  // mtggoldfish.com/deck/<id> or /archetype/<slug> (an archetype's most recent list)
  const gf = host === "mtggoldfish.com" && u.pathname.match(/^\/(deck|archetype)\/([a-z0-9-]{1,120})\/?$/i);
  if (gf && (gf[1] !== "deck" || /^\d+$/.test(gf[2]))) return {site: "MTGGoldfish", kind: gf[1], id: gf[2], url: `https://www.mtggoldfish.com/${gf[1]}/${gf[2]}`};
  return null;
}

// A plain-text decklist (the export format most deck sites offer) → {commanders, cards}.
// Understands "1 Card", "1x Card", "1<tab>Card", section headings (Commander, Sideboard, Maybeboard…),
// commander markers (*CMDR*, "# !Commander", [Commander]) and set codes like "(SPM) 12", which it drops.
function fromText(text){
  const commanders = [], cards = [];
  let section = "";
  const skip = /^(sideboard|maybeboard|maybe|considering|tokens?|attractions|stickers|acquireboard|wishlist)/;
  for (const raw of String(text).split(/\r?\n/)){
    let l = raw.trim();
    if (!l) continue;
    const head = l.replace(/^[\/#\s]+/, "").replace(/[:\s]*(\(\d+\))?\s*$/, "").toLowerCase();
    if (/^(\/\/|#)/.test(l) || /^(commanders?|companions?|sideboard|maybeboard|maybe|considering|deck|main ?deck|mainboard|main|tokens?|lands?|creatures?|instants?|sorcery|sorceries|artifacts?|enchantments?|planeswalkers?|battles?|other|acquireboard|wishlist)\s*:?\s*(\(\d+\))?$/i.test(l)){ section = head; continue; }
    if (/^SB:\s*/i.test(l)) continue;                                  // MTGO-style sideboard line
    if (skip.test(section)) continue;
    const m = l.match(/^(\d{1,3})\s*x?\s+(.+)$/i) || l.match(/^(\d{1,3})\t+(.+)$/);
    if (!m) continue;                                                    // not a card line (titles, prices, notes)
    const isCmd = /\*cmdr\*/i.test(l) || /#\s*!commander\b/i.test(l) || /\[[^\]]*commander[^\]]*\]/i.test(l) || section.startsWith("commander");
    const name = m[2].replace(/\[[^\]]*\]/g, "").replace(/\*[A-Za-z]+\*/g, "").replace(/\s+#.*$/, "").replace(/\s+\([A-Za-z0-9]{2,6}\)(\s+[\w-]+)?\s*$/, "").replace(/\s+\^.*$/, "").trim();
    if (!name || name.length > 141) continue;
    if (isCmd) commanders.push(name); else cards.push(parseInt(m[1], 10) + " " + name);
  }
  return {commanders, cards};
}

// When a list doesn't mark its commander, find it from a hint such as an archetype slug ("commander-vivi-ornitier").
function commanderFromHint(deck, hint){
  if (deck.commanders.length || !hint) return deck;
  const key = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const want = key(hint.replace(/^commander-/, ""));
  const i = deck.cards.findIndex(l => key(l.replace(/^\d+\s+/, "")) === want);
  if (i >= 0){ deck.commanders.push(deck.cards[i].replace(/^\d+\s+/, "")); deck.cards.splice(i, 1); }
  return deck;
}

const decodeHtml = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const looksLikeList = t => !/^\s*</.test(t) && /^\s*\d{1,3}\s*x?\s+\S/m.test(t);

// Archidekt's deck JSON → {name, commanders, cards}. Same rules as the page's bookmark: maybeboard/sideboard left out.
function fromArchidekt(d){
  const cats = d.categories || [];
  const outside = new Set(cats.filter(c => c.includedInDeck === false).map(c => c.name));
  const premier = new Set(cats.filter(c => c.isPremier).map(c => c.name));
  const commanders = [], cards = [];
  (d.cards || []).forEach(c => {
    const name = (c.card && c.card.oracleCard && c.card.oracleCard.name) || (c.card && c.card.name);
    const inCats = c.categories || [];
    if (!name || (inCats.length && inCats.every(x => outside.has(x)))) return;
    if (inCats.some(x => x === "Commander" || premier.has(x))) commanders.push(name);
    else cards.push((c.quantity || 1) + " " + name);
  });
  return {name: d.name || "", commanders, cards};
}

// Moxfield's deck JSON (v3 "boards" shape, or the older v2 shape) → {name, commanders, cards}.
function fromMoxfield(d){
  const boards = d.boards || {commanders: {cards: d.commanders}, mainboard: {cards: d.mainboard}, companions: {cards: d.companions}};
  const list = b => Object.values((boards[b] && boards[b].cards) || {});
  return {
    name: d.name || "",
    commanders: list("commanders").map(c => c.card && c.card.name).filter(Boolean),
    cards: [...list("mainboard"), ...list("companions")].filter(c => c.card && c.card.name).map(c => (c.quantity || 1) + " " + c.card.name)
  };
}

class FetchError extends Error { constructor(status, code, message){ super(message); this.status = status; this.code = code; } }

async function getJson(url, headers){
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {headers: {Accept: "application/json", ...headers}, signal: ctrl.signal, redirect: "follow"});
    if (res.status === 404) throw new FetchError(404, "not_found", "Deck not found, or it's private.");
    if (res.status === 401 || res.status === 403) throw new FetchError(502, "blocked", "The deck site refused the request.");
    if (!res.ok) throw new FetchError(502, "upstream", `The deck site answered ${res.status}.`);
    return await res.json();
  } catch (e) {
    if (e instanceof FetchError) throw e;
    throw new FetchError(504, "unreachable", e.name === "AbortError" ? "The deck site took too long to answer." : "Couldn't reach the deck site.");
  } finally { clearTimeout(timer); }
}

async function getText(url){
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {headers: {Accept: "text/plain, text/html;q=0.9, */*;q=0.5", "User-Agent": UA}, signal: ctrl.signal, redirect: "follow"});
    if (res.status === 404) throw new FetchError(404, "not_found", "Deck not found, or it's private.");
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 503) throw new FetchError(502, "blocked", "The deck site refused the request.");
    if (!res.ok) throw new FetchError(502, "upstream", `The deck site answered ${res.status}.`);
    const text = await res.text();
    return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
  } catch (e) {
    if (e instanceof FetchError) throw e;
    throw new FetchError(504, "unreachable", e.name === "AbortError" ? "The deck site took too long to answer." : "Couldn't reach the deck site.");
  } finally { clearTimeout(timer); }
}

// Tries each export URL in turn and returns the first one that reads as a decklist.
async function firstList(urls){
  let last;
  for (const url of urls){
    try { const t = await getText(url); if (looksLikeList(t)) return t; last = new FetchError(502, "unreadable", "The deck site didn't return a decklist."); }
    catch (e) { if (e.code === "not_found") throw e; last = e; }
  }
  throw last;
}

async function loadTextSite(link){
  if (link.site === "TappedOut") return fromText(await firstList([link.url + "?fmt=txt", link.url + "?fmt=dec"]));
  if (link.site === "Deckstats") return fromText(await firstList([link.url + "?export_txt=1&include_comments=1", link.url + "?export_dec=1"]));
  // MTGGoldfish: deck pages have a download link; archetype pages embed the current list in the page.
  if (link.kind === "deck") return fromText(await firstList([`https://www.mtggoldfish.com/deck/download/${link.id}`]));
  const html = await getText(link.url);
  const embedded = html.match(/name="deck_input\[deck\]"[^>]*value="([^"]*)"/) || html.match(/value="([^"]*)"[^>]*name="deck_input\[deck\]"/);
  let deck;
  if (embedded) deck = fromText(decodeHtml(embedded[1]));
  else {
    const dl = html.match(/\/deck\/download\/(\d+)/);
    if (!dl) throw new FetchError(502, "unreadable", "Couldn't find a decklist on that MTGGoldfish page.");
    deck = fromText(await firstList([`https://www.mtggoldfish.com/deck/download/${dl[1]}`]));
  }
  return commanderFromHint(deck, link.id);
}

async function loadDeck(link){
  if (["TappedOut", "Deckstats", "MTGGoldfish"].includes(link.site)){
    return {name: "", ...await loadTextSite(link)};
  }
  if (link.site === "Archidekt") return fromArchidekt(await getJson(`https://archidekt.com/api/decks/${link.id}/`, {"User-Agent": UA}));
  const ua = process.env.MOXFIELD_USER_AGENT;
  const headers = {"User-Agent": ua || UA};
  try { return fromMoxfield(await getJson(`https://api2.moxfield.com/v3/decks/all/${link.id}`, headers)); }
  catch (e) {
    if (e.code === "not_found") throw e;
    try { return fromMoxfield(await getJson(`https://api2.moxfield.com/v2/decks/all/${link.id}`, headers)); }
    catch (e2) {
      if (e2.code === "blocked" || e.code === "blocked") throw new FetchError(502, "moxfield_blocked", "Moxfield doesn't allow this tool to read decks yet.");
      throw e2;
    }
  }
}

function allowedOrigin(origin, host){
  if (origin && host && origin === "https://" + host) return origin;   // the site itself, if it's also served from Vercel
  const list = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const allowed = list.length ? list : DEFAULT_ORIGINS;
  if (!origin) return null;
  if (allowed.includes(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) && allowed.includes("*.vercel.app")) return origin;
  return null;
}

async function handler(req, res){
  const origin = allowedOrigin(req.headers && req.headers.origin, req.headers && req.headers.host);
  if (origin){ res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary", "Origin"); }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const send = (status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(body)); };

  if (req.method === "OPTIONS"){ res.statusCode = 204; return res.end(); }
  if (req.method !== "GET") return send(405, {error: "method", message: "Use GET."});
  if (req.headers && req.headers.origin && !origin) return send(403, {error: "origin", message: "This site isn't allowed to use the deck importer."});

  const raw = (req.query && req.query.url) || new URL(req.url, "http://x").searchParams.get("url");
  const link = parseDeckUrl(raw);
  if (!link) return send(400, {error: "bad_url", message: "Paste a deck link from Moxfield, Archidekt, TappedOut, Deckstats or MTGGoldfish."});

  try {
    const deck = await loadDeck(link);
    deck.commanders = deck.commanders.slice(0, 4);
    deck.cards = deck.cards.slice(0, MAX_CARDS);
    if (!deck.commanders.length && !deck.cards.length) return send(422, {error: "empty", message: "That deck has no cards."});
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");   // repeat pastes of the same deck don't hit the deck site
    return send(200, {src: link.site, url: link.url, ...deck});
  } catch (e) {
    return send(e.status || 500, {error: e.code || "error", message: e.message || "Something went wrong."});
  }
}

module.exports = handler;
module.exports.parseDeckUrl = parseDeckUrl;
module.exports.fromArchidekt = fromArchidekt;
module.exports.fromMoxfield = fromMoxfield;
module.exports.fromText = fromText;
module.exports.commanderFromHint = commanderFromHint;
module.exports.allowedOrigin = allowedOrigin;
