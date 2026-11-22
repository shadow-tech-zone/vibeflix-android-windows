# Contributing

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access.

## Ground rules

- Keep the existing native Android app (`org.example.play4u.movyexperiment.v31`) working as the baseline. Do not change its package identity or reintroduce the removed TV, WPF, or direct-TMDB experiments.
- The approved Windows client is a fresh native desktop app, not a revival of the old WPF experiment. Use original artwork, icons, and open fonts; never use proprietary Netflix branding or assets.
- Keep user-facing source names to **Server 1**, **Server 2**, and **Both Servers**.
- Preserve local My List, watch history, Continue Watching and its hidden state, resume, episode navigation, automatic load-more, and back/scroll behavior unless a change is explicitly approved.
- Never commit credentials, provider tokens, signing material, or passwords. Keep approved signing values in protected CI secrets, not source files or logs.

## Android changes

1. Treat `android/vibeflix-v31-source.zip` as the canonical source archive. Edit in a temporary working directory, run unit tests, then update the archive. CI does not build loose extracted files.
2. Add or update offline unit tests for behavior changes. Tests must use local fixtures, not live provider calls.
3. Run the Android verify workflow. It runs tests and checks debug package metadata; it does not prove signed-release behavior or live playback.
4. For a release, increment `versionCode` and update `versionName`, `tag`, `asset`, and `title` in `release.json`. Never reuse a tag.

## Windows changes

- Build the fresh WinUI 3/.NET app in `windows/`; do not revive the removed WPF prototype or reuse Android Media3 code.
- Keep desktop navigation usable with both keyboard and mouse, preserve the original dark visual direction, and use the independent Windows playback stack.
- Before expanding the visual UI, research the current Netflix Windows client and document its observable UX patterns; create an original desktop-first VibeFlix design, not a pixel-perfect clone or a stretched Android layout.
- Preserve the core Android product workflows, but adapt their presentation for desktop. After one-time sync opt-in, sync should be automatic; do not make users repeatedly press a manual sync button.
- Follow `windows/README.md` for local commands. The Windows Actions workflow performs the compile check because this workspace has no Windows/.NET toolchain.

## Other platforms and sync

- Keep platform UIs native; avoid Electron/web-wrapper approaches.
- Keep Supabase client configuration free of service-role credentials. Use only approved publishable/anon values at runtime and secure token storage on each platform.
- Test RLS isolation for every user-owned table before relying on cross-user or cross-device sync. An unfinished validation is not a Windows development blocker.

## Release discipline

Publish a GitHub release first; share a test/download link only after the release exists and the APK asset is attached. Release notes must include the hobby/personal-use disclaimer and distinguish CI verification from device-reported playback. Never claim Play Protect clearance or advise bypassing Play Protect.
