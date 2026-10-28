// Vercel serverless function: GET /api/deck?url=<Moxfield or Archidekt deck link>
// Returns {src, name, url, commanders: [...], cards: ["1 Sol Ring", ...]} with CORS headers for the rater's origins.
//
// Browsers can't read Moxfield or Archidekt decks from another site (no CORS permission), but a server can.
// This only fetches deck pages from those two sites, so it can't be used as an open proxy.
//
// Environment variables (all optional):
//   ALLOWED_ORIGINS      comma-separated origins allowed to call this (default: the GitHub Pages site and localhost)
//   MOXFIELD_USER_AGENT  the user agent Moxfield approves if you're granted API access; without it Moxfield usually refuses

const DEFAULT_ORIGINS = ["https://alexanderbickler.github.io", "http://localhost:3000", "http://127.0.0.1:3000"];
const TIMEOUT_MS = 8000;
const MAX_CARDS = 400;

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
  return null;
}

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

async function loadDeck(link){
  if (link.site === "Archidekt") return fromArchidekt(await getJson(`https://archidekt.com/api/decks/${link.id}/`, {"User-Agent": "CommanderBracketRater/1.0"}));
  const ua = process.env.MOXFIELD_USER_AGENT;
  const headers = {"User-Agent": ua || "CommanderBracketRater/1.0"};
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
  if (!link) return send(400, {error: "bad_url", message: "Paste a Moxfield or Archidekt deck link."});

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
module.exports.allowedOrigin = allowedOrigin;
