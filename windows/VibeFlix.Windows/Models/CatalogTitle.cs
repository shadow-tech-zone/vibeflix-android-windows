namespace VibeFlix.Windows.Models;

/// <summary>
/// UI-facing title metadata. The Windows preview uses fictional sample entries and keeps
/// provider records and playable stream addresses out of the desktop shell.
/// </summary>
public sealed record CatalogTitle
{
    public CatalogTitle(
        string Id,
        string Name,
        string Kind,
        int Year,
        string Rating,
        int RuntimeMinutes,
        string Synopsis,
        string Language,
        string Source,
        IReadOnlyList<string> Genres,
        string AccentStart,
        string AccentEnd,
        bool IsNew = false,
        IReadOnlyList<MediaSeason>? Seasons = null)
    {
        this.Id = Id;
        this.Name = Name;
        this.Kind = Kind;
        this.Year = Year;
        this.Rating = Rating;
        this.RuntimeMinutes = RuntimeMinutes;
        this.Synopsis = Synopsis;
        this.Language = Language;
        this.Source = Source;
        this.Genres = Genres;
        this.AccentStart = AccentStart;
        this.AccentEnd = AccentEnd;
        this.IsNew = IsNew;
        this.Seasons = Seasons ?? Array.Empty<MediaSeason>();
    }

    public string Id { get; init; }
    public string Name { get; init; }
    public string Kind { get; init; }
    public int Year { get; init; }
    public string Rating { get; init; }
    public int RuntimeMinutes { get; init; }
    public string Synopsis { get; init; }
    public string Language { get; init; }
    public string Source { get; init; }
    public IReadOnlyList<string> Genres { get; init; }
    public bool IsNew { get; init; }
    public string AccentStart { get; init; }
    public string AccentEnd { get; init; }
    public IReadOnlyList<MediaSeason> Seasons { get; init; }

    public bool IsSeries => string.Equals(Kind, "Series", StringComparison.OrdinalIgnoreCase);

    public string RuntimeLabel => IsSeries ? "Series" : $"{RuntimeMinutes} min";

    public string CardMetadata => $"{Year}  ·  {Kind}  ·  {Source}";
}

public sealed record MediaSeason(int Number, IReadOnlyList<MediaEpisode> Episodes)
{
    public string Label => $"Season {Number}  ·  {Episodes.Count} episodes";
}

/// <summary>
/// Episode metadata for navigation and layout previews. CaptionPreview is fictional sample
/// text only; it is never treated as a timed subtitle track.
/// </summary>
public sealed record MediaEpisode(
    int Number,
    string Name,
    string Synopsis,
    int RuntimeMinutes,
    string? CaptionPreview = null);
