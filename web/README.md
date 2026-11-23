# VibeFlix web client

React + TypeScript + Vite client for the VibeFlix GitHub Pages web app. The client calls the deployed `vibeflix-provider` Supabase Edge Function for live catalog, details, episodes, and on-demand stream resolution.

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

The My List, watch history, and resume checkpoint data are stored locally in browser storage. Resolved stream URLs are runtime-only memory state. Provider access and browser playback remain subject to live upstream availability, provider headers, and CORS.
