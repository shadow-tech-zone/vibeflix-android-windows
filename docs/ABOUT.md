# About Vibeflix

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with, endorsed by, or connected to Netflix or any content provider. It is provided as-is, without warranties or guarantees. Use only content and services you are authorized to access.

## Purpose

Vibeflix is a personal native Android app built with Java and Media3. This repository is now scoped to the mobile app and its Android release/support files.

The canonical source archive is [`../android/vibeflix-v31-source.zip`](../android/vibeflix-v31-source.zip). Local library state remains available when signed out or offline. Supabase library sync is optional, explicitly consented, and additive; cloud payloads exclude stream/playback URLs and provider credentials.

## Android behavior

- Home, Search, categories, My List, and watch history
- Two content sources presented as **Server 1**, **Server 2**, and **Both Servers**
- Continue Watching, per-title resume, and a hidden Continue Watching state
- Media3 playback with seasons, episodes, and Next Episode behavior
- Landscape playback by default; captions are off by default and can be enabled manually with CC

## What Vibeflix is not

- Not a commercial product, public streaming service, or supported service
- Not affiliated with or endorsed by Netflix or any provider
- Not a direct TMDB API integration; provider-linked image URLs may be used for posters/backdrops
- Not security-certified, malware-cleared, or guaranteed to play on a particular device or network

Use original artwork, icons, and open fonts. Do not use Netflix logos, Netflix Sans, Netflix icons, or any other proprietary assets.

## Verification limits

The Android debug app has previously signed in and written library state, including a resume checkpoint. Cross-device restore and request-level cross-user RLS isolation with real Auth-issued tokens remain unverified; do not describe them as passed. The current Android UI still requires a manual “Sync library now” action; automatic queued/background sync is not implemented. Automated builds and offline unit tests do not prove live provider availability, playback, subtitle behavior, real-device behavior, or Play Protect status. A Play Protect warning was previously observed and remains unresolved; keep Play Protect enabled and do not advise bypassing it.
