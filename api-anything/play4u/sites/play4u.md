# Play4u public catalog — draft

**Status: unverified draft.** This spec was scaffolded from the public homepage snapshot, not from an API Anything browser capture. Treat query parameters and HTML selectors as guesses until live-verified.

- The homepage snapshot exposed 1–30 of 342 titles and public links using `/watch/tt…` and `/series/tt…`.
- The navigation exposed `cat=latest`, `industry=hollywood|bollywood|kollywood`, `lang=en|hi|ta|te`, and `genre=drama|action|thriller|crime`.
- `browseTitles` assumes the search query key is `q` and one-based `page` pagination. Search behavior and pagination still need live verification.
- `getTitle` accepts `route=watch` for a movie or `route=series` for a series, plus the title ID. It reads only common metadata tags.
- Browse results select public title links, image alt text, poster attributes, and visible card text. No player, embed, or video-source fields are selected.
- Both operations are read-only, rate-limited, and marked `unproven`. No login, playback, or write actions are included. Do not publish this draft to a shared registry until it has been captured and verified.

## Returned fields

- `browseTitles`: `id`, `route` (`watch` or `series` from the public path), `title`, `poster` or `lazyPoster`, `detailUrl`, optional `year` / `rating` parsed from visible card text, and `cardText`.
- `getTitle`: public `title`, `pageTitle`, `description`, `metaDescription`, `poster`, `canonicalUrl`, and `contentType` where supplied by the page.

## Verify before relying on it

Use the Vercel test page at `/play4u-test.html` for the requested live check. The endpoint uses the deployed API Anything library and calls Play4u; tests under `site/test/` use offline fixtures and do not verify the live website. If a manual CLI verification is done later, run it on a network with Play4u access and a Chromium browser. Keep calls low-volume and observe Play4u's terms and rate limits.
