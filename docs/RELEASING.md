# Releasing

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access.

## Current status

This repository has no published releases yet. The next planned Android release uses a new tag, `android-v35`; old releases in the previous repository remain separate backups. Do not share any test/download link until a GitHub release is published and its APK asset is attached.

The legacy signing material was exposed in a publicly accessible source repository. It is not copied here and must not be used. Before a signed release, the owner must establish a compatible Android key-rotation/update plan and configure approved replacement signing values as protected GitHub Actions secrets. Do not send key material or passwords through chat or commit them to Git.

## Versioning

`release.json` controls `versionCode`, `versionName`, `tag`, `asset`, and release `title`. Increment `versionCode` and use a new tag and asset name for every build. Never overwrite or reuse a tag. The release workflow checks the remote tag before publishing.

## Workflows

- `build-phone.yml` runs offline unit tests and builds a debug APK to verify package/version metadata. It creates no release and shares no artifact/test link.
- `release-phone.yml` runs tests, builds a release APK, verifies `apksigner`, checks package metadata and the approved certificate fingerprint, then publishes a GitHub release. It prints release and asset URLs only after release creation succeeds.

The release workflow expects these protected values in the `android-release` GitHub Actions environment; actual values must not be committed or pasted into chat:

- Secret `VIBEFLIX_KEYSTORE_BASE64`: base64-encoded approved PKCS12 signing file.
- Secret `VIBEFLIX_KEYSTORE_PASSWORD`: password for that signing key.
- Secret `VIBEFLIX_SIGNING_LINEAGE_BASE64`: approved Android signing-certificate rotation lineage.
- Variable `VIBEFLIX_EXPECTED_CERT_SHA256`: approved public certificate fingerprint.

Do not populate these with the exposed legacy signing material. The workflow stops if the secrets or expected fingerprint are missing or inconsistent.

## Before publishing

1. Verify the Android baseline and tests on the current branch.
2. Review changes and ensure no secrets or provider credentials were added.
3. Increment all release fields in `release.json` and confirm the tag is new.
4. Run `build-phone.yml` and inspect compile/test/package-metadata checks.
5. Confirm the approved signing strategy and protected environment values are in place.

## Publish and verify

Run `release-phone.yml` from `main` only after the checks pass. It publishes the APK directly as a GitHub release asset; no temporary external mirror is created.

After the workflow succeeds, open the release page and confirm the asset is attached. Only then share its release/download link. CI does not prove live playback, provider availability, real-device behavior, or Play Protect clearance. Keep Play Protect enabled; never advise bypassing it.
