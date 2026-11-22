# Windows client

VibeFlix Windows is a fresh native WinUI 3 desktop app. It does not revive the removed WPF prototype and does not reuse Android's Media3 player. The current project is an early shell: a dark, original visual system; Home, Search, My List, History, and Settings navigation; and an independent Windows playback-service seam.

## Project layout

- `VibeFlix.sln` — Visual Studio solution for the Windows client.
- `VibeFlix.Windows/` — WinUI 3 app targeting .NET 10 and Windows App SDK 2.7.0.
- `VibeFlix.Windows/MainWindow.xaml` — dark desktop shell and mouse/keyboard-accessible controls. Standard Tab/Shift+Tab focus and Enter/Space activation are supported by the WinUI controls.
- `VibeFlix.Windows/Services/WindowsPlaybackService.cs` — separate `Windows.Media.Playback.MediaPlayer` foundation. It accepts absolute HTTP(S) media URIs only; provider catalog lookup, stream resolution, and the playback UI are not implemented yet.

The shell is a foundation, not a port of the Android screen layouts. The Windows client should preserve the product's core workflows—Server 1/Server 2/Both Servers, search and categories, My List, History, Continue Watching/resume, episode/season navigation, and captions—while using a desktop-first layout, native keyboard/mouse interaction, window resizing, and full-screen playback. Do not stretch the phone UI across a wide window.

## UX research gate

Before polishing or expanding the visual UI, first research the current Netflix Windows client: verify what Windows product/form is currently available, then inspect its publicly observable Home, navigation, search, title-detail, library, playback, keyboard/mouse, and window-size behaviors. Record a short UX findings/design brief and translate only general interaction patterns into an original VibeFlix design. Do not copy Netflix's branding, icons, artwork, proprietary assets, or reproduce screens pixel-for-pixel. The existing shell is scaffolding, not the final design. This research and desktop design brief should come before the next major UI build-out.

## Sync behavior

Sync must stay local-first and explicitly opt-in. After a user's one-time consent for an account, the target experience is automatic: perform an initial merge on sign-in, then queue/coalesce local changes and sync on app resume or network recovery, with durable retries for offline/failing requests. Users should not have to press a recurring “Sync now” button; show quiet status and keep manual retry as an error-recovery option only. Never sync playback URLs or provider credentials.

This describes the desired end-state, not a feature already implemented. The current Android UI still exposes a manual “Sync library now” action, and this Windows scaffold has no sync integration yet. Android automation is a separate follow-up; keep its local behavior and existing data working.

## Build and verification

The repository's current Linux workspace has no `dotnet`, `msbuild`, or Windows SDK, so a native Windows compilation cannot be run locally here. `.github/workflows/build-windows.yml` provides the practical compile check on a Windows GitHub Actions runner using the .NET 10 SDK. It restores and builds the x64 WinUI app for changes to `windows/`, the workflow, or project docs.

On a Windows development machine with the .NET 10 SDK and Windows App SDK prerequisites available:

```powershell
dotnet restore windows/VibeFlix.Windows/VibeFlix.Windows.csproj -p:Platform=x64
dotnet build windows/VibeFlix.Windows/VibeFlix.Windows.csproj --configuration Release --no-restore -p:Platform=x64
```

After a successful build, manually check that the window launches, the sidebar and hero buttons work with both mouse and keyboard, focus remains visible while tabbing, and each sidebar selection opens the correct placeholder screen. This scaffold does not yet produce an installer or a release package.
