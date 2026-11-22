# Android baseline

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use, not a commercial product, and not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access; use original artwork, icons, and open fonts.

## Source of truth

`android/vibeflix-v31-source.zip` is the canonical Android source archive for the existing Java/Media3 app. CI extracts and patches this archive; loose extracted files are not the build input. The refreshed archive is approximately 821 KiB; an automated scan found no common embedded credential patterns (that scan is not a guarantee).

The imported baseline is native Android/Java with Media3, Gradle 7.6.4, Android Gradle Plugin 7.4.2, JDK 17, compileSdk/targetSdk 34, and minSdk 23. The separate-install application ID is `org.example.play4u.movyexperiment.v31`; do not change it or modify the original app's package. User-facing source names are only **Server 1**, **Server 2**, and **Both Servers**.

The previous repository's latest known release is `v31-build34` (versionCode 34, versionName `5.4-catalog-recovery-review34`). That release remains in the source repository; this new repository has no published release. The next planned new-repo Android version is versionCode 35 with the distinct tag `android-v35`.

## Behavior to preserve

- My List grid, watch history, Continue Watching and its hidden state, and per-title resume.
- Home/Search automatic load-more, pull-to-refresh, categories, and back/scroll state.
- Episodes button, immediate current-season episode list, season picker, and Next Episode behavior.
- Landscape playback by default; captions off by default with a manual CC toggle.
- No share buttons. Adult-content blocking remains postponed.
- No direct TMDB API integration or tokens; provider-linked poster/backdrop image URLs are allowed.

## Build and release status

`build-phone.yml` runs offline unit tests and builds a debug APK to verify package/version metadata; it does not sign or publish anything. `release-phone.yml` is designed to sign and publish only after a compatible Android key-rotation lineage, a replacement key, and protected CI secrets are configured. No test link is shared before a release exists.

The Supabase project and user-scoped library schema are deployed. The refreshed source archive contains native email/password sign-in, Android Keystore-encrypted session storage, and explicitly consented, local-first sync for My List, latest History per title, episode resume/progress, Continue Watching hidden state, title-removal tombstones, and Clear all History. Direct live SQL checks for timestamp clamping, clear/removal guards, removal ties, hidden-state transitions, completion ties, and test-fixture cleanup passed. Local state remains available offline and after a sync failure. Consent can be revoked from the account page; doing so stops future syncs but keeps both local data and the existing cloud copy. Cloud payloads contain canonical catalog metadata and episode keys only; stream/playback URLs and provider credentials are excluded. Public email signup is disabled. The app requires the `VIBEFLIX_SUPABASE_PUBLISHABLE_KEY` build environment variable to enable sign-in; it is intentionally absent from the archive and repository. The variable's presence in GitHub Actions has not been independently verified. The refreshed archive passed offline unit tests and debug-package verification in [CI run 44968003888](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44968003888). Live Auth, PostgREST RLS isolation, and real-device/cross-device sync remain untested; see [`../docs/supabase-schema-rls-design.md`](../docs/supabase-schema-rls-design.md).

## Signing security

No signing key, password, or signing file was copied into this repository. The source repository was publicly accessible during migration and had tracked signing material; treat those legacy credentials as compromised even if visibility is changed later. Do not reuse them. A compatible key-rotation/update plan for the existing Android package must be confirmed before a new signed release. Store only approved replacement material in protected CI secrets, never in Git or chat.

CI verification does not prove live playback, provider availability, real-device behavior, or Play Protect clearance. A Play Protect warning was previously observed and remains unresolved; keep Play Protect enabled and never advise bypassing it.
