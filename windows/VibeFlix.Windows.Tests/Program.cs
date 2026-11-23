using VibeFlix.Windows.Models;
using VibeFlix.Windows.Services;

var root = Path.Combine(Path.GetTempPath(), "VibeFlix.LocalLibraryStoreTests", Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);

try
{
    VerifyEpisodeProgressIsIndependentAndPersistent(root);
    VerifyEpisodeAndTitleCompletion(root);
    VerifyLegacyProgressLoads(root);
    VerifyCatalogTitlePersistence(root);
    Console.WriteLine("LocalLibraryStore tests passed.");
}
finally
{
    Directory.Delete(root, recursive: true);
}

static void VerifyEpisodeProgressIsIndependentAndPersistent(string root)
{
    var directory = Path.Combine(root, "episodes");
    var store = new LocalLibraryStore(directory);
    store.SavePlaybackProgress("series", "S01E01", 30_000, 100_000, titleCompleted: false);
    store.SavePlaybackProgress("series", "S01E01", 40_000, 100_000, titleCompleted: false);
    store.SavePlaybackProgress("series", "S01E02", 10_000, 60_000, titleCompleted: false);

    var entries = store.GetContinueWatching();
    Check(entries.Count == 2, "Saving another checkpoint should replace only the matching episode.");
    var firstEpisode = store.GetProgress("series", "S01E01")
        ?? throw new InvalidOperationException("The first episode resume entry is missing.");
    var secondEpisode = store.GetProgress("series", "S01E02");
    Check(firstEpisode is { PositionMilliseconds: 40_000, DurationMilliseconds: 100_000, Percent: 40, IsPreviewMarker: false },
        "The latest first-episode position should be stored with its duration and percentage.");
    Check(secondEpisode is { PositionMilliseconds: 10_000, DurationMilliseconds: 60_000, Percent: 17 },
        "A second episode should have an independent position and percentage.");

    firstEpisode.Percent = 99;
    firstEpisode.EpisodeKey = "mutated-copy";
    Check(store.GetProgress("series", "S01E01") is { Percent: 40, EpisodeKey: "S01E01" },
        "Progress queries should return copies rather than mutable store entries.");

    var json = File.ReadAllText(store.StorageLocation);
    Check(!json.Contains("FilePath", StringComparison.OrdinalIgnoreCase)
        && !json.Contains("StorageFile", StringComparison.OrdinalIgnoreCase),
        "The local library must not persist a media file path or StorageFile reference.");

    var reloaded = new LocalLibraryStore(directory);
    Check(reloaded.GetContinueWatching().Count == 2
        && reloaded.GetProgress("series", "S01E01") is { PositionMilliseconds: 40_000 }
        && reloaded.GetProgress("series", "S01E02") is { PositionMilliseconds: 10_000 },
        "Per-episode positions should survive reloading the JSON library.");

    reloaded.RemoveFromContinueWatching("series", "S01E01");
    Check(reloaded.GetProgress("series", "S01E01") is null
        && reloaded.GetProgress("series", "S01E02") is not null,
        "Removing one resume marker should leave other episode positions intact.");
}

static void VerifyEpisodeAndTitleCompletion(string root)
{
    var store = new LocalLibraryStore(Path.Combine(root, "completion"));
    store.SavePlaybackProgress("series", "S01E01", 20_000, 100_000, titleCompleted: false);
    store.SavePlaybackProgress("series", "S01E02", 95_000, 100_000, titleCompleted: false);
    Check(store.GetProgress("series", "S01E02") is null
        && store.GetProgress("series", "S01E01") is not null
        && store.GetHistory().Count == 0,
        "Completing a non-final episode should clear only its resume marker, not mark the title watched.");

    store.SavePlaybackProgress("series", "S01E02", 95_000, 100_000, titleCompleted: true);
    Check(store.GetContinueWatching().Count == 0
        && store.GetHistory().Count == 1
        && store.GetHistory()[0].TitleId == "series",
        "Completing the title should clear its progress and add one History entry.");

    store.SavePlaybackProgress("movie", null, 96_000, 100_000, titleCompleted: true);
    Check(store.GetProgress("movie", string.Empty) is null
        && store.GetHistory().Any(entry => entry.TitleId == "movie"),
        "Completing a movie should add History without leaving a resume marker.");
}

static void VerifyLegacyProgressLoads(string root)
{
    var directory = Path.Combine(root, "legacy");
    Directory.CreateDirectory(directory);
    File.WriteAllText(
        Path.Combine(directory, "library.json"),
        "{\"Progress\":[{\"TitleId\":\"legacy\",\"Percent\":35,\"IsPreviewMarker\":true}]}");

    var store = new LocalLibraryStore(directory);
    Check(store.GetProgress("legacy", null) is { EpisodeKey: "", Percent: 35, IsPreviewMarker: true },
        "Existing progress entries without episode keys should remain readable.");
}

static void VerifyCatalogTitlePersistence(string root)
{
    var directory = Path.Combine(root, "catalog-title");
    var store = new LocalLibraryStore(directory);
    var genres = new List<string> { "Drama", "Mystery" };
    var title = new CatalogTitle(
        Id: "server1-series-example",
        Name: "The Indigo Thread",
        Kind: "Series",
        Year: 2025,
        Rating: string.Empty,
        RuntimeMinutes: 0,
        Synopsis: "A catalog synopsis.",
        Language: "English",
        Source: "Server 1",
        Genres: genres,
        AccentStart: "#343434",
        AccentEnd: "#161616",
        Seasons: [new MediaSeason(1, [new MediaEpisode(1, "Pilot", "", 0, "/series/example/s-1/ep-1")], "/series/example/s-1/ep-1")],
        CatalogPath: "/series/example",
        PosterUrl: "https://play4u.org/assets/example.jpg");

    store.UpsertTitle(title);
    var rejectedStreamPath = false;
    try
    {
        store.UpsertTitle(title with { CatalogPath = "/stream/example.m3u8" });
    }
    catch (ArgumentException)
    {
        rejectedStreamPath = true;
    }

    Check(rejectedStreamPath, "Only known provider catalog page paths may be cached as title metadata.");
    genres[0] = "Mutated source list";
    var cachedTitle = store.GetKnownTitles().Single();
    Check(cachedTitle.Name == title.Name && cachedTitle.Genres[0] == "Drama"
        && cachedTitle.Seasons[0].Episodes[0].CatalogPath == "/series/example/s-1/ep-1",
        "Known provider titles should persist metadata as defensive copies.");

    var reloaded = new LocalLibraryStore(directory);
    Check(reloaded.IsKnownTitle(title.Id)
        && reloaded.GetKnownTitles().Single().CatalogPath == title.CatalogPath,
        "Known provider metadata should survive reloading the local library.");
    var json = File.ReadAllText(reloaded.StorageLocation);
    Check(!json.Contains(".m3u8", StringComparison.OrdinalIgnoreCase)
        && !json.Contains("seed=", StringComparison.OrdinalIgnoreCase),
        "The local library must not persist resolved stream addresses or seed values.");

    reloaded.ClearLibrary();
    Check(reloaded.GetKnownTitles().Count == 0 && !reloaded.IsKnownTitle(title.Id),
        "Clearing the local library should also remove cached provider title metadata.");
}

static void Check(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}
