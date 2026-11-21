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
| `UiIcon`, fonts, resources | Original visual language; no proprietary Netflix icons or fonts. |

Local Android state is stored on-device and includes saved titles, watch history, playback positions, resume ownership, hidden Continue Watching entries, recent searches, source selection, and UI focus/scroll state. Existing local behavior must remain available when signed out or offline.

## Supabase sync foundation

Supabase project `vibeflix-sync` is active in `ap-southeast-1`. The initial schema, three My List timestamp-guard migrations, and a timestamp-trigger correction are applied; they define the six authenticated-user tables/RLS and monotonic tombstone writes. A transient SQL check verified My List inserts and timestamp conflict behavior, with the test fixture removed. SQL is tracked under `supabase/migrations/`; the schema and remaining sync decisions are documented in `docs/supabase-schema-rls-design.md`.

The Android source includes sign-in-only email/password Auth plumbing, a build-time publishable-key slot, and AES-GCM session encryption with a non-exportable Android Keystore key. It also includes an explicitly enabled, local-first My List merge that keeps per-title timestamps and tombstones; a server trigger suppresses stale writes, lets removals win exact ties, and clamps any future timestamp to millisecond server time. Public email signup is disabled and email confirmation remains required. The optional GitHub Actions publishable-key variable is not independently verified, and live sign-in/My List sync have not been tested. Watch history and playback progress remain local-only. The service-role key must never belong in a client or repository.

Sync merges My List only after the user explicitly enables it for the current account. Local state is retained on failure, and authenticated RLS remains authoritative. The existing Android app continues to work signed out/offline. The database RLS catalog and grants have been structurally inspected, but adversarial cross-user request tests have not been run; expand sync only after those tests and live verification.

## Windows direction

The planned Windows client is a new native WinUI 3/.NET MAUI desktop experience with original dark artwork, keyboard/mouse navigation, and its own Windows playback stack. It is not the removed WPF prototype and will not use Media3. No Windows project is present yet.

## Playback and design constraints

- Preserve My List, watch history, Continue Watching and its hidden state, per-title resume, automatic load-more, back/scroll state, season/episode navigation, and Next Episode behavior.
- Landscape playback by default; captions off by default with a manual CC toggle.
- No share buttons. Adult-content blocking remains postponed.
- No direct TMDB API integration or tokens. Provider-linked poster/backdrop image URLs are allowed.
- User-facing source names stay **Server 1**, **Server 2**, and **Both Servers**.
- Use original artwork, icons, and open fonts; no Netflix logo, Netflix Sans, Netflix icons, or proprietary assets.

## Verification

CI compilation, offline unit tests, signature verification, and package metadata checks do not establish live provider responses, stream playback, real-device behavior, or Play Protect clearance. Keep Play Protect enabled and distinguish CI results from user-reported device success.
