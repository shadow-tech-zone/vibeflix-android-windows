# About Vibeflix

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with, endorsed by, or connected to Netflix or any content provider. It is provided as-is, without warranties or guarantees. Use only content and services you are authorized to access.

## Purpose

Vibeflix is a personal native Android app with a dark cinematic interface and a Media3-based player. The Android app remains the primary product and must keep working independently of the new Windows client and any future Windows account features.

Windows development has started now, by the user's explicit decision to defer the second-Android-install restore test. The Android debug APK signed in successfully on the user's device, and live Supabase queries confirmed cloud writes, including a resumable checkpoint. Cross-device restore and real-token cross-user RLS isolation remain unverified; do not describe either as passed. The Android archive and private debug-artifact workflow passed CI run [44971555380](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44971555380). Supabase sync remains opt-in and local-first, and cloud payloads exclude stream/playback URLs and provider credentials. The fresh Windows app is a native WinUI 3/.NET shell with its own Windows playback foundation; see [`../windows/README.md`](../windows/README.md). Android remains the primary product and must continue working independently.

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
