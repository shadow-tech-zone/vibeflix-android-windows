using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using VibeFlix.Windows.Models;

namespace VibeFlix.Windows.Services;

/// <summary>
/// Windows adapter for the same Server 1 and Server 2 catalog/detail resources used by Android.
/// Catalog and episode paths are provider page identifiers, never playable stream URLs.
/// </summary>
public sealed class CatalogSourceService : IDisposable
{
    private static readonly Uri Play4uRoot = new("https://play4u.org/");
    private static readonly Uri MovyRoot = new("https://www.movy.sx/");
    private static readonly Uri MovyMetadataRoot = new("https://db.wecollege.net/3/");
    private static readonly Uri MovyWebsiteRoot = new("https://www.movy.sx/");
    private const string AndroidUserAgent = "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
    private const int PageSize = 24;
    private const int MaximumPages = 500;

    private readonly HttpClient _httpClient;
    private IReadOnlyList<CatalogCategory>? _server1Categories;
    private bool _disposed;

    public CatalogSourceService()
    {
        var handler = new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate | DecompressionMethods.Brotli
        };
        _httpClient = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(20)
        };
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd(AndroidUserAgent);
        _httpClient.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/html;q=0.9, */*;q=0.8");
    }

    /// <summary>Loads the chosen Android app source(s), retaining any source that responds.</summary>
    public async Task<CatalogLoadResult> BrowseAsync(
        int sourcePickerIndex,
        string filter,
        string? query,
        int page = 1,
        string? categoryKey = null,
        string? categoryValue = null,
        CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (sourcePickerIndex is < 0 or > 2)
        {
            throw new ArgumentOutOfRangeException(nameof(sourcePickerIndex));
        }

        page = Math.Clamp(page, 1, MaximumPages);
        filter = filter.Trim();
        query = query?.Trim() ?? string.Empty;
        categoryKey = categoryKey?.Trim() ?? string.Empty;
        categoryValue = categoryValue?.Trim() ?? string.Empty;

        var useServer1 = sourcePickerIndex is 0 or 1;
        var useServer2 = sourcePickerIndex is 0 or 2;
        var hindiCategory = filter.Equals("Hindi", StringComparison.OrdinalIgnoreCase)
            || (filter.Equals("Category", StringComparison.OrdinalIgnoreCase)
                && (categoryKey.Equals("lang", StringComparison.OrdinalIgnoreCase)
                    || categoryKey.Equals("language", StringComparison.OrdinalIgnoreCase))
                && categoryValue.Equals("hi", StringComparison.OrdinalIgnoreCase));
        var server1OnlyCategory = filter.Equals("Category", StringComparison.OrdinalIgnoreCase) && !hindiCategory;
        if (server1OnlyCategory && sourcePickerIndex == 2)
        {
            useServer1 = false;
            useServer2 = false;
        }
        else if (server1OnlyCategory)
        {
            useServer2 = false;
        }

        var server1Task = useServer1
            ? TryBrowseServer1Async(filter, query, page, categoryKey, categoryValue, cancellationToken)
            : Task.FromResult(SourceResult.Empty);
        var server2Task = useServer2
            ? TryBrowseServer2Async(filter, query, page, hindiCategory, cancellationToken)
            : Task.FromResult(SourceResult.Empty);
        await Task.WhenAll(server1Task, server2Task).ConfigureAwait(false);

        var first = await server1Task.ConfigureAwait(false);
        var second = await server2Task.ConfigureAwait(false);
        var combined = Interleave(first.Titles, second.Titles);
        return new CatalogLoadResult(
            combined,
            useServer1 && first.Failed,
            useServer2 && second.Failed,
            first.HasNext || second.HasNext,
            second.UsedWebsiteFallback,
            server1OnlyCategory);
    }

    /// <summary>Loads the real Server 1 category list used by Android's category picker.</summary>
    public async Task<IReadOnlyList<CatalogCategory>> LoadServer1CategoriesAsync(
        CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (_server1Categories is not null)
        {
            return _server1Categories;
        }

        using var response = await _httpClient.GetAsync(Play4uRoot, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var html = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        var document = ParseHtml(html);
        var categories = new List<CatalogCategory>();
        var links = document.DocumentNode.SelectNodes(
            "//aside[contains(concat(' ', normalize-space(@class), ' '), ' sidebar ')]//a[contains(concat(' ', normalize-space(@class), ' '), ' side-item ')]");
        if (links is not null)
        {
            foreach (var link in links)
            {
                var (key, group) = link.Attributes["data-filter-industry"] is not null
                    ? ("industry", "Industry")
                    : link.Attributes["data-filter-lang"] is not null
                        ? ("lang", "Languages")
                        : link.Attributes["data-filter-genre"] is not null
                            ? ("genre", "Genres")
                            : (string.Empty, string.Empty);
                if (key.Length == 0)
                {
                    continue;
                }

                var value = link.GetAttributeValue($"data-filter-{key}", string.Empty).Trim();
                if (!Regex.IsMatch(value, "^[a-z0-9-]{1,80}$", RegexOptions.CultureInvariant))
                {
                    continue;
                }

                var nameNode = link.SelectSingleNode(
                    ".//*[contains(concat(' ', normalize-space(@class), ' '), ' side-item-name ')]");
                var countNode = link.SelectSingleNode(
                    ".//*[contains(concat(' ', normalize-space(@class), ' '), ' side-count ')]");
                var name = CleanHtmlText(nameNode?.InnerText ?? string.Empty);
                if (name.Length == 0)
                {
                    continue;
                }

                categories.Add(new CatalogCategory(group, name, key, value, CleanHtmlText(countNode?.InnerText ?? string.Empty)));
            }
        }

        _server1Categories = categories
            .DistinctBy(category => $"{category.Key}:{category.Value}", StringComparer.Ordinal)
            .ToArray();
        return _server1Categories;
    }

    /// <summary>Loads title metadata from its original Android provider.</summary>
    public async Task<CatalogDetails> LoadDetailsAsync(
        CatalogTitle title,
        CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        ArgumentNullException.ThrowIfNull(title);
        return title.Source switch
        {
            "Server 1" => await LoadPlay4uDetailsAsync(title, cancellationToken).ConfigureAwait(false),
            "Server 2" => await LoadMovyDetailsAsync(title, cancellationToken).ConfigureAwait(false),
            _ => throw new InvalidOperationException("The title does not belong to a supported VibeFlix source.")
        };
    }

    /// <summary>Loads the selected season from the same provider endpoint/page used by Android.</summary>
    public async Task<IReadOnlyList<MediaEpisode>> LoadSeasonEpisodesAsync(
        CatalogTitle title,
        MediaSeason season,
        CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        ArgumentNullException.ThrowIfNull(title);
        ArgumentNullException.ThrowIfNull(season);
        if (season.Number <= 0)
        {
            return Array.Empty<MediaEpisode>();
        }

        if (title.Source == "Server 2")
        {
            var (kind, id) = GetMovyTitleParts(title.CatalogPath);
            using var response = await SendMovyRequestAsync(
                $"/tv/{id}/season/{season.Number.ToString(CultureInfo.InvariantCulture)}",
                cancellationToken).ConfigureAwait(false);
            using var json = await ParseJsonAsync(response, cancellationToken).ConfigureAwait(false);
            return ParseMovyEpisodes(json.RootElement, kind, id, season.Number);
        }

        if (title.Source == "Server 1")
        {
            if (!TryNormalizePlay4uEpisodePath(title.CatalogPath, season.Path, out var seasonPath))
            {
                return Array.Empty<MediaEpisode>();
            }

            var html = await GetHtmlAsync(new Uri(Play4uRoot, seasonPath), cancellationToken).ConfigureAwait(false);
            return ParsePlay4uEpisodes(ParseHtml(html), title.CatalogPath);
        }

        return Array.Empty<MediaEpisode>();
    }

    private async Task<SourceResult> TryBrowseServer1Async(
        string filter,
        string query,
        int page,
        string categoryKey,
        string categoryValue,
        CancellationToken cancellationToken)
    {
        try
        {
            return await BrowseServer1Async(filter, query, page, categoryKey, categoryValue, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return SourceResult.Failure;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception) when (IsProviderFailure(exception))
        {
            return SourceResult.Failure;
        }
    }

    private async Task<SourceResult> BrowseServer1Async(
        string filter,
        string query,
        int page,
        string categoryKey,
        string categoryValue,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(query))
        {
            var parameters = new List<string>
            {
                $"q={Uri.EscapeDataString(query)}",
                $"per_page={PageSize}",
                $"page={page}"
            };
            if (filter.Equals("Hindi", StringComparison.OrdinalIgnoreCase))
            {
                parameters.Add("lang=hi");
            }
            else if (filter.Equals("Movies", StringComparison.OrdinalIgnoreCase))
            {
                parameters.Add("type=movie");
            }
            else if (filter.Equals("Series", StringComparison.OrdinalIgnoreCase))
            {
                parameters.Add("type=series");
            }
            else if (filter.Equals("Category", StringComparison.OrdinalIgnoreCase)
                && categoryKey.Length > 0
                && Regex.IsMatch(categoryKey, "^(industry|lang|genre)$", RegexOptions.CultureInvariant)
                && Regex.IsMatch(categoryValue, "^[a-z0-9-]{1,80}$", RegexOptions.CultureInvariant))
            {
                parameters.Add($"{categoryKey}={Uri.EscapeDataString(categoryValue)}");
            }

            var searchUri = new Uri(Play4uRoot, "api/search.php?" + string.Join('&', parameters));
            using var response = await _httpClient.GetAsync(searchUri, cancellationToken).ConfigureAwait(false);
            using var document = await ParseJsonAsync(response, cancellationToken).ConfigureAwait(false);
            var root = document.RootElement;
            if (root.TryGetProperty("ok", out var ok) && ok.ValueKind == JsonValueKind.False)
            {
                throw new IOException("Server 1 search is unavailable.");
            }

            var titles = new List<CatalogTitle>();
            if (root.TryGetProperty("items", out var items) && items.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in items.EnumerateArray())
                {
                    if (TryReadPlay4uJsonItem(item, filter, out var title))
                    {
                        titles.Add(title);
                    }
                }
            }

            var pages = ReadInt(root, "pages", 1);
            return new SourceResult(titles, false, page < Math.Max(1, pages));
        }

        var browseUri = BuildPlay4uBrowseUri(filter, page, categoryKey, categoryValue);
        var html = await GetHtmlAsync(browseUri, cancellationToken).ConfigureAwait(false);
        var htmlDocument = ParseHtml(html);
        var cards = htmlDocument.DocumentNode.SelectNodes(
            "//*[contains(concat(' ', normalize-space(@class), ' '), ' poster-card ')]");
        var results = new List<CatalogTitle>();
        if (cards is not null)
        {
            foreach (var card in cards)
            {
                var anchor = card.SelectSingleNode(
                    ".//a[contains(concat(' ', normalize-space(@class), ' '), ' poster-link ')]");
                var image = anchor?.SelectSingleNode(".//img") ?? card.SelectSingleNode(".//img");
                var path = anchor?.GetAttributeValue("href", string.Empty) ?? string.Empty;
                var name = card.GetAttributeValue("data-title", string.Empty);
                if (string.IsNullOrWhiteSpace(name))
                {
                    name = anchor?.GetAttributeValue("aria-label", string.Empty)
                        ?? image?.GetAttributeValue("alt", string.Empty)
                        ?? string.Empty;
                }

                var poster = GetFirstAttribute(image, "src", "data-src", "data-lazy-src");
                var year = card.GetAttributeValue("data-year", string.Empty);
                var metadata = new Play4uMetadata(
                    name,
                    path,
                    poster,
                    year,
                    string.Empty,
                    0,
                    string.Empty,
                    string.Empty,
                    Array.Empty<string>(),
                    filter.Equals("Latest", StringComparison.OrdinalIgnoreCase));
                if (TryCreatePlay4uTitle(metadata, out var title))
                {
                    results.Add(title);
                }
            }
        }

        var hasNext = htmlDocument.DocumentNode.SelectNodes("//a[contains(@href, 'page=')]")?
            .Any(node => string.Equals(CleanHtmlText(node.InnerText), "Next", StringComparison.OrdinalIgnoreCase))
            ?? false;
        return new SourceResult(results, false, hasNext);
    }

    private async Task<SourceResult> TryBrowseServer2Async(
        string filter,
        string query,
        int page,
        bool hindiCategory,
        CancellationToken cancellationToken)
    {
        try
        {
            return await BrowseServer2Async(filter, query, page, hindiCategory, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return await TryWebsiteFallbackAsync(filter, query, page, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception) when (IsProviderFailure(exception))
        {
            return await TryWebsiteFallbackAsync(filter, query, page, cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task<SourceResult> BrowseServer2Async(
        string filter,
        string query,
        int page,
        bool hindiCategory,
        CancellationToken cancellationToken)
    {
        if (hindiCategory)
        {
            var movieTask = TryFetchMovyResultsAsync(
                $"/discover/movie?sort_by=popularity.desc&with_original_language=hi&page={page}",
                "movie",
                page,
                cancellationToken);
            var showTask = TryFetchMovyResultsAsync(
                $"/discover/tv?sort_by=popularity.desc&with_original_language=hi&page={page}",
                "tv",
                page,
                cancellationToken);
            await Task.WhenAll(movieTask, showTask).ConfigureAwait(false);
            var movies = await movieTask.ConfigureAwait(false);
            var shows = await showTask.ConfigureAwait(false);
            var succeeded = !movies.Failed || !shows.Failed;
            return new SourceResult(
                Interleave(movies.Titles, shows.Titles),
                !succeeded || movies.Failed || shows.Failed,
                movies.HasNext || shows.HasNext,
                false);
        }

        var route = BuildMovyCatalogRoute(filter, query, page, out var defaultType);
        return await FetchMovyResultsAsync(route, defaultType, page, cancellationToken).ConfigureAwait(false);
    }

    private async Task<SourceResult> TryFetchMovyResultsAsync(
        string route,
        string defaultType,
        int page,
        CancellationToken cancellationToken)
    {
        try
        {
            return await FetchMovyResultsAsync(route, defaultType, page, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return SourceResult.Failure;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception) when (IsProviderFailure(exception))
        {
            return SourceResult.Failure;
        }
    }

    private async Task<SourceResult> FetchMovyResultsAsync(
        string route,
        string defaultType,
        int page,
        CancellationToken cancellationToken)
    {
        using var response = await SendMovyRequestAsync(route, cancellationToken).ConfigureAwait(false);
        using var document = await ParseJsonAsync(response, cancellationToken).ConfigureAwait(false);
        var root = document.RootElement;
        if (!root.TryGetProperty("results", out var results) || results.ValueKind != JsonValueKind.Array)
        {
            return SourceResult.Empty;
        }

        var titles = new List<CatalogTitle>();
        foreach (var item in results.EnumerateArray())
        {
            if (TryReadMovyItem(item, defaultType, out var title))
            {
                titles.Add(title);
            }
        }

        var pages = Math.Clamp(ReadInt(root, "total_pages", 1), 1, MaximumPages);
        return new SourceResult(titles, false, page < pages);
    }

    private async Task<SourceResult> TryWebsiteFallbackAsync(
        string filter,
        string query,
        int page,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(query)
            || page != 1
            || filter is not ("All" or "Movies" or "Series"))
        {
            return SourceResult.Failure;
        }

        try
        {
            var route = filter switch
            {
                "Movies" => "/browse/movie",
                "Series" => "/browse/tv",
                _ => "/"
            };
            var html = await GetHtmlAsync(new Uri(MovyWebsiteRoot, route.TrimStart('/')), cancellationToken)
                .ConfigureAwait(false);
            var document = ParseHtml(html);
            var dataNode = document.DocumentNode.SelectSingleNode("//script[@id='__NEXT_DATA__']");
            if (dataNode is null)
            {
                return SourceResult.Failure;
            }

            using var json = JsonDocument.Parse(WebUtility.HtmlDecode(dataNode.InnerHtml));
            if (!json.RootElement.TryGetProperty("props", out var props)
                || !props.TryGetProperty("pageProps", out var pageProps))
            {
                return SourceResult.Failure;
            }

            var titles = new List<CatalogTitle>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            if (filter == "All")
            {
                foreach (var key in new[] { "trendingSections", "defaultSections", "streamingSections" })
                {
                    if (!pageProps.TryGetProperty(key, out var sections) || sections.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    foreach (var section in sections.EnumerateArray())
                    {
                        if (section.TryGetProperty("movies", out var movies))
                        {
                            AddMovyWebsiteTitles(titles, seen, movies);
                        }
                    }
                }

                AddMovyWebsiteTitles(titles, seen, GetProperty(pageProps, "upcomingTv"));
                AddMovyWebsiteTitles(titles, seen, GetProperty(pageProps, "recent4k"));
            }
            else
            {
                AddMovyWebsiteTitles(titles, seen, GetProperty(pageProps, "initialGrid"));
            }

            return titles.Count == 0
                ? SourceResult.Failure
                : new SourceResult(titles, false, false, true);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return SourceResult.Failure;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception) when (IsProviderFailure(exception))
        {
            return SourceResult.Failure;
        }
    }

    private async Task<CatalogDetails> LoadMovyDetailsAsync(
        CatalogTitle title,
        CancellationToken cancellationToken)
    {
        var (kind, id) = GetMovyTitleParts(title.CatalogPath);
        using var response = await SendMovyRequestAsync($"/{kind}/{id}", cancellationToken).ConfigureAwait(false);
        using var json = await ParseJsonAsync(response, cancellationToken).ConfigureAwait(false);
        var root = json.RootElement;
        var seasons = new List<MediaSeason>();
        if (kind == "tv" && root.TryGetProperty("seasons", out var seasonRows)
            && seasonRows.ValueKind == JsonValueKind.Array)
        {
            foreach (var row in seasonRows.EnumerateArray())
            {
                var number = ReadInt(row, "season_number", 0);
                if (number <= 0 || number > 500)
                {
                    continue;
                }

                var name = ReadString(row, "name");
                seasons.Add(new MediaSeason(
                    number,
                    Array.Empty<MediaEpisode>(),
                    $"/tv/{id}/season/{number.ToString(CultureInfo.InvariantCulture)}",
                    name));
            }
        }

        var runtime = ReadInt(root, "runtime", 0);
        if (runtime <= 0 && root.TryGetProperty("episode_run_time", out var runTimes)
            && runTimes.ValueKind == JsonValueKind.Array)
        {
            runtime = runTimes.EnumerateArray().Select(item => item.TryGetInt32(out var value) ? value : 0)
                .FirstOrDefault(value => value > 0);
        }

        var average = ReadDouble(root, "vote_average");
        var rating = average > 0 ? average.ToString("0.0", CultureInfo.InvariantCulture) : string.Empty;
        var language = GetLanguageLabel(ReadString(root, "original_language"));
        var genres = ReadGenreNames(root);
        var backdrop = BuildTmdbImageUrl(ReadString(root, "backdrop_path"), "w780");
        return new CatalogDetails(
            ReadString(root, "overview"),
            rating,
            runtime,
            language,
            genres,
            backdrop,
            seasons);
    }

    private async Task<CatalogDetails> LoadPlay4uDetailsAsync(
        CatalogTitle title,
        CancellationToken cancellationToken)
    {
        if (!TryNormalizeCatalogPath("Server 1", title.CatalogPath, out var path))
        {
            throw new IOException("The Server 1 title address is not valid.");
        }

        var html = await GetHtmlAsync(new Uri(Play4uRoot, path), cancellationToken).ConfigureAwait(false);
        var document = ParseHtml(html);
        var image = document.DocumentNode.SelectSingleNode("//meta[@property='og:image']")?
            .GetAttributeValue("content", string.Empty);
        var synopsis = document.DocumentNode.SelectSingleNode(
            "//*[contains(concat(' ', normalize-space(@class), ' '), ' vinfo-overview ')]")?.InnerText ?? string.Empty;
        if (string.IsNullOrWhiteSpace(synopsis))
        {
            synopsis = TryReadPlay4uJsonLdDescription(document);
        }

        var metadata = document.DocumentNode.SelectSingleNode(
            "//*[contains(concat(' ', normalize-space(@class), ' '), ' vinfo-meta ')]")?.InnerText ?? string.Empty;
        var year = title.Year > 0 ? title.Year : ParseYear(metadata);
        var runtime = title.RuntimeMinutes > 0 ? title.RuntimeMinutes : ParseRuntimeMinutes(metadata);
        var backdropUrl = NormalizePosterUri("Server 1", CleanHtmlText(image ?? string.Empty))?.AbsoluteUri
            ?? title.PosterUrl;
        var genres = ParsePlay4uGenres(document);
        var seasons = ParsePlay4uSeasons(document, title.CatalogPath);
        return new CatalogDetails(
            CleanHtmlText(synopsis),
            title.Rating,
            runtime,
            title.Language,
            genres.Count == 0 ? title.Genres : genres,
            backdropUrl,
            seasons,
            year);
    }

    private static IReadOnlyList<MediaSeason> ParsePlay4uSeasons(HtmlDocument document, string titlePath)
    {
        var links = document.DocumentNode.SelectNodes(
            "//a[contains(concat(' ', normalize-space(@class), ' '), ' season-card ') or contains(concat(' ', normalize-space(@class), ' '), ' chip ')]");
        var seasons = new SortedDictionary<int, MediaSeason>();
        if (links is not null)
        {
            foreach (var link in links)
            {
                var href = link.GetAttributeValue("href", string.Empty);
                if (!TryNormalizePlay4uEpisodePath(titlePath, href, out var path))
                {
                    continue;
                }

                var seasonNumber = ReadPathNumber(path, @"/s-(\d+)/");
                if (seasonNumber <= 0 || seasons.ContainsKey(seasonNumber))
                {
                    continue;
                }

                var name = CleanHtmlText(link.InnerText);
                if (name.Length > 40)
                {
                    name = string.Empty;
                }

                seasons.Add(seasonNumber, new MediaSeason(seasonNumber, Array.Empty<MediaEpisode>(), path, name));
            }
        }

        if (seasons.Count == 0)
        {
            var episodeLinks = document.DocumentNode.SelectNodes(
                "//a[contains(concat(' ', normalize-space(@class), ' '), ' ep ') and @href]");
            if (episodeLinks is not null)
            {
                foreach (var link in episodeLinks)
                {
                    var href = link.GetAttributeValue("href", string.Empty);
                    if (!TryNormalizePlay4uEpisodePath(titlePath, href, out var path))
                    {
                        continue;
                    }

                    var seasonNumber = ReadPathNumber(path, @"/s-(\d+)/");
                    if (seasonNumber > 0 && !seasons.ContainsKey(seasonNumber))
                    {
                        seasons.Add(seasonNumber, new MediaSeason(seasonNumber, Array.Empty<MediaEpisode>(), path));
                    }
                }
            }
        }

        return seasons.Values.ToArray();
    }

    private static IReadOnlyList<MediaEpisode> ParsePlay4uEpisodes(HtmlDocument document, string titlePath)
    {
        var links = document.DocumentNode.SelectNodes(
            "//a[contains(concat(' ', normalize-space(@class), ' '), ' ep ') and @href]");
        if (links is null)
        {
            return Array.Empty<MediaEpisode>();
        }

        var episodes = new List<MediaEpisode>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var link in links)
        {
            var href = link.GetAttributeValue("href", string.Empty);
            if (!TryNormalizePlay4uEpisodePath(titlePath, href, out var path) || !seen.Add(path))
            {
                continue;
            }

            var episodeNumber = ReadPathNumber(path, @"/ep-(\d+)/");
            if (episodeNumber <= 0)
            {
                continue;
            }

            var heading = link.SelectSingleNode(".//h3");
            var name = CleanHtmlText(heading?.InnerText ?? link.InnerText);
            var synopsis = CleanHtmlText(link.SelectSingleNode(".//p")?.InnerText ?? string.Empty);
            var still = link.SelectSingleNode(".//*[contains(concat(' ', normalize-space(@class), ' '), ' ep-still ')]");
            var image = ExtractHttpsUrl(still?.GetAttributeValue("style", string.Empty) ?? string.Empty);
            episodes.Add(new MediaEpisode(episodeNumber, name, synopsis, 0, path, image));
        }

        return episodes.OrderBy(episode => episode.Number).ToArray();
    }

    private static IReadOnlyList<MediaEpisode> ParseMovyEpisodes(
        JsonElement root,
        string kind,
        string id,
        int seasonNumber)
    {
        if (kind != "tv" || !root.TryGetProperty("episodes", out var rows) || rows.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<MediaEpisode>();
        }

        var episodes = new List<MediaEpisode>();
        foreach (var row in rows.EnumerateArray())
        {
            var number = ReadInt(row, "episode_number", 0);
            if (number <= 0)
            {
                continue;
            }

            var episodePath = $"/tv/{id}?season={seasonNumber.ToString(CultureInfo.InvariantCulture)}&episode={number.ToString(CultureInfo.InvariantCulture)}";
            var still = BuildTmdbImageUrl(ReadString(row, "still_path"), "w300");
            episodes.Add(new MediaEpisode(
                number,
                ReadString(row, "name"),
                ReadString(row, "overview"),
                ReadInt(row, "runtime", 0),
                episodePath,
                still));
        }

        return episodes.OrderBy(episode => episode.Number).ToArray();
    }

    private static Uri BuildPlay4uBrowseUri(string filter, int page, string categoryKey, string categoryValue)
    {
        var parameters = new List<string> { $"page={page.ToString(CultureInfo.InvariantCulture)}" };
        if (filter.Equals("Movies", StringComparison.OrdinalIgnoreCase))
        {
            parameters.Add("type=movie");
        }
        else if (filter.Equals("Series", StringComparison.OrdinalIgnoreCase))
        {
            parameters.Add("type=series");
        }
        else if (filter.Equals("Latest", StringComparison.OrdinalIgnoreCase))
        {
            parameters.Add("cat=latest");
        }
        else if (filter.Equals("Hindi", StringComparison.OrdinalIgnoreCase))
        {
            parameters.Add("lang=hi");
        }
        else if (filter.Equals("Category", StringComparison.OrdinalIgnoreCase)
            && Regex.IsMatch(categoryKey, "^(industry|lang|genre)$", RegexOptions.CultureInvariant)
            && Regex.IsMatch(categoryValue, "^[a-z0-9-]{1,80}$", RegexOptions.CultureInvariant))
        {
            parameters.Add($"{categoryKey}={Uri.EscapeDataString(categoryValue)}");
        }

        return new Uri(Play4uRoot, "?" + string.Join('&', parameters));
    }

    private static string BuildMovyCatalogRoute(string filter, string query, int page, out string defaultType)
    {
        var pageText = page.ToString(CultureInfo.InvariantCulture);
        if (!string.IsNullOrWhiteSpace(query))
        {
            defaultType = string.Empty;
            return $"/search/multi?query={Uri.EscapeDataString(query)}&page={pageText}";
        }

        if (filter.Equals("Movies", StringComparison.OrdinalIgnoreCase))
        {
            defaultType = "movie";
            return $"/discover/movie?sort_by=popularity.desc&page={pageText}";
        }

        if (filter.Equals("Series", StringComparison.OrdinalIgnoreCase))
        {
            defaultType = "tv";
            return $"/discover/tv?sort_by=popularity.desc&page={pageText}";
        }

        if (filter.Equals("Latest", StringComparison.OrdinalIgnoreCase))
        {
            defaultType = string.Empty;
            return $"/trending/all/week?page={pageText}";
        }

        defaultType = string.Empty;
        return $"/trending/all/week?page={pageText}";
    }

    private async Task<HttpResponseMessage> SendMovyRequestAsync(
        string route,
        CancellationToken cancellationToken)
    {
        var uri = new Uri(MovyMetadataRoot, route.TrimStart('/'));
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.Referrer = MovyRoot;
        request.Headers.TryAddWithoutValidation("Origin", MovyRoot.GetLeftPart(UriPartial.Authority));
        request.Headers.TryAddWithoutValidation("Cache-Control", "no-cache");
        var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            var statusCode = response.StatusCode;
            response.Dispose();
            throw new HttpRequestException("Server 2 returned an unsuccessful response.", null, statusCode);
        }

        return response;
    }

    private async Task<string> GetHtmlAsync(Uri uri, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.TryAddWithoutValidation("Cache-Control", "no-cache");
        if (uri.Host.Equals("www.movy.sx", StringComparison.OrdinalIgnoreCase))
        {
            request.Headers.Referrer = MovyRoot;
            request.Headers.TryAddWithoutValidation("Origin", MovyRoot.GetLeftPart(UriPartial.Authority));
        }
        else if (uri.Host.Equals("play4u.org", StringComparison.OrdinalIgnoreCase))
        {
            request.Headers.Referrer = Play4uRoot;
        }

        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
    }

    private static async Task<JsonDocument> ParseJsonAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        response.EnsureSuccessStatusCode();
        return await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false),
            cancellationToken: cancellationToken).ConfigureAwait(false);
    }

    private static bool TryReadPlay4uJsonItem(JsonElement item, string filter, out CatalogTitle title)
    {
        var rawPath = ReadString(item, "watch");
        var name = ReadString(item, "title");
        var poster = FirstNonEmpty(
            ReadString(item, "poster"),
            ReadString(item, "poster_url"),
            ReadString(item, "poster_sm"));
        if (poster.Length == 0)
        {
            poster = BuildTmdbImageUrl(ReadString(item, "poster_path"), "w342");
        }
        var year = ReadString(item, "year");
        var runtime = ReadInt(item, "runtime_minutes", 0);
        if (runtime <= 0)
        {
            runtime = ParseRuntimeMinutes(ReadString(item, "runtime"));
        }

        var languages = ReadStringArray(item, "langs");
        if (languages.Count == 0)
        {
            languages = ReadStringArray(item, "languages");
        }

        var language = string.Join(", ", languages.Select(GetLanguageLabel).Distinct(StringComparer.OrdinalIgnoreCase));
        var genres = ReadStringArray(item, "genre_names");
        if (genres.Count == 0)
        {
            genres = ReadStringArray(item, "genres");
        }

        var metadata = new Play4uMetadata(
            name,
            rawPath,
            poster,
            year,
            ReadString(item, "overview"),
            runtime,
            ReadString(item, "age_rating"),
            language,
            genres,
            filter.Equals("Latest", StringComparison.OrdinalIgnoreCase));
        return TryCreatePlay4uTitle(metadata, out title);
    }

    private static bool TryCreatePlay4uTitle(Play4uMetadata item, out CatalogTitle title)
    {
        title = null!;
        if (string.IsNullOrWhiteSpace(item.Name) || item.Name.Trim().Length > 250
            || !TryNormalizeCatalogPath("Server 1", item.Path, out var catalogPath))
        {
            return false;
        }

        var pathSegments = catalogPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (pathSegments.Length != 2)
        {
            return false;
        }

        var isSeries = pathSegments[0].Equals("series", StringComparison.OrdinalIgnoreCase);
        var year = ParseYear(item.Year);
        if (year == 0)
        {
            year = ParseYear(item.Path);
        }

        var genres = item.Genres.Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(16)
            .ToArray();
        var poster = NormalizePosterUri("Server 1", item.Poster)?.AbsoluteUri ?? string.Empty;
        title = new CatalogTitle(
            Id: CreateTitleId("s1-", catalogPath),
            Name: CleanHtmlText(item.Name),
            Kind: isSeries ? "Series" : "Movie",
            Year: year,
            Rating: item.Rating,
            RuntimeMinutes: Math.Clamp(item.RuntimeMinutes, 0, 1000),
            Synopsis: item.Synopsis,
            Language: item.Language,
            Source: "Server 1",
            Genres: genres,
            AccentStart: "#343434",
            AccentEnd: "#161616",
            IsNew: item.IsNew,
            CatalogPath: catalogPath,
            PosterUrl: poster);
        return true;
    }

    private static bool TryReadMovyItem(JsonElement item, string defaultType, out CatalogTitle title)
    {
        title = null!;
        var type = ReadString(item, "media_type");
        if (type.Length == 0)
        {
            type = defaultType;
        }

        if (type is not ("movie" or "tv"))
        {
            return false;
        }

        var id = ReadString(item, "id");
        if (id.Length is 0 or > 12 || !id.All(char.IsAsciiDigit))
        {
            return false;
        }

        var name = ReadString(item, type == "tv" ? "name" : "title");
        if (name.Length == 0 || name.Length > 250)
        {
            return false;
        }

        var posterPath = ReadString(item, "poster_path");
        if (posterPath.Length == 0 || posterPath == "null")
        {
            return false;
        }

        var yearText = ReadString(item, type == "tv" ? "first_air_date" : "release_date");
        var path = $"/{type}/{id}";
        if (!TryNormalizeCatalogPath("Server 2", path, out var catalogPath))
        {
            return false;
        }

        title = new CatalogTitle(
            Id: CreateTitleId("s2-", catalogPath),
            Name: CleanHtmlText(name),
            Kind: type == "tv" ? "Series" : "Movie",
            Year: ParseYear(yearText),
            Rating: FormatRating(ReadDouble(item, "vote_average")),
            RuntimeMinutes: 0,
            Synopsis: ReadString(item, "overview"),
            Language: GetLanguageLabel(ReadString(item, "original_language")),
            Source: "Server 2",
            Genres: [],
            AccentStart: "#343434",
            AccentEnd: "#161616",
            CatalogPath: catalogPath,
            PosterUrl: BuildTmdbImageUrl(posterPath, "w342"));
        return true;
    }

    private static void AddMovyWebsiteTitles(List<CatalogTitle> output, HashSet<string> seen, JsonElement rows)
    {
        if (rows.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        foreach (var item in rows.EnumerateArray())
        {
            var rawPath = ReadString(item, "slug");
            var name = ReadString(item, "title");
            var poster = ReadString(item, "poster");
            if (name.Length == 0 || name.Length > 250
                || !TryNormalizeCatalogPath("Server 2", rawPath, out var path)
                || !poster.StartsWith("/img/", StringComparison.Ordinal)
                || !seen.Add(path))
            {
                continue;
            }

            var segment = path.Split('/', StringSplitOptions.RemoveEmptyEntries)[0];
            var year = ParseYear(ReadString(item, "release_date"));
            var posterUri = NormalizePosterUri("Server 2", poster)?.AbsoluteUri ?? string.Empty;
            output.Add(new CatalogTitle(
                Id: CreateTitleId("s2-", path),
                Name: CleanHtmlText(name),
                Kind: segment == "tv" ? "Series" : "Movie",
                Year: year,
                Rating: string.Empty,
                RuntimeMinutes: 0,
                Synopsis: string.Empty,
                Language: string.Empty,
                Source: "Server 2",
                Genres: [],
                AccentStart: "#343434",
                AccentEnd: "#161616",
                CatalogPath: path,
                PosterUrl: posterUri));
        }
    }

    private static bool TryNormalizeCatalogPath(string source, string rawPath, out string path)
    {
        path = string.Empty;
        if (string.IsNullOrWhiteSpace(rawPath) || rawPath.Length > 2048)
        {
            return false;
        }

        var root = source == "Server 2" ? MovyRoot : Play4uRoot;
        Uri uri;
        if (rawPath.StartsWith("/", StringComparison.Ordinal))
        {
            uri = new Uri(root, rawPath);
        }
        else if (Uri.TryCreate(rawPath, UriKind.Absolute, out var absolute))
        {
            uri = absolute;
        }
        else if (Uri.TryCreate(root, rawPath, out var relative))
        {
            uri = relative;
        }
        else
        {
            return false;
        }

        var allowedHost = source == "Server 2"
            ? string.Equals(uri.Host, "www.movy.sx", StringComparison.OrdinalIgnoreCase)
            : string.Equals(uri.Host, "play4u.org", StringComparison.OrdinalIgnoreCase);
        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || !allowedHost
            || !string.IsNullOrEmpty(uri.UserInfo)
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment))
        {
            return false;
        }

        var candidate = Uri.UnescapeDataString(uri.AbsolutePath);
        var valid = source == "Server 2"
            ? Regex.IsMatch(candidate, @"^/(movie|tv)/[0-9]{1,12}$", RegexOptions.CultureInvariant)
            : Regex.IsMatch(candidate, @"^/(watch|series)/[A-Za-z0-9._~-]{1,200}$", RegexOptions.CultureInvariant);
        if (!valid)
        {
            return false;
        }

        path = candidate;
        return true;
    }

    private static bool TryNormalizePlay4uEpisodePath(string titlePath, string rawPath, out string episodePath)
    {
        episodePath = string.Empty;
        if (!TryNormalizeCatalogPath("Server 1", titlePath, out var ownerPath)
            || string.IsNullOrWhiteSpace(rawPath)
            || rawPath.Length > 2048)
        {
            return false;
        }

        Uri uri;
        if (rawPath.StartsWith("/", StringComparison.Ordinal))
        {
            uri = new Uri(Play4uRoot, rawPath);
        }
        else if (Uri.TryCreate(rawPath, UriKind.Absolute, out var absolute))
        {
            uri = absolute;
        }
        else if (Uri.TryCreate(Play4uRoot, rawPath, out var relative))
        {
            uri = relative;
        }
        else
        {
            return false;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || !string.Equals(uri.Host, "play4u.org", StringComparison.OrdinalIgnoreCase)
            || !string.IsNullOrEmpty(uri.UserInfo)
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment))
        {
            return false;
        }

        var candidate = Uri.UnescapeDataString(uri.AbsolutePath).TrimEnd('/');
        var episodeMatch = Regex.Match(candidate, @"^/series/([A-Za-z0-9._~-]{1,200})/s-([1-9][0-9]{0,3})/ep-([1-9][0-9]{0,4})$", RegexOptions.CultureInvariant);
        var ownerSegments = ownerPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (!episodeMatch.Success || ownerSegments.Length != 2
            || !string.Equals(ownerSegments[1], episodeMatch.Groups[1].Value, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        episodePath = candidate;
        return true;
    }

    private static (string Kind, string Id) GetMovyTitleParts(string catalogPath)
    {
        if (!TryNormalizeCatalogPath("Server 2", catalogPath, out var path))
        {
            throw new IOException("The Server 2 title address is not valid.");
        }

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return (segments[0], segments[1]);
    }

    private static IReadOnlyList<CatalogTitle> Interleave(
        IReadOnlyList<CatalogTitle> first,
        IReadOnlyList<CatalogTitle> second)
    {
        var combined = new List<CatalogTitle>(first.Count + second.Count);
        var count = Math.Max(first.Count, second.Count);
        for (var index = 0; index < count; index++)
        {
            if (index < first.Count)
            {
                combined.Add(first[index]);
            }

            if (index < second.Count)
            {
                combined.Add(second[index]);
            }
        }

        return combined;
    }

    private static HtmlDocument ParseHtml(string html)
    {
        var document = new HtmlDocument
        {
            OptionAutoCloseOnEnd = true,
            OptionFixNestedTags = true
        };
        document.LoadHtml(html);
        return document;
    }

    private static string TryReadPlay4uJsonLdDescription(HtmlDocument document)
    {
        var scripts = document.DocumentNode.SelectNodes("//script[@type='application/ld+json']");
        if (scripts is null)
        {
            return string.Empty;
        }

        foreach (var script in scripts)
        {
            try
            {
                using var json = JsonDocument.Parse(WebUtility.HtmlDecode(script.InnerHtml));
                var root = json.RootElement;
                if (root.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in root.EnumerateArray())
                    {
                        var description = FindSchemaDescription(item);
                        if (description.Length > 0)
                        {
                            return description;
                        }
                    }
                }

                var direct = FindSchemaDescription(root);
                if (direct.Length > 0)
                {
                    return direct;
                }

                if (root.TryGetProperty("@graph", out var graph) && graph.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in graph.EnumerateArray())
                    {
                        var description = FindSchemaDescription(item);
                        if (description.Length > 0)
                        {
                            return description;
                        }
                    }
                }
            }
            catch (JsonException)
            {
                // A broken schema snippet should not prevent the rest of the page from loading.
            }
        }

        return string.Empty;
    }

    private static string FindSchemaDescription(JsonElement item)
    {
        var type = ReadString(item, "@type");
        if (type is not ("Movie" or "TVSeries"))
        {
            return string.Empty;
        }

        return ReadString(item, "description");
    }

    private static IReadOnlyList<string> ParsePlay4uGenres(HtmlDocument document)
    {
        var genres = new List<string>();
        var nodes = document.DocumentNode.SelectNodes(
            "//*[contains(concat(' ', normalize-space(@class), ' '), ' vinfo-meta ')]//a[@href]");
        if (nodes is null)
        {
            return genres;
        }

        foreach (var node in nodes)
        {
            var value = CleanHtmlText(node.InnerText);
            if (value.Length > 0 && value.Length <= 60)
            {
                genres.Add(value);
            }
        }

        return genres.Distinct(StringComparer.OrdinalIgnoreCase).Take(16).ToArray();
    }

    private static string BuildTmdbImageUrl(string path, string size)
    {
        if (string.IsNullOrWhiteSpace(path) || path == "null")
        {
            return string.Empty;
        }

        var normalizedPath = path.TrimStart('/');
        return new Uri(new Uri($"https://image.tmdb.org/t/p/{size}/"), normalizedPath).AbsoluteUri;
    }

    private static Uri? NormalizePosterUri(string source, string? rawPoster)
    {
        if (string.IsNullOrWhiteSpace(rawPoster) || rawPoster.Length > 2048)
        {
            return null;
        }

        var value = rawPoster.Trim();
        if (value.Equals("null", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (value.StartsWith("//", StringComparison.Ordinal))
        {
            value = "https:" + value;
        }

        var root = source == "Server 2" ? MovyRoot : Play4uRoot;
        Uri uri;
        if (value.StartsWith("/", StringComparison.Ordinal))
        {
            uri = new Uri(root, value);
        }
        else if (Uri.TryCreate(value, UriKind.Absolute, out var absolute))
        {
            uri = absolute;
        }
        else if (Uri.TryCreate(root, value, out var relative))
        {
            uri = relative;
        }
        else
        {
            return null;
        }

        return string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrEmpty(uri.Host)
            && string.IsNullOrEmpty(uri.UserInfo)
            ? uri
            : null;
    }

    private static int ParseYear(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0;
        }

        var match = Regex.Match(value, @"(?<![0-9])((?:18|19|20|21)[0-9]{2})(?![0-9])", RegexOptions.CultureInvariant);
        return match.Success && int.TryParse(match.Groups[1].Value, NumberStyles.None, CultureInfo.InvariantCulture, out var year)
            ? year
            : 0;
    }

    private static int ParseRuntimeMinutes(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0;
        }

        var match = Regex.Match(value, @"\b([0-9]{1,4})\s*(?:min|minutes|m)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        return match.Success && int.TryParse(match.Groups[1].Value, NumberStyles.None, CultureInfo.InvariantCulture, out var minutes)
            ? Math.Clamp(minutes, 0, 1000)
            : 0;
    }

    private static int ReadPathNumber(string path, string pattern)
    {
        var match = Regex.Match(path, pattern, RegexOptions.CultureInvariant);
        return match.Success && int.TryParse(match.Groups[1].Value, NumberStyles.None, CultureInfo.InvariantCulture, out var value)
            ? value
            : 0;
    }

    private static string ExtractHttpsUrl(string text)
    {
        var match = Regex.Match(text, @"https://[^\s'""\)]+", RegexOptions.CultureInvariant);
        return match.Success ? match.Value : string.Empty;
    }

    private static string GetFirstAttribute(HtmlNode? node, params string[] names)
    {
        if (node is null)
        {
            return string.Empty;
        }

        foreach (var name in names)
        {
            var value = node.GetAttributeValue(name, string.Empty);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private static string CleanHtmlText(string value) =>
        WebUtility.HtmlDecode(value).Replace('\u00a0', ' ').Trim();

    private static string FirstNonEmpty(params string[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;

    private static int ReadInt(JsonElement parent, string propertyName, int fallback)
    {
        if (!parent.TryGetProperty(propertyName, out var value))
        {
            return fallback;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
        {
            return number;
        }

        return value.ValueKind == JsonValueKind.String
            && int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out number)
            ? number
            : fallback;
    }

    private static double ReadDouble(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out var value))
        {
            return 0;
        }

        return value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number)
            ? number
            : value.ValueKind == JsonValueKind.String
                && double.TryParse(value.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out number)
                ? number
                : 0;
    }

    private static string ReadString(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out var value))
        {
            return string.Empty;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? string.Empty,
            JsonValueKind.Number => value.ToString(),
            _ => string.Empty
        };
    }

    private static JsonElement GetProperty(JsonElement parent, string propertyName) =>
        parent.TryGetProperty(propertyName, out var value) ? value : default;

    private static IReadOnlyList<string> ReadStringArray(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out var array) || array.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        return array.EnumerateArray()
            .Select(element => element.ValueKind == JsonValueKind.String ? element.GetString() : element.ToString())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(16)
            .ToArray();
    }

    private static IReadOnlyList<string> ReadGenreNames(JsonElement item)
    {
        if (!item.TryGetProperty("genres", out var genres) || genres.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        return genres.EnumerateArray()
            .Select(genre => ReadString(genre, "name"))
            .Where(name => name.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(16)
            .ToArray();
    }

    private static string GetLanguageLabel(string language)
    {
        var normalized = language.Trim().ToLowerInvariant();
        return normalized switch
        {
            "hi" or "hin" => "Hindi",
            "en" or "eng" => "English",
            "ur" or "urd" => "Urdu",
            "ko" or "kor" => "Korean",
            "ja" or "jpn" => "Japanese",
            "zh" or "zho" or "chi" => "Chinese",
            "es" or "spa" => "Spanish",
            "fr" or "fra" or "fre" => "French",
            "de" or "deu" or "ger" => "German",
            "it" or "ita" => "Italian",
            "pt" or "por" => "Portuguese",
            "ru" or "rus" => "Russian",
            "tr" or "tur" => "Turkish",
            "ar" or "ara" => "Arabic",
            "" or "null" => string.Empty,
            _ => normalized.Length == 2 ? normalized.ToUpperInvariant() : normalized
        };
    }

    private static string FormatRating(double rating) =>
        rating > 0 ? rating.ToString("0.0", CultureInfo.InvariantCulture) : string.Empty;

    private static string CreateTitleId(string sourcePrefix, string catalogPath)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(catalogPath));
        return sourcePrefix + Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static bool IsProviderFailure(Exception exception) => exception is
        HttpRequestException or IOException or JsonException or InvalidOperationException or
        FormatException or UriFormatException or TaskCanceledException or HtmlWebException;

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _httpClient.Dispose();
    }

    private sealed record Play4uMetadata(
        string Name,
        string Path,
        string Poster,
        string Year,
        string Synopsis,
        int RuntimeMinutes,
        string Rating,
        string Language,
        IReadOnlyList<string> Genres,
        bool IsNew);

    private sealed record SourceResult(
        IReadOnlyList<CatalogTitle> Titles,
        bool Failed,
        bool HasNext,
        bool UsedWebsiteFallback = false)
    {
        public static SourceResult Empty { get; } = new(Array.Empty<CatalogTitle>(), false, false);
        public static SourceResult Failure { get; } = new(Array.Empty<CatalogTitle>(), true, false);
    }

    public sealed record CatalogLoadResult(
        IReadOnlyList<CatalogTitle> Titles,
        bool Server1Unavailable,
        bool Server2Unavailable,
        bool HasNext,
        bool Server2WebsiteFallback,
        bool Server1OnlyCategory);

    public sealed record CatalogCategory(string Group, string Name, string Key, string Value, string Count);

    public sealed record CatalogDetails(
        string Synopsis,
        string Rating,
        int RuntimeMinutes,
        string Language,
        IReadOnlyList<string> Genres,
        string BackdropUrl,
        IReadOnlyList<MediaSeason> Seasons,
        int Year = 0);
}
