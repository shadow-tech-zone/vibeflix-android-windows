import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { call, parseSite } from "api-anything";
import { createPlay4uHandler } from "../api/play4u.js";

const spec = JSON.parse(readFileSync(new URL("../src/api/play4u.json", import.meta.url), "utf8"));
const operations = new Map(spec.operations.map((operation) => [operation.name, operation]));

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(url, method = "GET") {
  return { method, url, headers: { host: "example.test" } };
}

test("canonical spec exposes only the approved, read-only public operations", () => {
  const parsed = parseSite(spec);
  assert.deepEqual(parsed.operations.map((operation) => operation.name), ["browseTitles", "getTitle"]);
  assert.deepEqual([...operations.get("browseTitles").params].map(({ name }) => name), [
    "query", "category", "industry", "language", "genre", "page",
  ]);
  assert.deepEqual([...operations.get("getTitle").params].map(({ name }) => name), ["route", "id"]);

  for (const operation of parsed.operations) {
    assert.equal(operation.readOnly, true);
    assert.equal(operation.publicOnly, true);
    assert.equal(operation.minTier, 1);
    assert.ok(operation.unproven?.reason);
    const fieldNames = Object.keys(operation.response.html.fields).join(" ");
    assert.doesNotMatch(fieldNames, /player|stream|source|embed|iframe|video/i);
  }
});

test("Vercel browse endpoint forwards a combined search/filter request as a constrained API Anything read", async () => {
  let received;
  const handler = createPlay4uHandler(async (...args) => {
    received = args;
    return { ok: true, class: "ok", data: [{ id: "tt1234567", route: "watch", title: "Mock Movie" }] };
  });
  const res = mockResponse();
  await handler(request("/api/play4u?operation=browseTitles&query=Breaking%20Bad&genre=thriller&page=2"), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(received[0], "play4u");
  assert.equal(received[1], "browseTitles");
  assert.deepEqual(received[2], { query: "Breaking Bad", genre: "thriller", page: 2 });
  assert.deepEqual(received[3], { callOnly: true, maxTier: 1, timeoutMs: 15_000 });
  assert.equal(res.body.data[0].kind, "movie");
});

test("Vercel getTitle maps movie and series kinds to the site's fixed routes", async () => {
  let received;
  const handler = createPlay4uHandler(async (...args) => {
    received = args;
    return { ok: true, class: "ok", data: [{ title: "Example" }] };
  });
  const res = mockResponse();
  await handler(request("/api/play4u?operation=getTitle&kind=series&id=tt7631058"), res);

  assert.equal(res.statusCode, 200);
  assert.equal(received[1], "getTitle");
  assert.deepEqual(received[2], { route: "series", id: "tt7631058" });
  assert.equal(res.body.data[0].kind, "series");
});

test("Vercel endpoint rejects unsupported methods, inputs, duplicate keys, and filters before calling Play4u", async () => {
  let calls = 0;
  const handler = createPlay4uHandler(async () => { calls += 1; return { ok: true, data: [] }; });

  const methodRes = mockResponse();
  await handler(request("/api/play4u?operation=browseTitles", "POST"), methodRes);
  assert.equal(methodRes.statusCode, 405);
  assert.equal(methodRes.headers.allow, "GET");

  for (const url of [
    "/api/play4u?operation=getTitle&kind=movie&id=https%3A%2F%2Fexample.test",
    "/api/play4u?operation=getTitle&kind=movie&id=tt123&id=tt456",
    "/api/play4u?operation=browseTitles&genre=not-a-filter",
    "/api/play4u?operation=notAnOperation",
    "/api/play4u?operation=browseTitles&url=https%3A%2F%2Fevil.test",
  ]) {
    const res = mockResponse();
    await handler(request(url), res);
    assert.equal(res.statusCode, 400, url);
  }
  assert.equal(calls, 0);
});

test("API Anything extracts catalog cards and title metadata from offline HTML fixtures", async () => {
  const home = mkdtempSync(join(tmpdir(), "play4u-api-test-"));
  const sites = join(home, "sites");
  mkdirSync(sites, { recursive: true });
  writeFileSync(join(sites, "play4u.json"), JSON.stringify(spec));
  process.env.API_ANYTHING_HOME = home;
  process.env.API_ANYTHING_LOCAL_ONLY = "1";

  const requestedUrls = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    requestedUrls.push(url.href);
    assert.equal(url.hostname, "play4u.org");
    const html = url.pathname === "/"
      ? '<html><body><a href="/watch/tt1234567"><img src="https://play4u.org/poster.jpg" alt="Mock Movie"><span>PG-13 2024</span></a><a href="/series/tt7654321"><img data-src="https://play4u.org/series.jpg" alt="Mock Series"><span>TV-14 2022</span></a></body></html>'
      : '<html><head><title>Mock Series | Play4u</title><meta property="og:title" content="Mock Series"><meta property="og:description" content="A public synopsis."><meta property="og:image" content="https://play4u.org/series.jpg"><link rel="canonical" href="https://play4u.org/series/tt7654321"></head><body></body></html>';
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  };

  const browse = await call("play4u", "browseTitles", { query: "Breaking Bad", genre: "thriller", page: 2 }, {
    callOnly: true, maxTier: 1, timeoutMs: 5_000, fetchImpl,
  });
  assert.equal(browse.ok, true);
  assert.equal(browse.data[0].id, "tt1234567");
  assert.equal(browse.data[0].route, "watch");
  assert.equal(browse.data[0].title, "Mock Movie");
  assert.equal(browse.data[0].year, "2024");
  assert.equal(browse.data[0].rating, "PG-13");
  assert.match(requestedUrls[0], /q=Breaking%20Bad/);
  assert.match(requestedUrls[0], /genre=thriller/);
  assert.match(requestedUrls[0], /page=2/);

  const detail = await call("play4u", "getTitle", { route: "series", id: "tt7654321" }, {
    callOnly: true, maxTier: 1, timeoutMs: 5_000, fetchImpl,
  });
  assert.equal(detail.ok, true);
  assert.equal(detail.data[0].title, "Mock Series");
  assert.equal(detail.data[0].description, "A public synopsis.");
  assert.equal(detail.data[0].canonicalUrl, "https://play4u.org/series/tt7654321");
  assert.match(requestedUrls[1], /\/series\/tt7654321$/);
});
