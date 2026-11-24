# VibeFlix private streaming UI experiment

A personal, responsive React Native Web prototype that reimplements a familiar dark-and-red streaming-product front end with original VibeFlix branding: a marketing landing page and FAQ, a visual-only sign-in screen, a three-step local demo setup, a cinematic featured title, horizontal discovery rails, title details, and a browser-local My List. It is an independent hobby project, not Netflix, and does not use Netflix logos, media, or downloaded artwork.

## Architecture

- React 19 + React Native Web components for consistent responsive UI primitives.
- Vite 8 for development and production builds; versions were checked against the npm registry before this pass and are already current.
- `src/data/catalog.js` owns fictional title metadata and row composition.
- `src/components/` contains isolated entry, navigation, spotlight, rail, card, details, playback, and footer components. The landing page has alternating feature panels and an accordion FAQ; the three-step setup chooses a local demo profile, while sign-in is visual-only and never sends or saves credentials. TV Shows and Movies compose separate genre rails; New & Popular groups trending, recent, and type-specific picks. The fixed navigation darkens on scroll, while desktop rails expose keyboard-accessible arrows and mobile keeps swipe navigation.
- `src/hooks/useMyList.js` owns the browser-persisted watchlist state.
- A root render error boundary shows a recovery view instead of leaving an empty page.

The app uses original local SVG illustrations and no remote fonts. My List stays in the current browser; fictional demo titles have no video source. Public-catalog playback uses a separate, same-origin Vercel function, `GET /api/play4u-playback?kind=movie|series&id=tt…`, which ports the existing Android player's public HLS resolver. It is requested only after the user presses Play; the browser fetches the HLS stream directly, while VibeFlix does not proxy or download media. No login, DRM handling, or Supabase storage is involved. Browser CORS/referrer restrictions may prevent some streams from playing; the resolver does not work around those restrictions. Use only content and sources you are authorized to access.

The read-only API Anything adapter at `GET /api/play4u` remains limited to Play4u catalog metadata (`browseTitles` and `getTitle`); it does not inspect player data or return stream URLs. Playback is a separate Vercel function, not an API Anything operation. The root URL and legacy `/play4u.html` alias show these titles in the VibeFlix browse experience, reusing its navigation, cinematic spotlight, title rails, details modal, and dark/red theme while adding search, collapsible filters, and pagination. Home uses a cinematic spotlight with poster rails; Movies, TV Shows, and New & Popular use the same catalog, with filters available on those browse pages. Use `/?catalog=welcome` for the landing page or `/?catalog=demo` for the fictional local demo. Browse buttons on the landing and sign-in screens open the same VibeFlix browse experience; `/play4u-test.html` is a legacy redirect to the root. Public-catalog title cards open metadata details, and Play opens the in-page VibeFlix HLS player. The metadata adapter and live-verification caveats are documented in `../api-anything/play4u/README.md`. Offline tests run with `npm test`.

Keep Vercel SSO protection enabled for personal use; do not make the project public or disable that protection.

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
