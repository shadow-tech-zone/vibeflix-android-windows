# Windows client

VibeFlix Windows is a fresh native WinUI 3 desktop app. It does not revive the removed WPF prototype and does not reuse Android's Media3 player. The current project is an early shell: a dark, original visual system; Home, Search, My List, History, and Settings navigation; and an independent Windows playback-service seam.

## Project layout

- `VibeFlix.sln` — Visual Studio solution for the Windows client.
- `VibeFlix.Windows/` — WinUI 3 app targeting .NET 10 and Windows App SDK 2.7.0.
- `VibeFlix.Windows/MainWindow.xaml` — dark desktop shell and mouse/keyboard-accessible controls. Standard Tab/Shift+Tab focus and Enter/Space activation are supported by the WinUI controls.
- `VibeFlix.Windows/Services/WindowsPlaybackService.cs` — separate `Windows.Media.Playback.MediaPlayer` foundation. It accepts absolute HTTP(S) media URIs only; provider catalog lookup, stream resolution, and the playback UI are not implemented yet.

The shell is a foundation, not a port of the Android feature set. Provider browsing, local persistence, playback/history wiring, Windows sign-in, and cloud sync remain future work. The Android app stays independent and unchanged. Any Windows sync must remain local-first and explicitly opt-in; playback URLs and provider credentials must never be synced.

## Build and verification

The repository's current Linux workspace has no `dotnet`, `msbuild`, or Windows SDK, so a native Windows compilation cannot be run locally here. `.github/workflows/build-windows.yml` provides the practical compile check on a Windows GitHub Actions runner using the .NET 10 SDK. It restores and builds the x64 WinUI app for changes to `windows/`, the workflow, or project docs.

On a Windows development machine with the .NET 10 SDK and Windows App SDK prerequisites available:

```powershell
dotnet restore windows/VibeFlix.Windows/VibeFlix.Windows.csproj -p:Platform=x64
dotnet build windows/VibeFlix.Windows/VibeFlix.Windows.csproj --configuration Release --no-restore -p:Platform=x64
```

After a successful build, manually check that the window launches, the sidebar and hero buttons work with both mouse and keyboard, focus remains visible while tabbing, and each sidebar selection opens the correct placeholder screen. This scaffold does not yet produce an installer or a release package.
