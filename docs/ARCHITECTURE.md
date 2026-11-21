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

Supabase project `vibeflix-sync` is active in `ap-southeast-1`. Migration `20261121213826_initial_library_schema` is applied and defines profiles, devices, titles, watch progress, My List tombstones, and watch events with authenticated-user RLS and constrained client grants. The applied SQL is tracked at `supabase/migrations/20261121213826_initial_library_schema.sql`; design and remaining decisions are documented in `docs/supabase-schema-rls-design.md`.

The Android source now includes sign-in-only email/password Auth plumbing, a build-time publishable-key slot, and AES-GCM session encryption with a non-exportable Android Keystore key. No publishable key has been configured, so sign-in has not been exercised against live Auth; no library sync is implemented. Auth has email enabled, requires email confirmation, and has public email signup disabled per the owner's choice. Its site URL remains `http://localhost:3000` with no redirect allow-list; configure an Android-safe callback before adding any callback-based auth flow. The service-role key must never belong in a client or repository.

Future sync must be local-first, queue changes offline, and merge per user/title/episode without replacing the Android app's current local behavior. The database RLS catalog and grants have been inspected, but adversarial cross-user RLS tests and the server-side conflict-resolution path have not been implemented; complete both before enabling client sync.

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
