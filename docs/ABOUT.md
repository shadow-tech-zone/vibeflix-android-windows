# About Vibeflix

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with, endorsed by, or connected to Netflix or any content provider. It is provided as-is, without warranties or guarantees. Use only content and services you are authorized to access.

## Purpose

Vibeflix is a personal native Android app with a dark cinematic interface and a Media3-based player. The Android app remains the primary product and must keep working independently of any future account or Windows client.

The roadmap may add a fresh native Windows desktop app after Android sync is fully validated. Supabase is deployed, and Android source now contains sign-in/session-storage groundwork plus explicit-consent, local-first My List, latest-History, episode-resume/progress, Continue Watching visibility, and deletion/Clear-all sync. The publishable-key configuration, live Auth, real PostgREST RLS, and physical-device sync remain unverified. The refreshed Android archive passed offline tests/debug-package verification in CI run [44965765715](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44965765715). Stream/playback URLs and provider credentials are excluded from sync payloads; the existing Android behavior continues to work on-device.

## Current Android behavior

- Home, Search, categories, My List, and local watch history
- Two content sources presented only as **Server 1**, **Server 2**, and **Both Servers**
- Continue Watching, per-title resume, and a hidden Continue Watching state
- Media3 playback with episodes, a season picker, and Next Episode behavior
- Landscape playback by default; captions are off by default and can be enabled manually with CC

## What Vibeflix is not

- Not a commercial product, public streaming service, or supported service
- Not affiliated with or endorsed by Netflix or any provider
- Not a website wrapper or WebView app
- Not a direct TMDB API integration; provider-linked image URLs may be used for posters/backdrops
- Not security-certified, malware-cleared, or guaranteed to play on a particular device or network

Use original artwork, icons, and open fonts. Do not use Netflix logos, Netflix Sans, Netflix icons, or any other proprietary assets.

## Verification limits

Automated builds and offline unit tests do not prove live provider availability, playback, subtitle behavior, real-device behavior, or Play Protect status. A Play Protect warning was previously observed and remains unresolved; keep Play Protect enabled and do not advise bypassing it.
