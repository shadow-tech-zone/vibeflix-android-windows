# Play4u → API Anything

A read-only adapter for Play4u's **public, logged-out catalog metadata**. It never logs in, plays video, inspects embeds, or extracts video-source URLs.

The canonical two-operation API Anything spec is `site/src/api/play4u.json`. VibeFlix's Vercel function uses that file directly, and the optional CLI/MCP installer copies the same spec so the definitions cannot drift.

## Test directly on Vercel

After deploying the `site` project, open `/play4u-test.html` on that Vercel deployment. The page calls its same-origin serverless function and displays the JSON response. Its requests contact Play4u's public pages; they are not mock responses.

The JSON endpoint is `GET /api/play4u`:

```text
/api/play4u?operation=browseTitles&query=Breaking%20Bad&genre=thriller&page=1
/api/play4u?operation=getTitle&kind=movie&id=tt36778423
/api/play4u?operation=getTitle&kind=series&id=tt7631058
```

`browseTitles` combines optional search (`query`), category, industry, language, genre, and page filters. `getTitle` takes `kind=movie|series` and an IMDb-style title ID; the function maps those kinds to Play4u's `/watch/` and `/series/` routes. The endpoint accepts only GET requests, fixed operation names, enumerated browse filters, and title IDs matching `tt` plus digits. It runs API Anything with `callOnly: true` and `maxTier: 1`, so the endpoint does not use browser automation, login state, registry calls, writes, healing, or report uploads.

## Optional local CLI or MCP use

Requires Node.js 22.13 or newer and API Anything 0.5.0 or newer. From the repository root:

```sh
node api-anything/play4u/install.mjs
npx -y api-anything@0.5.0 sites
npx -y api-anything@0.5.0 ops play4u
```

The installer copies the canonical spec and its notes into `~/.api-anything/sites/`. It will not overwrite either existing file unless you pass `--force`. To use a separate API Anything home, set `API_ANYTHING_HOME` for the installer and every later CLI/MCP command.

```sh
# Dry run previews a request; it does not contact Play4u.
npx -y api-anything@0.5.0 call play4u browseTitles genre=thriller --dry

# Search is part of browseTitles; title route is watch for a movie, series for a series.
npx -y api-anything@0.5.0 call play4u browseTitles query="Breaking Bad" genre=thriller
npx -y api-anything@0.5.0 call play4u getTitle route=watch id=tt36778423
npx -y api-anything@0.5.0 call play4u getTitle route=series id=tt7631058
```

To connect a supported MCP client, run `npx -y api-anything@0.5.0 setup --local-only` and select that client. To start the local MCP server manually:

```powershell
# Windows PowerShell
$env:API_ANYTHING_LOCAL_ONLY = "1"
npx -y api-anything@0.5.0 mcp
```

```sh
# macOS / Linux
API_ANYTHING_LOCAL_ONLY=1 npx -y api-anything@0.5.0 mcp
```

## Verification status

The spec has two operations (`browseTitles`, `getTitle`), and both are read-only, public-only, and marked `unproven`. Offline tests validate the spec, endpoint input handling, route mapping, and extraction from fixture HTML; they do **not** prove the live site's search key, filter semantics, pagination, selectors, or title-page metadata. Use the deployed Vercel test page for those live checks. The spec is not published to API Anything's shared registry.
