# Contributing

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access.

## Ground rules

- Keep the native Android app (`org.example.play4u.movyexperiment.v31`) working. Do not change its package identity.
- Preserve My List, History, Continue Watching and its hidden state, resume, episode navigation, automatic load-more, and back/scroll behavior unless a change is explicitly approved.
- Keep local library behavior available while signed out or offline. Sync stays explicitly opted-in and additive.
- Never commit credentials, provider tokens, signing material, passwords, user data, or Supabase service-role keys. Client builds may use only an approved publishable/anon key.
- Use original artwork, icons, and open fonts. Do not use Netflix branding or proprietary assets.

## Android changes

1. Treat `android/vibeflix-v31-source.zip` as the canonical source archive. Edit in a temporary working directory, run unit tests, then update the archive; CI does not build loose extracted files.
2. Add or update offline unit tests for behavior changes. Tests must use local fixtures, not live provider calls.
3. Run the Android verify workflow. It runs tests and checks debug package metadata; it does not prove signed-release behavior or live playback.
4. For a release, increment `versionCode` and update `versionName`, `tag`, `asset`, and `title` in `release.json`. Never reuse a tag.

## Sync and privacy

- Supabase sync is local-first and requires explicit per-account consent. Preserve local data on sign-out and failed requests.
- Store only allow-listed catalog metadata and validated episode keys in cloud library rows. Never store stream/playback URLs, provider credentials, or tokens there.
- Test RLS isolation and restore behavior before claiming cross-user or cross-device sync is verified.

## Release discipline

Publish a GitHub release first; share a test/download link only after the release exists and the APK asset is attached. Release notes must include the hobby/personal-use disclaimer and distinguish CI verification from device-reported playback. Never claim Play Protect clearance or advise bypassing Play Protect.
