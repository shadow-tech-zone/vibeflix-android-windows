# Windows client

VibeFlix Windows is a fresh native WinUI 3 desktop app. It does not revive the removed WPF prototype and does not reuse Android's Media3 player. The current milestone is an original desktop-first prototype with a local sample catalogue, responsive browse/search UI, Server 1/Server 2/Both Servers filters, genres, My List, History, Continue Watching preview state, title details, season/episode selection, and a clearly non-playing player preview. Sample library actions persist locally. Provider catalogue access, real stream playback, sign-in, cloud sync, and release packaging are not connected yet.

## Project layout

- `VibeFlix.sln` — Visual Studio solution for the Windows client.
- `VibeFlix.Windows/` — WinUI 3 app targeting .NET 10 and Windows App SDK 2.7.0.
- `VibeFlix.Windows/MainWindow.xaml` and `MainWindow*.cs` — native desktop shell, dynamic browse/library views, title details, search/filter interactions, and keyboard/mouse accessible controls. Standard Tab/Shift+Tab focus and Enter/Space activation use WinUI controls.
- `VibeFlix.Windows/Models/` and `Services/DemoCatalog.cs` — fictional sample titles used only to exercise the first UI milestone; no Netflix/provider artwork or catalog data is bundled.
- `VibeFlix.Windows/Services/LocalLibraryStore.cs` — local JSON persistence for My List, History, and explicitly labelled sample resume markers. No account or network sync is performed.
- `VibeFlix.Windows/Services/WindowsPlaybackService.cs` — separate `Windows.Media.Playback.MediaPlayer` foundation. It accepts absolute HTTP(S) media URIs only; provider catalog lookup, stream resolution, and actual playback UI are not connected yet.

The prototype exercises the core desktop workflows—Server 1 / Server 2 / Both Servers filtering, search and genres, local My List and History, sample Continue Watching markers, season selection, and previous/next episode navigation—without copying Android's phone layouts. Its CC control only previews fictional, untimed sample text; it is not a subtitle track. Real provider browsing, stream playback, timed captions/audio selection, full-screen controls, and cloud sync remain unimplemented. Keep the design desktop-first, resize-aware, keyboard/mouse accessible, and independent of Android Media3 as those integrations are added.

## UX research gate

The source-based research and original VibeFlix design direction are in [`UX-RESEARCH.md`](UX-RESEARCH.md). The current US and Pakistan Microsoft Store listings identify Netflix, Inc.'s Windows product as a web-based app that auto-updates; Netflix Help says Edge must be installed and that Windows downloads are no longer supported. The current Store pages did not expose a build number or inspectable screenshots, and this workspace has no Windows desktop session, so Netflix's actual current screens and resize behavior remain unverified. The first VibeFlix UI milestone is therefore based on documented interaction lessons and original styling—not a claim of hands-on Netflix benchmarking. Before visual polish is treated as final, inspect the latest Store build (or review captures from it) across Home, navigation, search/categories, title details, My List, Continue Watching, playback, keyboard/mouse, and window sizes. Do not copy Netflix branding, icons, artwork, or screens pixel-for-pixel.

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

After a successful build, manually check that the window launches; the source selector, genres, search, My List, History, resume markers, season selection, and previous/next episode flow work with mouse and keyboard; the sample CC switch starts off and only shows explicitly labelled untimed preview text; focus remains visible while tabbing; and navigation/cards reflow at compact and wide window sizes. The player preview must remain clearly labelled as non-playing until a real stream source is connected. This prototype does not yet produce an installer or release package.
