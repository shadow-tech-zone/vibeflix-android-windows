namespace VibeFlix.Windows.Models;

/// <summary>
/// UI-facing metadata adapted from the same catalog entries used by the Android client.
/// Catalog paths identify provider pages only; they are never playable stream URLs.
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
        IReadOnlyList<MediaSeason>? Seasons = null,
        string CatalogPath = "",
        string PosterUrl = "")
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
        this.Genres = Array.AsReadOnly((Genres ?? Array.Empty<string>()).ToArray());
        this.AccentStart = AccentStart;
        this.AccentEnd = AccentEnd;
        this.IsNew = IsNew;
        this.Seasons = Array.AsReadOnly((Seasons ?? Array.Empty<MediaSeason>()).ToArray());
        this.CatalogPath = CatalogPath;
        this.PosterUrl = PosterUrl;
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
    public string CatalogPath { get; init; }
    public string PosterUrl { get; init; }

    public bool IsSeries => string.Equals(Kind, "Series", StringComparison.OrdinalIgnoreCase);

    public string RuntimeLabel => RuntimeMinutes > 0
        ? $"{RuntimeMinutes} min"
        : IsSeries ? "Series" : "Movie";

    public string CardMetadata => string.Join("  ·  ", new[]
    {
        Year > 0 ? Year.ToString() : string.Empty,
        Kind,
        Source
    }.Where(part => !string.IsNullOrWhiteSpace(part)));
}

public sealed record MediaSeason(
    int Number,
    IReadOnlyList<MediaEpisode> Episodes,
    string Path = "",
    string Name = "")
{
    public string Label => !string.IsNullOrWhiteSpace(Name)
        ? $"{Name}  ·  {Episodes.Count} episodes"
        : $"Season {Number}  ·  {Episodes.Count} episodes";
}

/// <summary>
/// Episode metadata from a provider. Its catalog path identifies an episode page, never a stream.
/// </summary>
public sealed record MediaEpisode(
    int Number,
    string Name,
    string Synopsis,
    int RuntimeMinutes,
    string CatalogPath = "",
    string ThumbnailUrl = "");
