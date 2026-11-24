# VibeFlix private streaming UI experiment

A personal, responsive React Native Web prototype that reimplements a familiar dark-and-red streaming-product front end with original VibeFlix branding: a marketing landing page and FAQ, a visual-only sign-in screen, a three-step local demo setup, a cinematic featured title, horizontal discovery rails, title details, and a browser-local My List. It is an independent hobby project, not Netflix, and does not use Netflix logos, media, or downloaded artwork.

## Architecture

- React 19 + React Native Web components for consistent responsive UI primitives.
- Vite 8 for development and production builds; versions were checked against the npm registry before this pass and are already current.
- `src/data/catalog.js` owns fictional title metadata and row composition.
- `src/components/` contains isolated entry, navigation, spotlight, rail, card, details, playback, and footer components. The landing page has alternating feature panels and an accordion FAQ; the three-step setup chooses a local demo profile, while sign-in is visual-only and never sends or saves credentials. TV Shows and Movies compose separate genre rails; New & Popular groups trending, recent, and type-specific picks. The fixed navigation darkens on scroll, while desktop rails expose keyboard-accessible arrows and mobile keeps swipe navigation.
- `src/hooks/useMyList.js` owns the browser-persisted watchlist state.
- A root render error boundary shows a recovery view instead of leaving an empty page.

The app is intentionally self-contained: original local SVG illustrations, no remote fonts or image services, no account backend, no playback-provider API, and no actual stream source. My List is stored only in the current browser. The Play action opens an honest preview shell until a licensed playback source is configured.

A separate read-only API Anything adapter exposes only Play4u's public catalog metadata at `GET /api/play4u`; it is not connected to VibeFlix playback or the fictional app catalog. Open `/play4u.html` on the protected Vercel deployment for a usable browse/search/filter catalog with title-detail panels; the VibeFlix landing page links to it, and `/play4u-test.html` redirects there. It does not play video. The adapter and live-verification caveats are documented in `../api-anything/play4u/README.md`. Offline adapter tests run with `npm test`.

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
