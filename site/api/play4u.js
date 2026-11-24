import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call as apiAnythingCall } from "api-anything";
import play4uSpec from "../src/api/play4u.json" with { type: "json" };

// API Anything persists pacing and call state under its home directory. Vercel's source tree is
// read-only, so use the function's writable temporary directory and install this bundled spec there.
const apiAnythingHome = join(tmpdir(), "play4u-api-anything");
process.env.API_ANYTHING_HOME = apiAnythingHome;
process.env.API_ANYTHING_LOCAL_ONLY = "1";
const sitesDir = join(apiAnythingHome, "sites");
mkdirSync(sitesDir, { recursive: true, mode: 0o700 });
writeFileSync(join(sitesDir, "play4u.json"), `${JSON.stringify(play4uSpec)}\n`, { mode: 0o600 });

const specByOperation = new Map(play4uSpec.operations.map((operation) => [operation.name, operation]));
const browseKeys = new Set(["operation", "query", "category", "industry", "language", "genre", "page"]);
const titleKeys = new Set(["operation", "kind", "id"]);
const maxSearchLength = 120;

function fail(res, status, error, details) {
  return res.status(status).json({ error, ...(details ? { details } : {}) });
}

function getSingleParam(searchParams, name) {
  const values = searchParams.getAll(name);
  if (values.length > 1) return { error: `Use ${name} only once.` };
  return { value: values[0] };
}

function mapResultStatus(result) {
  if (result?.ok) return 200;
  if (result?.class === "input") return 400;
  if (result?.class === "rate") return 429;
  if (result?.class === "blocked") return 451;
  return 502;
}

function presentResult(result, operation, args) {
  if (!result?.ok || !Array.isArray(result.data)) return result;
  if (operation === "browseTitles") {
    return {
      ...result,
      data: result.data.map((item) => ({
        ...item,
        kind: item.route === "watch" ? "movie" : "series",
      })),
    };
  }
  return { ...result, data: result.data.map((item) => ({ ...item, kind: args.kind })) };
}

function browseArgs(searchParams) {
  const args = {};
  for (const name of ["query", "category", "industry", "language", "genre", "page"]) {
    const parsed = getSingleParam(searchParams, name);
    if (parsed.error) return parsed;
    if (parsed.value === undefined) continue;

    if (name === "page") {
      if (!/^[1-9]\d*$/.test(parsed.value)) return { error: "page must be a whole number from 1 to 100." };
      const page = Number(parsed.value);
      if (!Number.isSafeInteger(page) || page > 100) return { error: "page must be a whole number from 1 to 100." };
      args.page = page;
      continue;
    }

    if (name === "query") {
      const query = parsed.value.trim();
      if (query.length > maxSearchLength) return { error: `query must be ${maxSearchLength} characters or fewer.` };
      if (query) args.query = query;
      continue;
    }

    const parameter = specByOperation.get("browseTitles")?.params.find((item) => item.name === name);
    if (parameter?.enum && !parameter.enum.includes(parsed.value)) {
      return { error: `Unsupported ${name} filter.`, details: { allowed: parameter.enum } };
    }
    args[name] = parsed.value;
  }
  return { args };
}

function titleArgs(searchParams) {
  const kind = getSingleParam(searchParams, "kind");
  if (kind.error) return kind;
  const id = getSingleParam(searchParams, "id");
  if (id.error) return id;
  if (!new Set(["movie", "series"]).has(kind.value)) return { error: "kind must be movie or series." };
  if (!id.value || id.value.length > 32 || !/^tt[0-9]+$/.test(id.value)) {
    return { error: "id must be a Play4u title ID such as tt36778423." };
  }
  return { args: { route: kind.value === "movie" ? "watch" : "series", id: id.value } };
}

export function createPlay4uHandler(callOperation = apiAnythingCall) {
  return async function play4uHandler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return fail(res, 405, "Only GET requests are supported.");
    }

    const url = new URL(req.url || "/", "https://vercel.invalid");
    const operation = getSingleParam(url.searchParams, "operation");
    if (operation.error) return fail(res, 400, operation.error);
    if (!operation.value || !specByOperation.has(operation.value)) {
      return fail(res, 400, "operation must be browseTitles or getTitle.");
    }

    const allowedKeys = operation.value === "browseTitles" ? browseKeys : titleKeys;
    for (const key of url.searchParams.keys()) {
      if (!allowedKeys.has(key)) return fail(res, 400, `Unsupported parameter: ${key}.`);
    }

    const parsed = operation.value === "browseTitles" ? browseArgs(url.searchParams) : titleArgs(url.searchParams);
    if (parsed.error) return fail(res, 400, parsed.error, parsed.details);

    try {
      const result = await callOperation("play4u", operation.value, parsed.args, {
        callOnly: true,
        maxTier: 1,
        timeoutMs: 15_000,
      });
      const payload = presentResult(result, operation.value, operation.value === "getTitle" ? { kind: url.searchParams.get("kind") } : {});
      return res.status(mapResultStatus(result)).json(payload);
    } catch (error) {
      console.error("Play4u API Anything call failed:", error);
      return fail(res, 502, "The catalog request could not be completed.");
    }
  };
}

export const config = { maxDuration: 20 };
export default createPlay4uHandler();
