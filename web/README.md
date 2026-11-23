# VibeFlix web client

React + TypeScript + Vite client for the VibeFlix GitHub Pages web app. It opens with an original welcome/FAQ page, then leads into the provider-backed browse experience with search, title details, series episodes, My List, history, resume progress, and playback controls. Catalog, details, episodes, and on-demand stream resolution use the existing `vibeflix-provider` Supabase Edge Function; the frontend does not use Firebase or TMDB credentials and does not require sign-in.

## Local development

```sh
npm ci
npm run dev
```

The default project URL and Supabase **publishable** key are configured in `src/api.ts`. Optional Vite variables in `.env.local` can override them; never put a Supabase secret/service-role key in this client.

## Checks

```sh
npm test
npm run lint
npm run build
```

`npm run build` emits a project-Pages build under `dist/`. Vite loads `hls.js` only when an HLS stream is selected. `scripts/provider-smoke.mjs` is an explicit live smoke test used only by manual GitHub Actions dispatches; it reports provider/catalog and media CORS outcomes without printing or saving resolved stream URLs.

Choose **Open Movies** in the catalog source menu for a browser-ready, openly licensed film: Big Buck Bunny, played as a direct MP4 from the Blender Foundation and attributed under CC BY 3.0. The shortcut route is `/?source=open#browse`. This source does not use a media relay or provider-header workaround. Server 1 and Server 2 remain separate catalog/resolver options; their streams play in a browser only when the upstream permits direct access and satisfies browser CORS rules.

The My List, watch history, and resume checkpoint data are stored locally in browser storage. Resolved stream URLs are runtime-only memory state. Provider access and browser playback remain subject to live upstream availability, provider headers, and CORS.
