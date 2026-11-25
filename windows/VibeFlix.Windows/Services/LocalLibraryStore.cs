using System.Text.Json;
using System.Text.RegularExpressions;
using VibeFlix.Windows.Models;

namespace VibeFlix.Windows.Services;

/// <summary>
/// Local-only Windows library store. It holds library identifiers and playback positions, but
/// never persists media paths, provider credentials, stream URLs, or cloud-synced data.
/// </summary>
public sealed class LocalLibraryStore
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private readonly string _directory;
    private readonly string _filePath;
    private readonly object _gate = new();
    private LibraryState _state;

    public LocalLibraryStore()
        : this(Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "VibeFlix"))
    {
    }

    internal LocalLibraryStore(string directory)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(directory);
        _directory = directory;
        _filePath = Path.Combine(_directory, "library.json");
        _state = ReadState();
    }

    public string StorageLocation => _filePath;

    public bool IsSaved(string titleId)
    {
        lock (_gate)
        {
            return _state.MyList.Contains(titleId, StringComparer.Ordinal);
        }
    }

    public IReadOnlyList<string> GetMyListIds()
    {
        lock (_gate)
        {
            return _state.MyList.ToArray();
        }
    }

    public bool IsKnownTitle(string titleId)
    {
        lock (_gate)
        {
            return _state.Titles.Any(title => string.Equals(title.Id, titleId, StringComparison.Ordinal));
        }
    }

    public IReadOnlyList<CatalogTitle> GetKnownTitles()
    {
        lock (_gate)
        {
            return _state.Titles.Select(CloneTitle).ToArray();
        }
    }

    public void UpsertTitle(CatalogTitle title)
    {
        ArgumentNullException.ThrowIfNull(title);
        if (string.IsNullOrWhiteSpace(title.Id) || string.IsNullOrWhiteSpace(title.Name)
            || !IsValidCatalogPath(title.Source, title.CatalogPath))
        {
            throw new ArgumentException("Only provider catalog metadata can be saved.", nameof(title));
        }

        lock (_gate)
        {
            _state.Titles.RemoveAll(existing => string.Equals(existing.Id, title.Id, StringComparison.Ordinal));
            _state.Titles.Insert(0, CloneTitle(title));
            SaveState();
        }
    }

    public IReadOnlyList<HistoryEntry> GetHistory()
    {
        lock (_gate)
        {
            return _state.History.OrderByDescending(entry => entry.WatchedAt).ToArray();
        }
    }

    public IReadOnlyList<ProgressEntry> GetContinueWatching()
    {
        lock (_gate)
        {
            return _state.Progress
                .OrderByDescending(entry => entry.UpdatedAt)
                .Select(CloneProgress)
                .ToArray();
        }
    }

    public ProgressEntry? GetProgress(string titleId, string? episodeKey)
    {
        var normalizedEpisodeKey = episodeKey ?? string.Empty;
        lock (_gate)
        {
            var entry = _state.Progress.FirstOrDefault(progress =>
                string.Equals(progress.TitleId, titleId, StringComparison.Ordinal)
                && string.Equals(progress.EpisodeKey, normalizedEpisodeKey, StringComparison.Ordinal));
            return entry is null ? null : CloneProgress(entry);
        }
    }

    public void ToggleMyList(string titleId)
    {
        lock (_gate)
        {
            if (_state.MyList.RemoveAll(id => string.Equals(id, titleId, StringComparison.Ordinal)) == 0)
            {
                _state.MyList.Insert(0, titleId);
            }

            SaveState();
        }
    }

    public void MarkWatched(string titleId)
    {
        lock (_gate)
        {
            _state.History.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
            _state.History.Insert(0, new HistoryEntry { TitleId = titleId, WatchedAt = DateTimeOffset.UtcNow });
            _state.Progress.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
            SaveState();
        }
    }

    /// <summary>
    /// Persists provider playback progress by title and episode. Resolved stream URLs, headers,
    /// provider credentials, and media paths are deliberately never stored.
    /// </summary>
    public void SavePlaybackProgress(
        string titleId,
        string? episodeKey,
        long positionMilliseconds,
        long durationMilliseconds,
        bool titleCompleted)
    {
        var normalizedEpisodeKey = episodeKey ?? string.Empty;
        var position = Math.Max(0, positionMilliseconds);
        var duration = Math.Max(0, durationMilliseconds);
        var percent = duration == 0
            ? 0
            : (int)Math.Clamp(Math.Round(position * 100d / duration), 0d, 100d);
        var completed = duration > 0 && position / (double)duration >= 0.95;

        lock (_gate)
        {
            _state.Progress.RemoveAll(entry =>
                string.Equals(entry.TitleId, titleId, StringComparison.Ordinal)
                && (entry.IsPreviewMarker
                    || string.Equals(entry.EpisodeKey, normalizedEpisodeKey, StringComparison.Ordinal)));

            if (completed)
            {
                if (titleCompleted)
                {
                    _state.Progress.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
                    _state.History.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
                    _state.History.Insert(0, new HistoryEntry
                    {
                        TitleId = titleId,
                        WatchedAt = DateTimeOffset.UtcNow
                    });
                }
            }
            else if (position > 0)
            {
                _state.Progress.Insert(0, new ProgressEntry
                {
                    TitleId = titleId,
                    EpisodeKey = normalizedEpisodeKey,
                    PositionMilliseconds = position,
                    DurationMilliseconds = duration,
                    Percent = percent,
                    UpdatedAt = DateTimeOffset.UtcNow,
                    IsPreviewMarker = false
                });
            }

            SaveState();
        }
    }

    public void RemoveFromContinueWatching(string titleId)
    {
        lock (_gate)
        {
            _state.Progress.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
            SaveState();
        }
    }

    public void RemoveFromContinueWatching(string titleId, string? episodeKey)
    {
        var normalizedEpisodeKey = episodeKey ?? string.Empty;
        lock (_gate)
        {
            _state.Progress.RemoveAll(entry =>
                string.Equals(entry.TitleId, titleId, StringComparison.Ordinal)
                && string.Equals(entry.EpisodeKey, normalizedEpisodeKey, StringComparison.Ordinal));
            SaveState();
        }
    }

    public void RemoveFromHistory(string titleId)
    {
        lock (_gate)
        {
            _state.History.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
            _state.Progress.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
            SaveState();
        }
    }

    public void ClearHistory()
    {
        lock (_gate)
        {
            var clearedTitleIds = _state.History
                .Select(entry => entry.TitleId)
                .ToHashSet(StringComparer.Ordinal);
            _state.History.Clear();
            _state.Progress.RemoveAll(entry => clearedTitleIds.Contains(entry.TitleId));
            SaveState();
        }
    }

    public void ClearLibrary()
    {
        lock (_gate)
        {
            _state = new LibraryState();
            SaveState();
        }
    }

    private LibraryState ReadState()
    {
        try
        {
            if (!File.Exists(_filePath))
            {
                return new LibraryState();
            }

            var state = JsonSerializer.Deserialize<LibraryState>(File.ReadAllText(_filePath), JsonOptions)
                ?? new LibraryState();
            state.MyList ??= [];
            state.History ??= [];
            state.Progress ??= [];
            state.Titles ??= [];
            state.Titles = state.Titles
                .Where(title => title is not null && IsValidCatalogPath(title.Source, title.CatalogPath))
                .ToList();
            foreach (var progress in state.Progress)
            {
                progress.EpisodeKey ??= string.Empty;
            }

            return state;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or JsonException)
        {
            // Keep the app usable if a previous local write was interrupted or the file is invalid.
            return new LibraryState();
        }
    }

    private static bool IsValidCatalogPath(string source, string catalogPath)
    {
        if (string.IsNullOrWhiteSpace(catalogPath))
        {
            return false;
        }

        return source switch
        {
            "Server 1" => Regex.IsMatch(catalogPath, @"^/(watch|series)/[A-Za-z0-9._~-]{1,200}$", RegexOptions.CultureInvariant),
            "Server 2" => Regex.IsMatch(catalogPath, @"^/(movie|tv)/[0-9]{1,12}$", RegexOptions.CultureInvariant),
            _ => false
        };
    }

    private static CatalogTitle CloneTitle(CatalogTitle title) => new(
        Id: title.Id,
        Name: title.Name,
        Kind: title.Kind,
        Year: title.Year,
        Rating: title.Rating,
        RuntimeMinutes: title.RuntimeMinutes,
        Synopsis: title.Synopsis,
        Language: title.Language,
        Source: title.Source,
        Genres: title.Genres.ToArray(),
        AccentStart: title.AccentStart,
        AccentEnd: title.AccentEnd,
        IsNew: title.IsNew,
        Seasons: title.Seasons.Select(season => new MediaSeason(
            season.Number,
            season.Episodes.Select(episode => episode with { }).ToArray(),
            season.Path,
            season.Name)).ToArray(),
        CatalogPath: title.CatalogPath,
        PosterUrl: title.PosterUrl);

    private static ProgressEntry CloneProgress(ProgressEntry entry) => new()
    {
        TitleId = entry.TitleId,
        EpisodeKey = entry.EpisodeKey,
        PositionMilliseconds = entry.PositionMilliseconds,
        DurationMilliseconds = entry.DurationMilliseconds,
        Percent = entry.Percent,
        UpdatedAt = entry.UpdatedAt,
        IsPreviewMarker = entry.IsPreviewMarker
    };

    private void SaveState()
    {
        Directory.CreateDirectory(_directory);
        var tempPath = _filePath + ".tmp";
        File.WriteAllText(tempPath, JsonSerializer.Serialize(_state, JsonOptions));
        File.Move(tempPath, _filePath, overwrite: true);
    }

    public sealed class LibraryState
    {
        public LibraryState() { }

        public List<string> MyList { get; set; } = [];
        public List<HistoryEntry> History { get; set; } = [];
        public List<ProgressEntry> Progress { get; set; } = [];
        public List<CatalogTitle> Titles { get; set; } = [];
    }
}

public sealed class HistoryEntry
{
    public string TitleId { get; set; } = string.Empty;
    public DateTimeOffset WatchedAt { get; set; }
}

public sealed class ProgressEntry
{
    public string TitleId { get; set; } = string.Empty;
    public string EpisodeKey { get; set; } = string.Empty;
    public long PositionMilliseconds { get; set; }
    public long DurationMilliseconds { get; set; }
    public int Percent { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public bool IsPreviewMarker { get; set; }
}
