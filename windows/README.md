# Windows client

VibeFlix Windows is a native WinUI 3 desktop app targeting .NET 10 and Windows App SDK 2.7. It uses the same Server 1 and Server 2 catalog resources as the Android client; catalog page paths are identifiers, not playable stream URLs. A stream is resolved only after the user chooses **Play**, then passed to the Windows-native media player. Stream addresses, provider headers, and credentials are not saved to disk.

The original VibeFlix interface uses a compact brand/navigation/search/source header, a cinematic feature area, category controls, and horizontal poster-first title shelves. Portrait cards reveal a compact synopsis preview on pointer hover and keyboard focus; title details and My List remain available without hover. The header reflows navigation beneath the search/source row below 900 effective pixels; title details stack the poster above the actions below 680 pixels. Page gutters, shelf cards, grids, the hero, and the open details/player dialog adapt to window resizing. Controls use system focus visuals and keyboard-accessible actions, with no hover-only functionality. These are VibeFlix design choices, not claims about Netflix's exact Windows UI. The included generated artwork is design/placeholder art, not catalog content or playable media.

## Project layout

- `VibeFlix.sln` — Visual Studio solution for the Windows client.
- `VibeFlix.Windows/` — WinUI 3 app targeting .NET 10 and Windows App SDK 2.7.0.
- `VibeFlix.Windows/MainWindow.xaml` and `MainWindow*.cs` — desktop shell, catalog/library views, title details, episode selection, and provider playback UI.
- `VibeFlix.Windows/Models/` — catalog title, season, episode, and provider-page metadata.
- `VibeFlix.Windows/Services/CatalogSourceService.cs` — Server 1 / Server 2 catalog, details, season, and episode requests.
- `VibeFlix.Windows/Services/ProviderPlaybackService.cs` — on-demand provider stream resolution. Resolved media addresses are held in memory only.
- `VibeFlix.Windows/Services/WindowsPlaybackService.cs` — Windows `MediaPlayer` wrapper for provider-resolved HLS and MP4 sources.
- `VibeFlix.Windows/Services/LocalLibraryStore.cs` — local JSON persistence for My List, History, known provider title metadata, and per-title/per-episode progress. It does not save stream URLs, provider headers/credentials, or media paths.
- `VibeFlix.Windows/Assets/*.png` — original generated VibeFlix artwork; these files are not provider posters or media.
- `VibeFlix.Windows.Tests/` — dependency-free smoke tests for library progress, metadata persistence, legacy JSON compatibility, and clearing local data.

## Catalog and playback behavior

- Browse and search the available Server 1 and Server 2 catalogs, with a source selector, categories, and pagination where the selected provider exposes them. Provider availability and content can vary by region and over time; an unavailable provider is reported in the UI.
- Selecting a title loads provider metadata. Series seasons and episode lists are loaded from the relevant provider resources when needed. Choosing an episode highlights it and updates the **Play selected episode** action; browsing the episode list does not start playback by itself. Resume actions continue directly from the saved position where the stream supports seeking.
- Choosing **Play** resolves the selected provider page into supported HTTPS HLS or MP4 candidates. For adaptive HLS, Windows receives provider request headers through its adaptive-streaming client. The app does not derive a stream URL from a catalog path or persist a resolved stream address.
- A provider may be unavailable, restrict a request, change its response format, or return media Windows cannot play. In those cases, playback can fail even when catalog browsing works. Server 2 may return multiple candidates; **Try another stream** allows trying another candidate.
- The Windows player exposes the platform's transport controls. Resume positions are stored per title and, for series, per stable season/episode key. Progress is checkpointed during playback and when the details/player dialog closes. A completed movie or final series episode is added to local History; completing a non-final episode only clears that episode's resume marker.
- Captions/audio track availability depends on the provider stream and Windows media support. No stream format, codec, subtitle track, or provider uptime is guaranteed by the app.
- My List, History, title metadata, and resume positions are local to this Windows device. Windows Supabase authentication/cloud library sync is not implemented. Android's manual sync behavior is not changed.

Use the app only with provider content you are authorized to access. No playable media is bundled, and no media file picker is part of the provider playback flow.

## UX research and visual direction

The source-based research and original VibeFlix direction are in [`UX-RESEARCH.md`](UX-RESEARCH.md). The current Netflix Windows product form is described by its Store listing as a web-based app, and Netflix Help documents Windows/computer workflows; this workspace has no Windows desktop session, so the installed product's exact current screens, version, and resize behavior remain unverified. The attached `gemini-code-1795349551770.md` was reviewed as a secondary visual summary, not as an official Figma file or verified screenshot set. Only broad dark-canvas, restrained-accent, and desktop-usability ideas are treated as adaptable; its implementation suggestions and unverified product claims are not copied into the native WinUI app. VibeFlix keeps its own identity and does not claim a pixel-level Netflix reproduction.

Before visual polish is considered final, review the running app on Windows at compact and wide window sizes. Check catalog loading/errors, title details, My List, Continue Watching, episode selection, native player controls, keyboard/focus behavior, and accessibility names. CI compilation cannot verify provider availability, stream formats, codecs, captions, or runtime playback behavior.

## Build and verification

This workspace has no local .NET/Windows build tools, so native compilation must be checked on a Windows runner. `.github/workflows/build-windows.yml` runs the local-library smoke tests, builds the app on a Windows GitHub Actions runner using the .NET 10 SDK, and uploads a short-lived x64 test-build artifact after a successful build. Download it from the latest successful **Build Windows client** run's **Artifacts** section. The ZIP is an unpackaged test bundle, not an installer; extract the entire folder and keep its files together.

On a Windows development machine with the .NET 10 SDK and Windows App SDK prerequisites available:

```powershell
dotnet run --project windows/VibeFlix.Windows.Tests/VibeFlix.Windows.Tests.csproj --configuration Release
dotnet restore windows/VibeFlix.Windows/VibeFlix.Windows.csproj -p:Platform=x64
dotnet build windows/VibeFlix.Windows/VibeFlix.Windows.csproj --configuration Release --no-restore -p:Platform=x64
```

For a runtime check, browse provider catalogs while online, open details and seasons, and try playback only with content you are authorized to access. Confirm that an unsupported/offline stream produces a clear error, another candidate can be tried where available, resume positions remain episode-specific, and the local JSON file does not contain a stream address or provider credential. Windows CI compilation alone cannot validate provider responses or live playback. This prototype does not yet produce an installer or release package.
