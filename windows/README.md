# Windows client

VibeFlix Windows is a native WinUI 3 desktop app. It does not revive the removed WPF prototype and does not reuse Android's Media3 player. The sample catalogue remains fictional and is never presented as a provider catalogue. The current playback slice opens user-selected local media through `Windows.Media.Playback`; no provider stream, credential, or media path is invented or persisted.

## Project layout

- `VibeFlix.sln` — Visual Studio solution for the Windows client.
- `VibeFlix.Windows/` — WinUI 3 app targeting .NET 10 and Windows App SDK 2.7.0.
- `VibeFlix.Windows/MainWindow.xaml` and `MainWindow*.cs` — desktop shell, catalogue/library views, local-player dialog, and keyboard/mouse controls.
- `VibeFlix.Windows/Models/` and `Services/DemoCatalog.cs` — fictional sample metadata only; no provider catalogue or media is bundled.
- `VibeFlix.Windows/Services/LocalLibraryStore.cs` — local JSON persistence for My List, History, and per-title/per-episode playback positions. It never saves the selected file path.
- `VibeFlix.Windows/Services/WindowsPlaybackService.cs` — a separate `Windows.Media.Playback.MediaPlayer` service for local `StorageFile` playback. It has no URI/stream resolver.

## Local playback behavior

- From a title or episode, choose **Play a local video**. Windows opens a file picker; select a file you are authorized to play. The demo catalogue contains no playable media, and the app does not upload or copy the selected file.
- Play/Pause and the seek slider use the Windows media playback session. Movie progress and episode progress are stored locally, keyed by catalogue title and stable season/episode key. Progress is checkpointed during playback and on pause, seek, and player close. Reaching 95% removes that resume marker; a movie or a series' final episode is added to local History.
- The selected `StorageFile` is cached only in memory for the current app session so previous/next episode navigation can reuse an already selected file. It is discarded when the app closes. After restarting, resume asks the user to choose the same local file again; this is intentional so paths and permissions are not persisted.
- Previous/next episode navigation opens a file picker for episodes without an in-session file selection. Each episode has its own local resume position.
- Captions default to **Off**. The caption picker lists only caption/subtitle timed-metadata tracks supplied by the selected media file. Selecting a track requests `TimedMetadataTrackPresentationMode.PlatformPresented`; no sample text is displayed or treated as captions. Audio-track selection and external sidecar-caption import are not part of this slice.
- Supported containers and codecs depend on the installed Windows media components. The picker includes common video extensions, but an extension does not guarantee that Windows can decode a file.

No authorized test media is bundled. For playback checks, use a local video file that you own or otherwise have permission to use; to check captions, use a file with an embedded timed-text track. The app does not contact a media provider.

## Remaining scope

Server 1 / Server 2 catalogue adapters, provider authentication and stream resolution, real audio-track selection, external caption-file import, optional cloud sync, and release packaging are later work. Keep sync local-first and explicitly opt-in if it is added. Never sync playback URLs, file paths, or provider credentials.

## UX research gate

The source-based research and original VibeFlix design direction are in [`UX-RESEARCH.md`](UX-RESEARCH.md). The current US and Pakistan Microsoft Store listings identify Netflix, Inc.'s Windows product as a web-based app that auto-updates; Netflix Help says Edge must be installed and that Windows downloads are no longer supported. The current Store pages did not expose a build number or inspectable screenshots, and this workspace has no Windows desktop session, so Netflix's actual current screens and resize behavior remain unverified. The first VibeFlix UI is based on documented interaction lessons and original styling—not a claim of hands-on Netflix benchmarking. Before visual polish is treated as final, inspect the latest Store build (or review captures from it) across Home, navigation, search/categories, title details, My List, Continue Watching, local playback, keyboard/mouse, and window sizes. Do not copy Netflix branding, icons, artwork, or screens pixel-for-pixel.

## Build and verification

This workspace has no local .NET/Windows build tools, so a native Windows compilation cannot be run here. `.github/workflows/build-windows.yml` runs the local progress-store smoke tests and compiles the app on a Windows GitHub Actions runner using the .NET 10 SDK. It restores and builds the x64 WinUI app for changes to `windows/`, the workflow, or project docs.

On a Windows development machine with the .NET 10 SDK and Windows App SDK prerequisites available:

```powershell
dotnet run --project windows/VibeFlix.Windows.Tests/VibeFlix.Windows.Tests.csproj --configuration Release
dotnet restore windows/VibeFlix.Windows/VibeFlix.Windows.csproj -p:Platform=x64
dotnet build windows/VibeFlix.Windows/VibeFlix.Windows.csproj --configuration Release --no-restore -p:Platform=x64
```

After a successful build, manually verify that the window launches; a local video opens and plays; Play/Pause and seeking work; choosing a real embedded timed-text track displays that track while **Off** remains the default; episodes navigate and maintain separate resume positions; and resuming after relaunch prompts for the local file again. Inspect the local JSON file to confirm it stores episode keys/positions but not media paths. Also check keyboard/mouse focus and compact/wide window layouts. CI compilation cannot verify Windows playback, codec availability, track rendering, or file-picker behavior. This prototype does not yet produce an installer or release package.
