# Android baseline

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use, not a commercial product, and not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access; use original artwork, icons, and open fonts.

## Source of truth

`android/vibeflix-v31-source.zip` is the canonical Android source archive for the existing Java/Media3 app. CI extracts and patches this archive; loose extracted files are not the build input. The archive is approximately 811 KB and an automated scan found no common embedded credential patterns (that scan is not a guarantee).

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

## Signing security

No signing key, password, or signing file was copied into this repository. The source repository was publicly accessible during migration and had tracked signing material; treat those legacy credentials as compromised even if visibility is changed later. Do not reuse them. A compatible key-rotation/update plan for the existing Android package must be confirmed before a new signed release. Store only approved replacement material in protected CI secrets, never in Git or chat.

CI verification does not prove live playback, provider availability, real-device behavior, or Play Protect clearance. A Play Protect warning was previously observed and remains unresolved; keep Play Protect enabled and never advise bypassing it.
