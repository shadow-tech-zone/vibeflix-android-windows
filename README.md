# Vibeflix

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access. Use original artwork, icons, and open fonts; do not use Netflix branding or proprietary assets.

This is the private repository for the next Vibeflix phase.

## Status

- **Android baseline:** The canonical source archive is now at `android/vibeflix-v31-source.zip`. The verification and release workflows are in place; the baseline build still needs to be run in CI. A new signed release is blocked until an approved, non-exposed signing key and fingerprint are configured securely.
- **Sync:** The owner approved Supabase project creation at the appropriate roadmap phase. The Supabase connection is available, but no project/backend has been created yet. The schema and RLS plan is in [`docs/supabase-schema-rls-design.md`](docs/supabase-schema-rls-design.md).
- **Windows:** The new native desktop client is planned but has not been scaffolded yet.
- **Releases:** This repository has no published release yet. Do not share test/download links until a release is published with its APK asset attached.

## Repository layout

- `android/vibeflix-v31-source.zip` — source of truth for the existing Java/Media3 Android app; CI extracts and patches it.
- `.github/workflows/build-phone.yml` — offline unit tests and debug package metadata verification only; it creates no download link.
- `.github/workflows/release-phone.yml` — gated signed-release flow; requires protected signing secrets, a compatible rotation lineage, and the approved certificate fingerprint.
- `release.json` — versionCode, versionName, tag, asset name, and title for the next Android release.
- `docs/` — project, architecture, release, and Supabase design documentation.

## Product constraints

- Keep native Android/Java/Media3 as the primary product; do not change package identity or revive the removed TV, WPF, or direct-TMDB experiments.
- User-facing source names are only **Server 1**, **Server 2**, and **Both Servers**.
- Preserve My List, watch history, Continue Watching and its hidden state, per-title resume, home/search loading, category browsing, episode navigation, and local offline behavior.
- Do not add direct TMDB API integration or tokens. Provider-linked poster/backdrop image URLs are allowed; never sync stream URLs or provider credentials.
- The approved Windows client is a fresh native desktop app with original artwork, icons, and open fonts—not Netflix branding or proprietary assets.

## Verification honesty

CI checks do not establish live playback, provider availability, real-device behavior, or Play Protect clearance. A Play Protect warning was previously observed and remains unresolved; keep Play Protect enabled and do not advise bypassing it. Distinguish CI results from user-reported device success in every report and release note.
