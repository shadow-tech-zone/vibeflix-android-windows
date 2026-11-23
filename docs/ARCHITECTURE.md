# Android architecture

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access.

## Source of truth and build

The Android project is maintained as the canonical source archive `android/vibeflix-v31-source.zip`. CI extracts it to a temporary directory, applies release-time package/version values, runs offline unit tests, and verifies debug package metadata. Loose extracted files are not a build input.

The app is native Android/Java with Media3, Gradle 7.6.4, Android Gradle Plugin 7.4.2, and JDK 17. It targets SDK 34 and supports a minimum SDK of 23. CI uses the separate-install application ID `org.example.play4u.movyexperiment.v31`; do not modify the original app's package identity.

## Main components

| Component | Responsibility |
| --- | --- |
| `MainActivity` | Home, Search, categories, details, My List, history, pull-to-refresh, automatic load-more, and navigation state. |
| `NativePlayerActivity` | Media3 playback, landscape behavior, captions control, episode sheet, resume, and Next Episode. |
| `MovyApi` | Server 2 metadata/stream adapter; provider behavior is external and unstable. |
| `Server2WebsiteCatalog` | Limited public-website fallback for first-page browse when the API fails. |
| `PlaybackResolver` | Server 1 bootstrap decoding and stream URL validation. |
| `SupabaseAuthRepository` / `SupabaseSessionStore` | Email/password sign-in and encrypted, account-bound session storage. |
| `SupabaseLibrarySync` | Explicitly enabled, local-first My List merge with durable timestamped tombstones. |
| `SupabasePlaybackSync` | Latest-per-title History, per-episode resume/progress, Continue Watching visibility, and clear/removal tombstones. |
| `SupabaseRestClient` | Authenticated user-scoped PostgREST reads/writes; RLS remains authoritative. |

Local state includes saved titles, watch history, playback positions, resume ownership, hidden Continue Watching entries, recent searches, source selection, and UI focus/scroll state. Existing local behavior must remain available offline and while signed out.

## Supabase sync boundary

Supabase is used for account/library synchronization only, not stream resolution or media delivery. Sync requires explicit per-account consent. The client uses a publishable/anon key and stores session material with Android Keystore-backed encryption. Cloud rows contain allow-listed catalog metadata and validated episode keys only—never stream/playback URLs or provider credentials. Removals and clear operations use durable tombstones; the service-role key must never be placed in the app or repository.

The deployed schema and remaining validation are described in [`supabase-schema-rls-design.md`](supabase-schema-rls-design.md). Live sign-in and writes have been observed on one installed debug build, but second-install restore and request-level cross-user RLS isolation with separate real Auth-issued users remain unverified. Automatic queued/background sync after one-time consent is not implemented; the current UI retains a manual sync action.

## Release and verification

The verify workflow does not sign or publish an APK. The release workflow requires protected replacement signing values, a compatible key-rotation lineage, and an approved certificate fingerprint. CI compilation and offline tests do not establish live provider responses, playback, real-device behavior, cross-device sync, or Play Protect clearance. Keep Play Protect enabled and distinguish CI results from device-reported behavior.
