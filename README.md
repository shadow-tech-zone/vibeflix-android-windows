# VibeFlix

> **Hobby/personal-use disclaimer:** VibeFlix is a personal project, not a commercial service, and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access. VibeFlix uses its own name, UI, icons, and artwork—not Netflix branding or proprietary assets.

## Android mobile app

This repository is scoped to the native Android app. The canonical Java/Media3 source is [`android/vibeflix-v31-source.zip`](android/vibeflix-v31-source.zip); CI extracts that archive and applies release-time package/version updates. See [`android/README.md`](android/README.md) for the source, build, and release notes.

[`site/`](site/) is a single-page React Native Web overview for the Android app, not a browser version of the player. It uses original, hand-authored visual elements and contains no remote artwork.

The app includes Home, Search, categories, My List, watch history, Continue Watching, title/episode resume, season and episode selection, Next Episode, and Media3 playback. Local library behavior remains available offline and while signed out. User-facing source names are **Server 1**, **Server 2**, and **Both Servers**.

## Optional library sync

Supabase is used only for explicitly opted-in account/library sync. It does not resolve streams or deliver media. The applied RLS-protected migrations are in [`supabase/migrations/`](supabase/migrations/); the design, data boundaries, and outstanding verification are documented in [`docs/supabase-schema-rls-design.md`](docs/supabase-schema-rls-design.md). Cloud payloads exclude playback URLs and provider credentials.

## Build and release

- [`.github/workflows/build-phone.yml`](.github/workflows/build-phone.yml) extracts the Android archive, runs offline tests, verifies debug package metadata, and uploads a private test artifact. This is not a public release.
- [`.github/workflows/release-phone.yml`](.github/workflows/release-phone.yml) is gated on the approved signing/key-rotation setup and publishes an Android release from `main` only.
- [`release.json`](release.json) contains the Android version and release metadata. Never reuse a version tag or commit signing material, passwords, or service-role credentials.

CI and offline tests do not prove live provider availability, playback on a particular device/network, cross-device restore, cross-user RLS isolation, or Play Protect clearance. Keep Play Protect enabled.
