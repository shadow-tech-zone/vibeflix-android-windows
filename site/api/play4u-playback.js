const PLAY4U_ORIGIN = "https://play4u.org";
const PLAY4U_HOSTS = new Set(["play4u.org", "www.play4u.org"]);
const TITLE_ID = /^tt[0-9]{1,20}$/;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function onlyOne(searchParams, name) {
  const values = searchParams.getAll(name);
  if (values.length !== 1 || !values[0]) return null;
  return values[0];
}

function extractAssignedObject(html, name) {
  const marker = `window.${name}`;
  const assignmentStart = html.indexOf(marker);
  if (assignmentStart < 0) throw new Error("Player data unavailable");

  let index = assignmentStart + marker.length;
  while (/\s/.test(html[index] || "")) index += 1;
  if (html[index] !== "=") throw new Error("Player data unavailable");
  index += 1;
  while (/\s/.test(html[index] || "")) index += 1;
  if (html[index] !== "{") throw new Error("Player data unavailable");

  const objectStart = index;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(objectStart, index + 1));
    }
  }
  throw new Error("Player data is incomplete");
}

function extractSealKey(html) {
  const match = /window\.__PA_SEAL_KEY__\s*=\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/.exec(html);
  if (!match) throw new Error("Stream key unavailable");
  const literal = match[1];
  if (literal.startsWith("\"")) return JSON.parse(literal);
  return literal.slice(1, -1).replace(/\\(['\\])/g, "$1");
}

function decodeSealedUrl(value, key) {
  const token = value.slice(4);
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(token)) throw new Error("Stream data is invalid");
  const encrypted = Buffer.from(token, "base64url");
  const keyBytes = Buffer.from(key, "utf8");
  if (!encrypted.length || !keyBytes.length) throw new Error("Stream data is invalid");
  for (let index = 0; index < encrypted.length; index += 1) {
    encrypted[index] ^= keyBytes[index % keyBytes.length];
  }
  return encrypted.toString("utf8").trim();
}

export function resolvePlay4uStreamUrl(html) {
  if (typeof html !== "string" || !html) throw new Error("Player page is empty");
  const playerData = extractAssignedObject(html, "__PA_PLAY__");
  const streams = Array.isArray(playerData.streams) ? playerData.streams : [];
  let source = "";
  for (const stream of streams) {
    if (typeof stream?.m3u8_url === "string" && stream.m3u8_url.trim()) {
      source = stream.m3u8_url.trim();
      break;
    }
  }
  if (!source || source === "null") throw new Error("No HLS stream is available");
  if (source.startsWith("pa!~")) source = decodeSealedUrl(source, extractSealKey(html));

  let streamUrl;
  if (source.startsWith("/") && !source.startsWith("//")) {
    streamUrl = new URL(source, PLAY4U_ORIGIN);
  } else {
    streamUrl = new URL(source);
  }
  if (streamUrl.protocol !== "https:" || !streamUrl.hostname || streamUrl.username || streamUrl.password) {
    throw new Error("Unsupported stream address");
  }
  streamUrl.hash = "";
  return streamUrl.href;
}

async function fetchTitlePage(url, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  timeout.unref?.();
  let current = new URL(url);

  try {
    for (let redirects = 0; redirects <= 2; redirects += 1) {
      const response = await fetchImpl(current.href, {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Origin: PLAY4U_ORIGIN,
          Referer: `${PLAY4U_ORIGIN}/`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === 2) throw new Error("Title page redirect is invalid");
        const next = new URL(location, current);
        if (next.protocol !== "https:" || !PLAY4U_HOSTS.has(next.hostname.toLowerCase())) {
          throw new Error("Title page redirect is not allowed");
        }
        current = next;
        continue;
      }
      if (!response.ok) {
        const error = new Error("Title page request failed");
        error.statusCode = response.status === 404 ? 404 : 502;
        throw error;
      }

      const finalUrl = response.url ? new URL(response.url) : current;
      if (finalUrl.protocol !== "https:" || !PLAY4U_HOSTS.has(finalUrl.hostname.toLowerCase())) {
        throw new Error("Title page response is not allowed");
      }
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > MAX_PAGE_BYTES) throw new Error("Title page is too large");
      const html = await response.text();
      if (Buffer.byteLength(html, "utf8") > MAX_PAGE_BYTES) throw new Error("Title page is too large");
      return html;
    }
  } finally {
    clearTimeout(timeout);
  }
  throw new Error("Title page request failed");
}

export function createPlay4uPlaybackHandler(fetchImpl = globalThis.fetch) {
  return async function play4uPlaybackHandler(req, res) {
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return fail(res, 405, "Only GET requests are supported.");
    }

    const url = new URL(req.url || "/", "https://vibeflix.invalid");
    for (const key of url.searchParams.keys()) {
      if (key !== "kind" && key !== "id") return fail(res, 400, `Unsupported parameter: ${key}.`);
    }
    const kind = onlyOne(url.searchParams, "kind");
    const id = onlyOne(url.searchParams, "id");
    if (!new Set(["movie", "series"]).has(kind)) return fail(res, 400, "kind must be movie or series.");
    if (!id || !TITLE_ID.test(id)) return fail(res, 400, "id must be a valid catalog title ID.");

    const route = kind === "movie" ? "watch" : "series";
    const pageUrl = `${PLAY4U_ORIGIN}/${route}/${id}`;
    try {
      const html = await fetchTitlePage(pageUrl, fetchImpl);
      const streamUrl = resolvePlay4uStreamUrl(html);
      return res.status(200).json({
        ok: true,
        data: { url: streamUrl, mimeType: "application/x-mpegURL" },
      });
    } catch (error) {
      if (error?.statusCode === 404) return fail(res, 404, "Title page was not found.");
      return fail(res, 502, "Could not prepare playback for this title.");
    }
  };
}

export const config = { maxDuration: 20 };
export default createPlay4uPlaybackHandler();
