# Architecture

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access.

## Android baseline

The Android project is versioned as the canonical source archive `android/vibeflix-v31-source.zip`. CI extracts it to a temporary directory and applies release-time transformations; loose extracted files are not a build input.

- Native Android/Java with Media3; Gradle 7.6.4, Android Gradle Plugin 7.4.2, JDK 17.
- compileSdk/targetSdk 34, minSdk 23.
- CI patches the separate-install package ID to `org.example.play4u.movyexperiment.v31`, app label to `Vibeflix`, and version fields from `release.json`.
- The verify workflow runs offline unit tests and checks a debug APK's package metadata. It does not sign or publish a release.
- The release workflow requires protected signing secrets, a compatible Android key-rotation lineage, and an approved certificate fingerprint. No signing file or password is stored in this repository.

## Main Android components

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
| `SupabaseRestClient` | Authenticated user-scoped PostgREST reads in stable 100-row pages and writes in 100-row batches; RLS remains authoritative. |
| `UiIcon`, fonts, resources | Original visual language; no proprietary Netflix icons or fonts. |

Local Android state is stored on-device and includes saved titles, watch history, playback positions, resume ownership, hidden Continue Watching entries, recent searches, source selection, and UI focus/scroll state. Existing local behavior must remain available when signed out or offline.

## Supabase sync foundation

Supabase project `vibeflix-sync` is active in `ap-southeast-1`. The initial schema, My List clock/tie guards, timestamp-trigger correction, and History/resume/Continue Watching migrations are applied. The schema now has nine user-scoped tables with RLS, including latest-per-title `watch_history`, per-episode `watch_progress` tombstones, `continue_hidden`, and a per-user History-clear watermark. SQL is tracked under `supabase/migrations/`; the exact status and remaining validation boundary are documented in `docs/supabase-schema-rls-design.md`.

The Android source includes sign-in-only email/password Auth plumbing, a build-time publishable-key slot, and AES-GCM session encryption with a non-exportable Android Keystore key. One explicit, versioned per-account consent enables local-first sync for My List, latest History per title, episode resume/progress, hidden Continue Watching state, title-removal tombstones, and Clear all History. Consent can be revoked to stop future sync; local data and existing cloud rows are retained. The client merges by monotonic per-record timestamps; removals win History/progress and Continue Watching ties, completions win progress ties, future client timestamps are clamped to millisecond server statement time, and a clear watermark prevents stale offline restoration. Live SQL guard checks passed for these policies and their removal/clear cases. Payloads contain canonical title metadata and validated episode keys only—never stream/playback URLs or provider credentials. Public email signup is disabled and email confirmation remains required. The user-installed debug build signed in successfully; live Supabase queries confirmed library writes, including a resumable progress checkpoint. The latest Android CI run [44971555380](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44971555380) passed offline unit tests, debug-package verification, client-key configuration checks, and private-artifact upload. Cross-device restore and request-level, real-token cross-user isolation remain unverified; the second-install restore test was explicitly deferred. Important UX gap: the current Android UI still makes the user press “Sync library now”; the user wants automatic sync after one-time opt-in, without recurring manual sync. Do not describe background automation as implemented yet. The service-role key must never belong in a client or repository.

Local state is preserved on failures and the existing Android app continues to work signed out/offline. Database catalog, grant, trigger, and simulated-role checks are useful but do not substitute for real Auth-issued token tests. Windows development is proceeding by the user's explicit decision while the second-install restore check remains deferred. That decision does not mark cross-device restore or real-token cross-user isolation as passed; complete those checks before relying on those sync guarantees or promoting them in a release.

## Windows direction

Windows development continues in `windows/` as a fresh native WinUI 3/.NET desktop app, not the removed WPF prototype. The .NET 10 / Windows App SDK 2.7.0 client has an original desktop-first fictional catalogue and local My List/History plus a real local-file playback slice using `Windows.Media.Playback.MediaPlayer`: play/pause, seeking, episode navigation, actual timed-metadata captions (off by default), and title/episode-keyed local resume. File paths are held only in memory for the current session and are never persisted; no provider stream or credentials are present. `windows/UX-RESEARCH.md` records the current Store listing and source-based desktop UX findings; direct inspection of the installed Netflix client, its current screens, and resize behavior remains unverified. This VibeFlix UI is an original design, not a Netflix clone or a hands-on-benchmarked recreation. Provider catalogue adapters and stream resolution, audio-track selection, Windows Auth, optional cloud sync, and packaging remain future work. Keep sync local-first and one-time opt-in if added; desired automatic behavior after consent (sign-in, app resume, local changes, and network recovery) is not implemented. Keep the Android client independent. This workspace has no local .NET/Windows build tools, so `.github/workflows/build-windows.yml` runs local-progress-store tests and provides the x64 compilation path on `windows-latest`; Windows playback, file picker, codec, and caption-rendering behavior still require manual runtime checks.

## Playback and design constraints

- Preserve My List, watch history, Continue Watching and its hidden state, per-title resume, automatic load-more, back/scroll state, season/episode navigation, and Next Episode behavior.
- Landscape playback by default; captions off by default with a manual CC toggle.
- No share buttons. Adult-content blocking remains postponed.
- No direct TMDB API integration or tokens. Provider-linked poster/backdrop image URLs are allowed.
- User-facing source names stay **Server 1**, **Server 2**, and **Both Servers**.
- Use original artwork, icons, and open fonts; no Netflix logo, Netflix Sans, Netflix icons, or proprietary assets.

## Verification

CI compilation, offline unit tests, signature verification, and package metadata checks do not establish live provider responses, stream playback, real-device behavior, or Play Protect clearance. Keep Play Protect enabled and distinguish CI results from user-reported device success.
