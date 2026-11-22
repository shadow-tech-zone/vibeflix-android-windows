using System.Text.Json;

namespace VibeFlix.Windows.Services;

/// <summary>
/// Small local-only store for the Windows UI milestone. It holds library identifiers and
/// user-created preview state only; no provider credentials, stream URLs, or cloud sync.
/// </summary>
public sealed class LocalLibraryStore
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private readonly string _directory;
    private readonly string _filePath;
    private readonly object _gate = new();
    private LibraryState _state;

    public LocalLibraryStore()
    {
        _directory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "VibeFlix");
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
            return _state.Progress.OrderByDescending(entry => entry.UpdatedAt).ToArray();
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
    /// Writes an explicitly labelled sample progress marker to exercise the resume UI.
    /// It does not represent media playback and must not be reported as real watch progress.
    /// </summary>
    public void AddPreviewProgress(string titleId, int percent)
    {
        lock (_gate)
        {
            _state.Progress.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
            _state.Progress.Insert(0, new ProgressEntry
            {
                TitleId = titleId,
                Percent = Math.Clamp(percent, 1, 94),
                UpdatedAt = DateTimeOffset.UtcNow,
                IsPreviewMarker = true
            });
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

    public void RemoveFromHistory(string titleId)
    {
        lock (_gate)
        {
            _state.History.RemoveAll(entry => string.Equals(entry.TitleId, titleId, StringComparison.Ordinal));
            SaveState();
        }
    }

    public void ClearHistory()
    {
        lock (_gate)
        {
            _state.History.Clear();
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
            return state;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or JsonException)
        {
            // Keep the app usable if a previous local write was interrupted or the file is invalid.
            return new LibraryState();
        }
    }

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
    public int Percent { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public bool IsPreviewMarker { get; set; }
}
