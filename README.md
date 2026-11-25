# VibeFlix

> **Hobby/personal-use disclaimer:** VibeFlix is a personal project, not a commercial service, and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access. VibeFlix uses its own name, UI, icons, and artwork—not Netflix branding or proprietary assets.

## Active focus: GitHub Pages web app

The current product target is a responsive VibeFlix web app in [`web/`](web/) backed by the deployed Supabase Edge Function `vibeflix-provider` in project `vibeflix-sync` (`fzhrpgoouourzzhfvuzk`). The static client is designed for GitHub Pages; the function makes provider-side catalog, title-detail, episode, and on-demand stream-resolution requests from the server side. Its source is tracked in [`supabase/functions/vibeflix-provider/`](supabase/functions/vibeflix-provider/).

The web client includes source/filter/search browsing, title details, series seasons and episodes, on-demand stream selection, HLS/browser video playback, and local My List, Continue Watching, resume progress, and watch history. Local library state stays in this browser. Stream URLs are resolved only after Play and are held in memory; they are not written to local storage or logged.

**Live provider access and browser playback are not yet verified.** Catalog HTML/API formats, provider availability, CORS, media headers, and stream/CDN behavior can change or prevent playback. A successful build is not proof that any particular catalog or stream works. The function intentionally does not proxy or persist media files.

### Web setup

1. Optional: copy `web/.env.example` to `web/.env.local` to override the configured project URL/key. The Vite client uses the project's **publishable** key, which is designed to be public; never use a Supabase secret/service-role key in a browser app.
2. Run `cd web && npm ci && npm run dev`.
3. The `vibeflix-provider` Edge Function is deployed to `vibeflix-sync` with JWT verification disabled for the public client endpoint. Its CORS allow-list includes this repository's GitHub Pages origin and local Vite development. To redeploy from a linked Supabase CLI checkout, run `supabase functions deploy vibeflix-provider --project-ref fzhrpgoouourzzhfvuzk`.
4. Enable GitHub Pages with **GitHub Actions** as its source, then deploy from `main` using [`.github/workflows/web-pages.yml`](.github/workflows/web-pages.yml). The project Pages URL is `https://shadow-tech-zone.github.io/vibeflix-android-windows/`. The Pages workflow can use an optional `VITE_SUPABASE_PUBLISHABLE_KEY` Actions secret and `VITE_SUPABASE_URL` repository variable to override the public project defaults. A manual workflow dispatch also runs a live provider/media-CORS smoke check; that check has not yet run.

## Other clients and project history

- **Android:** [`android/vibeflix-v31-source.zip`](android/vibeflix-v31-source.zip) remains the canonical source archive for the existing Java/Media3 Android client. Its sync schema and privacy boundaries are documented in [`docs/supabase-schema-rls-design.md`](docs/supabase-schema-rls-design.md). Existing Android CI and release safeguards remain in place; this web pivot does not modify Android source.
- **Windows:** [`windows/`](windows/) contains a native WinUI 3/.NET desktop prototype with local-file playback and local library state. Provider browsing and streams are not the active Windows work target.
- **Supabase:** `supabase/migrations/` tracks the existing RLS-protected sync schema. The new Edge Function is separate from those sync tables and does not require a database migration.
- **Project history and architecture:** see [`docs/PROJECT-HISTORY.md`](docs/PROJECT-HISTORY.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repository layout

- `web/` — React, TypeScript, Vite client and its GitHub Pages build.
- `supabase/functions/vibeflix-provider/` — server-side provider adapter; stream resolution is on demand.
- `supabase/migrations/` — user-scoped library sync schema; unrelated to web local-library persistence.
- `.github/workflows/web-pages.yml` — web lint/build validation and GitHub Pages deployment from `main`.
- `.github/workflows/build-phone.yml`, `.github/workflows/release-phone.yml` — Android CI and gated release flow.
- `.github/workflows/build-windows.yml` — Windows-hosted build check.
- `android/`, `windows/`, `docs/` — existing client sources, prototypes, and design/history documents.
