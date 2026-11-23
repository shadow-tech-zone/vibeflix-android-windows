# VibeFlix private streaming UI experiment

A personal, responsive React Native Web prototype that follows the familiar dark-and-red streaming-catalog design language: a cinematic featured title, horizontal discovery rails, title details, and a persistent My List. It is an independent hobby project, not Netflix, and does not use Netflix logos, media, or downloaded artwork.

## Architecture

- React 19 + React Native Web components for consistent responsive UI primitives.
- Vite 8 for development and production builds; versions were checked against the npm registry before this pass and are already current.
- `src/data/catalog.js` owns fictional title metadata and row composition.
- `src/components/` contains isolated navigation, spotlight, rails, cards, details, and playback-shell components.
- `src/hooks/useMyList.js` owns the browser-persisted watchlist state.
- A root render error boundary shows a recovery view instead of leaving an empty page.

The app is intentionally self-contained: original local SVG illustrations, no remote fonts or image services, no account backend, no provider API, and no actual stream source. My List is stored only in the current browser. The Play action opens an honest preview shell until a licensed playback source is configured.

The Vercel project must remain protected by SSO for personal use. Do not make it public or disable that protection.

## Local development

```sh
npm ci
npm run dev
```

## Production build

```sh
npm run build
```

Vercel project settings: root directory `site`, framework Vite, install `npm ci`, build `npm run build`, output `dist`.
