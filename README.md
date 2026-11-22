# Vibeflix

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access. Use original artwork, icons, and open fonts; do not use Netflix branding or proprietary assets.

This is the private repository for the next Vibeflix phase.

## Status

- **Android baseline:** The canonical source archive is `android/vibeflix-v31-source.zip`. The latest Android PR CI run [44971555380](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44971555380) passed offline unit tests, debug-package verification, client-key configuration checks, and private debug-artifact upload. A new signed release is blocked until an approved, non-exposed signing key and fingerprint are configured securely.
- **Sync:** Supabase project `vibeflix-sync` is running in `ap-southeast-1`. The installed Android debug build signed in successfully, and live queries confirmed cloud library writes, including a resumable progress checkpoint. Cross-device restore and real-token cross-user RLS isolation remain unverified; the user chose to defer the second-install restore test and start Windows work. Direct SQL guard checks passed for timestamp clamping, clear/removal guards, removal ties, hidden-state transitions, and progress completion. Cloud payloads use canonical catalog metadata and episode keys only—not stream/playback URLs or provider credentials. See [`docs/supabase-schema-rls-design.md`](docs/supabase-schema-rls-design.md).
- **Windows:** The fresh native WinUI 3/.NET Windows client is in its first interactive prototype milestone in `windows/`: desktop browse/search, source and genre filters, title details, season/episode navigation, local My List/History/sample-resume state, and a non-playing player with an explicitly untimed sample-caption preview. All catalogue data is fictional; provider browsing, real media playback/captions, sign-in, cloud sync, and a release package are not connected yet. Local .NET/Windows build tools are absent, so the Windows Actions workflow provides the compile check.
- **Releases:** This repository has no published release yet. The debug APK is available only as a private seven-day Actions artifact for device testing; there is no public download link.

## Repository layout

- `android/vibeflix-v31-source.zip` — source of truth for the existing Java/Media3 Android app; CI extracts and patches it.
- `.github/workflows/build-phone.yml` — offline unit tests, debug package verification, and a private seven-day Actions artifact for device testing; it is not a public release link.
- `.github/workflows/release-phone.yml` — gated signed-release flow; requires protected signing secrets, a compatible rotation lineage, and the approved certificate fingerprint.
- `.github/workflows/build-windows.yml` — Windows-hosted WinUI 3 restore/build check.
- `windows/` — fresh WinUI 3 desktop-client prototype, UX research brief, and local build instructions.
- `release.json` — versionCode, versionName, tag, asset name, and title for the next Android release.
- `supabase/migrations/` — versioned SQL applied to the remote Vibeflix sync project.
- `docs/` — project, architecture, release, and Supabase design documentation.

## Product constraints

- Keep native Android/Java/Media3 as the primary product; do not change package identity or revive the removed TV, WPF, or direct-TMDB experiments.
- User-facing source names are only **Server 1**, **Server 2**, and **Both Servers**.
- Preserve My List, watch history, Continue Watching and its hidden state, per-title resume, home/search loading, category browsing, episode navigation, and local offline behavior.
- Do not add direct TMDB API integration or tokens. Provider-linked poster/backdrop image URLs are allowed; never sync stream URLs or provider credentials.
- The approved Windows client is a fresh native WinUI 3 desktop app with original dark styling, keyboard/mouse navigation, and an independent Windows playback stack—not the removed WPF prototype and not Netflix branding or proprietary assets.

## Verification honesty

CI checks do not establish live playback, provider availability, real-device behavior, or Play Protect clearance. A Play Protect warning was previously observed and remains unresolved; keep Play Protect enabled and do not advise bypassing it. Distinguish CI results from user-reported device success in every report and release note.
