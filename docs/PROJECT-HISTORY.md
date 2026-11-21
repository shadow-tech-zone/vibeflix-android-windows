# Project history and retained decisions

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access.

This document records decisions that still affect current work; it is not a chronology of every experiment.

## Active Android product

The active product is the native Android phone app distributed as a side-by-side package, `org.example.play4u.movyexperiment.v31`. It installs alongside the original app so local history, My List, and playback progress remain separate. The original app is not modified by this repository.

The canonical baseline is `android/vibeflix-v31-source.zip`; CI extracts and patches it. The new repository currently has no published Android release.

## Retained behavior requirements

- User-facing source names: **Server 1**, **Server 2**, and **Both Servers**.
- Preserve My List grid, watch history, Continue Watching, per-title resume, and hidden Continue Watching state.
- Preserve Episodes button, immediate current-season episode list, season picker, and Next Episode behavior.
- Home and Search auto-load more on scroll; no Next page buttons there. Preserve scroll and back state.
- No share buttons. Adult-content blocking is postponed.
- Playback defaults to landscape; captions default to off with a manual CC control.
- No direct TMDB API integration or tokens. Provider-linked poster/backdrop image URLs are allowed.
- Keep Play Protect enabled. Do not claim security clearance or real-device playback success without evidence.

## Removed experiments

- The Smart TV app, old WPF/desktop experiment, and direct-TMDB experiment were intentionally removed and must not be reintroduced.
- The approved future Windows client is a fresh native desktop app, not the old WPF experiment.
- Historical workspace exports, old APKs, SDK/JDK copies, and old build logs are not part of this repository.

## Next phase

The roadmap keeps native Android as the baseline, adds optional Supabase Auth/sync for watch history, My List, and resume, and may later build a native Windows client with its own playback stack. The `vibeflix-sync` Supabase project and initial RLS-protected schema are now in place. Android Auth/sync integration and the Windows client remain unimplemented; Auth signup policy and sync merge behavior still need decisions and testing.

## Verification posture

Automated checks cover compilation, offline unit tests, signing verification, and package metadata. Live provider responses, stream playback, real-device behavior, and Play Protect status are not proven by those checks. Distinguish user-reported device success from CI verification in all communication.
