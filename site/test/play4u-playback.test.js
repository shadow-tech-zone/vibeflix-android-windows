import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlay4uPlaybackHandler,
  resolvePlay4uStreamUrl,
} from "../api/play4u-playback.js";

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

function sealedPlayerHtml(url, key = "sample-key") {
  const bytes = Buffer.from(url, "utf8");
  const keyBytes = Buffer.from(key, "utf8");
  for (let index = 0; index < bytes.length; index += 1) bytes[index] ^= keyBytes[index % keyBytes.length];
  const encoded = bytes.toString("base64url");
  return `<script>window.__PA_SEAL_KEY__ = ${JSON.stringify(key)}; window.__PA_PLAY__ = {"streams":[{"m3u8_url":"pa!~${encoded}"}]};</script>`;
}

test("resolves a direct HTTPS HLS URL from the player bootstrap", () => {
  const html = '<script>window.__PA_PLAY__ = {"streams":[{"m3u8_url":"https://media.example/master.m3u8"}]};</script>';
  assert.equal(resolvePlay4uStreamUrl(html), "https://media.example/master.m3u8");
});

test("decodes the sealed player URL and resolves relative HLS paths", () => {
  assert.equal(
    resolvePlay4uStreamUrl(sealedPlayerHtml("https://media.example/series/master.m3u8")),
    "https://media.example/series/master.m3u8",
  );
  assert.equal(
    resolvePlay4uStreamUrl('<script>window.__PA_PLAY__ = {"streams":[{"m3u8_url":"/media/master.m3u8"}]};</script>'),
    "https://play4u.org/media/master.m3u8",
  );
});

test("parses nested player JSON and rejects missing or insecure stream sources", () => {
  const nested = '<script>window.__PA_PLAY__ = {"extra":{"label":"a } brace"},"streams":[{"m3u8_url":"https://media.example/master.m3u8"}]};</script>';
  assert.equal(resolvePlay4uStreamUrl(nested), "https://media.example/master.m3u8");
  assert.throws(() => resolvePlay4uStreamUrl('<script>window.__PA_PLAY__ = {"streams":[]};</script>'), /No HLS stream/);
  assert.throws(() => resolvePlay4uStreamUrl('<script>window.__PA_PLAY__ = {"streams":[{"m3u8_url":"http://media.example/master.m3u8"}]};</script>'), /Unsupported stream/);
});

test("playback API maps a validated catalog title to its fixed Play4u page", async () => {
  let requested;
  const handler = createPlay4uPlaybackHandler(async (url, options) => {
    requested = { url: String(url), options };
    return new Response('<script>window.__PA_PLAY__ = {"streams":[{"m3u8_url":"https://media.example/master.m3u8"}]};</script>', {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  });
  const res = mockResponse();
  await handler(request("/api/play4u-playback?kind=movie&id=tt1234567"), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["cache-control"], "no-store, private");
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.deepEqual(res.body, {
    ok: true,
    data: { url: "https://media.example/master.m3u8", mimeType: "application/x-mpegURL" },
  });
  assert.equal(requested.url, "https://play4u.org/watch/tt1234567");
  assert.equal(requested.options.method, "GET");
  assert.equal(requested.options.redirect, "manual");
  assert.equal(requested.options.headers.Referer, "https://play4u.org/");
  assert.equal(requested.options.headers.Origin, "https://play4u.org");
});

test("playback API maps series titles and rejects invalid requests before fetching", async () => {
  let calls = 0;
  const handler = createPlay4uPlaybackHandler(async () => {
    calls += 1;
    return new Response('<script>window.__PA_PLAY__ = {"streams":[{"m3u8_url":"https://media.example/master.m3u8"}]};</script>');
  });

  const seriesRes = mockResponse();
  await handler(request("/api/play4u-playback?kind=series&id=tt7654321"), seriesRes);
  assert.equal(seriesRes.statusCode, 200);
  assert.equal(calls, 1);

  const methodRes = mockResponse();
  await handler(request("/api/play4u-playback?kind=movie&id=tt1234567", "POST"), methodRes);
  assert.equal(methodRes.statusCode, 405);
  assert.equal(methodRes.headers.allow, "GET");

  for (const url of [
    "/api/play4u-playback?kind=movie&id=https%3A%2F%2Fevil.test",
    "/api/play4u-playback?kind=movie&id=tt123&id=tt456",
    "/api/play4u-playback?kind=episode&id=tt123",
    "/api/play4u-playback?kind=movie&id=tt123&url=https%3A%2F%2Fevil.test",
  ]) {
    const res = mockResponse();
    await handler(request(url), res);
    assert.equal(res.statusCode, 400, url);
  }
  assert.equal(calls, 1);
});

test("playback API refuses redirects outside the catalog host", async () => {
  const handler = createPlay4uPlaybackHandler(async () => new Response(null, {
    status: 302,
    headers: { location: "https://untrusted.example/player" },
  }));
  const res = mockResponse();
  await handler(request("/api/play4u-playback?kind=movie&id=tt1234567"), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
});
