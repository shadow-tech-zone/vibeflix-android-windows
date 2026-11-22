using System.Net;
using System.Numerics;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using VibeFlix.Windows.Models;

namespace VibeFlix.Windows.Services;

/// <summary>
/// Resolves playback only when the user presses Play, using the same public provider operations
/// as Android. Resolved stream addresses are returned in memory and are never written to disk.
/// </summary>
public sealed class ProviderPlaybackService : IDisposable
{
    private static readonly Uri Play4uRoot = new("https://play4u.org/");
    private static readonly Uri MovyRoot = new("https://www.movy.sx/");
    private static readonly Uri MovyMetadataRoot = new("https://db.wecollege.net/3/");
    private static readonly Uri MovyApiRoot = new("https://api.wecollege.net/");
    private const string AndroidUserAgent = "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
    private static readonly string[] MovyServers =
    [
        "miami", "boise", "chicago", "vegas", "reno", "oakland", "seattle",
        "phoenix", "atlanta", "portland", "austin", "dallas", "delhi"
    ];

    private readonly HttpClient _httpClient;
    private bool _disposed;

    public ProviderPlaybackService()
    {
        _httpClient = new HttpClient(new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate | DecompressionMethods.Brotli
        })
        {
            Timeout = TimeSpan.FromSeconds(20)
        };
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd(AndroidUserAgent);
        _httpClient.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/html;q=0.9, */*;q=0.8");
    }

    public async Task<PlaybackResolution> ResolveAsync(
        CatalogTitle title,
        string? episodeCatalogPath = null,
        CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        ArgumentNullException.ThrowIfNull(title);
        return title.Source switch
        {
            "Server 1" => await ResolvePlay4uAsync(title, episodeCatalogPath, cancellationToken).ConfigureAwait(false),
            "Server 2" => await ResolveMovyAsync(title, episodeCatalogPath, cancellationToken).ConfigureAwait(false),
            _ => throw new PlaybackResolutionException("This title does not belong to a supported VibeFlix source.")
        };
    }

    private async Task<PlaybackResolution> ResolvePlay4uAsync(
        CatalogTitle title,
        string? episodeCatalogPath,
        CancellationToken cancellationToken)
    {
        if (!TryNormalizePlay4uPath(title.CatalogPath, title.CatalogPath, allowEpisode: false, out var titleUri))
        {
            throw new PlaybackResolutionException("The Server 1 title address is invalid.");
        }

        var requestedPath = title.CatalogPath;
        if (!string.IsNullOrWhiteSpace(episodeCatalogPath))
        {
            if (!TryNormalizePlay4uPath(title.CatalogPath, episodeCatalogPath, allowEpisode: true, out var requestedEpisode))
            {
                throw new PlaybackResolutionException("The selected Server 1 episode address is invalid.");
            }

            requestedPath = requestedEpisode.AbsolutePath;
        }

        var requestUri = new Uri(Play4uRoot, requestedPath);
        using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
        request.Headers.Referrer = Play4uRoot;
        request.Headers.TryAddWithoutValidation("Cache-Control", "no-cache");
        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var html = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        var finalUri = response.RequestMessage?.RequestUri ?? requestUri;
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var resolvedCatalogPath = titleUri.AbsolutePath;
        if (TryNormalizePlay4uPath(title.CatalogPath, finalUri.AbsoluteUri, allowEpisode: true, out var redirectedEpisode)
            && IsPlay4uEpisodePath(redirectedEpisode.AbsolutePath))
        {
            resolvedCatalogPath = redirectedEpisode.AbsolutePath;
        }
        else
        {
            var activeEpisode = document.DocumentNode.SelectSingleNode(
                "//a[contains(concat(' ', normalize-space(@class), ' '), ' ep ') and contains(concat(' ', normalize-space(@class), ' '), ' is-on ') and @href]");
            var activeHref = activeEpisode?.GetAttributeValue("href", string.Empty) ?? string.Empty;
            if (TryNormalizePlay4uPath(title.CatalogPath, activeHref, allowEpisode: true, out var selectedEpisode)
                && IsPlay4uEpisodePath(selectedEpisode.AbsolutePath))
            {
                resolvedCatalogPath = selectedEpisode.AbsolutePath;
            }
            else if (IsPlay4uEpisodePath(requestedPath))
            {
                resolvedCatalogPath = requestedPath;
            }
        }

        var stream = ResolvePlay4uStream(document.DocumentNode.OuterHtml);
        return new PlaybackResolution(
            [new ResolvedStream(stream, "application/x-mpegURL", "Server 1", ProviderHeaders("Server 1"))],
            resolvedCatalogPath);
    }

    private async Task<PlaybackResolution> ResolveMovyAsync(
        CatalogTitle title,
        string? episodeCatalogPath,
        CancellationToken cancellationToken)
    {
        if (!TryNormalizeMovyTitle(title.CatalogPath, out var titleUri))
        {
            throw new PlaybackResolutionException("The Server 2 title address is invalid.");
        }

        var kind = titleUri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries)[0];
        var id = titleUri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries)[1];
        var season = 1;
        var episode = 1;
        if (!string.IsNullOrWhiteSpace(episodeCatalogPath))
        {
            if (!TryNormalizeMovyEpisode(titleUri, episodeCatalogPath, out var episodeUri))
            {
                throw new PlaybackResolutionException("The selected Server 2 episode address is invalid.");
            }

            season = ParsePositive(episodeUri.Query, "season", 1);
            episode = ParsePositive(episodeUri.Query, "episode", 1);
        }

        var metadataRoute = $"/{kind}/{id}?append_to_response=external_ids";
        string titleName;
        string year;
        string imdbId;
        int totalSeasons;
        using (var metadata = await GetMovyJsonAsync(MovyMetadataRoot, metadataRoute, cancellationToken).ConfigureAwait(false))
        {
            var root = metadata.RootElement;
            titleName = ReadString(root, kind == "tv" ? "name" : "title");
            var date = ReadString(root, kind == "tv" ? "first_air_date" : "release_date");
            year = date.Length >= 4 ? date[..4] : string.Empty;
            imdbId = ReadString(root, "imdb_id");
            if (string.IsNullOrWhiteSpace(imdbId) && root.TryGetProperty("external_ids", out var externalIds))
            {
                imdbId = ReadString(externalIds, "imdb_id");
            }

            if (imdbId.Equals("null", StringComparison.OrdinalIgnoreCase))
            {
                imdbId = string.Empty;
            }

            totalSeasons = Math.Max(1, ReadInt(root, "number_of_seasons", 1));
        }

        if (string.IsNullOrWhiteSpace(titleName))
        {
            titleName = title.Name;
        }

        var parameters = new StringBuilder()
            .Append("title=").Append(UrlEncode(UrlEncode(titleName)))
            .Append("&mediaType=").Append(kind)
            .Append("&year=").Append(UrlEncode(year))
            .Append("&episodeId=").Append(episode.ToString(System.Globalization.CultureInfo.InvariantCulture))
            .Append("&seasonId=").Append(season.ToString(System.Globalization.CultureInfo.InvariantCulture))
            .Append("&tmdbId=").Append(id)
            .Append("&imdbId=").Append(UrlEncode(imdbId));
        if (kind == "tv")
        {
            parameters.Append("&totalSeasons=").Append(totalSeasons.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }

        var candidates = new List<ResolvedStream>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        for (var round = 0; round < 2 && candidates.Count == 0; round++)
        {
            string seed;
            try
            {
                using var seedJson = await GetMovyJsonAsync(
                    MovyApiRoot,
                    $"/seed?mediaId={id}",
                    cancellationToken).ConfigureAwait(false);
                seed = ReadString(seedJson.RootElement, "seed");
                if (string.IsNullOrWhiteSpace(seed))
                {
                    throw new IOException("Server 2 did not return a stream seed.");
                }
            }
            catch (HttpRequestException exception) when (exception.StatusCode == HttpStatusCode.Forbidden)
            {
                throw new PlaybackResolutionException("Server 2 blocked the stream request (403). Try again later.", exception);
            }
            catch (Exception exception) when (exception is HttpRequestException or IOException or JsonException)
            {
                throw new PlaybackResolutionException("Could not connect to the Server 2 stream service. Try again.", exception);
            }

            using var roundTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            roundTimeout.CancelAfter(TimeSpan.FromSeconds(15));
            var tasks = MovyServers.Select(server => FetchMovySourceAsync(
                server,
                parameters.ToString(),
                seed,
                id,
                roundTimeout.Token,
                cancellationToken)).ToArray();
            var sourceResults = await Task.WhenAll(tasks).ConfigureAwait(false);
            foreach (var sourceResult in sourceResults)
            {
                foreach (var candidate in sourceResult)
                {
                    if (seen.Add(candidate.Address.AbsoluteUri))
                    {
                        candidates.Add(candidate);
                    }
                }
            }
        }

        if (candidates.Count == 0)
        {
            throw new PlaybackResolutionException("No supported Server 2 stream was found for this title. Try again later.");
        }

        var canonicalPath = kind == "tv"
            ? $"{titleUri.AbsolutePath}?season={season.ToString(System.Globalization.CultureInfo.InvariantCulture)}&episode={episode.ToString(System.Globalization.CultureInfo.InvariantCulture)}"
            : titleUri.AbsolutePath;
        return new PlaybackResolution(candidates, canonicalPath);
    }

    private async Task<IReadOnlyList<ResolvedStream>> FetchMovySourceAsync(
        string server,
        string parameters,
        string seed,
        string mediaId,
        CancellationToken roundToken,
        CancellationToken userToken)
    {
        try
        {
            var route = $"/{server}/sources?{parameters}&enc=2&seed={UrlEncode(seed)}";
            var text = await GetTextAsync(MovyApiRoot, route, roundToken).ConfigureAwait(false);
            var decoded = DecodeMovy(text, seed, long.Parse(
                mediaId,
                System.Globalization.CultureInfo.InvariantCulture));
            using var payload = JsonDocument.Parse(decoded);
            return ExtractMovyCandidates(payload.RootElement, server);
        }
        catch (OperationCanceledException) when (!userToken.IsCancellationRequested)
        {
            return Array.Empty<ResolvedStream>();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception) when (exception is HttpRequestException or IOException or JsonException or FormatException or InvalidOperationException or ArgumentException)
        {
            return Array.Empty<ResolvedStream>();
        }
    }

    private static IReadOnlyList<ResolvedStream> ExtractMovyCandidates(JsonElement payload, string server)
    {
        var results = new List<ResolvedStream>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        AddMovyCandidate(results, seen, ReadString(payload, "playlist"), "playlist", server);
        if (payload.TryGetProperty("sources", out var sources) && sources.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in sources.EnumerateArray())
            {
                AddMovyCandidate(results, seen, ReadString(item, "url"), ReadString(item, "type"), server);
            }
        }

        return results;
    }

    private static void AddMovyCandidate(
        List<ResolvedStream> results,
        HashSet<string> seen,
        string address,
        string hint,
        string server)
    {
        if (!TrySafeHttpsUri(address, out var uri) || !seen.Add(uri.AbsoluteUri))
        {
            return;
        }

        var path = uri.AbsolutePath.ToLowerInvariant();
        var mimeType = hint.Equals("playlist", StringComparison.OrdinalIgnoreCase)
            || hint.Equals("hls", StringComparison.OrdinalIgnoreCase)
            || path.EndsWith(".m3u8", StringComparison.Ordinal)
                ? "application/x-mpegURL"
                : path.EndsWith(".mp4", StringComparison.Ordinal)
                    || hint.Equals("mp4", StringComparison.OrdinalIgnoreCase)
                        ? "video/mp4"
                        : string.Empty;
        if (mimeType.Length == 0)
        {
            return;
        }

        results.Add(new ResolvedStream(uri, mimeType, server, ProviderHeaders("Server 2")));
    }

    private static Uri ResolvePlay4uStream(string html)
    {
        var payloadMatch = Regex.Match(
            html,
            @"window\.__PA_PLAY__\s*=\s*(\{.*?\})\s*;",
            RegexOptions.Singleline | RegexOptions.CultureInvariant);
        if (!payloadMatch.Success)
        {
            throw new PlaybackResolutionException("Server 1 player data is unavailable. Try again later.");
        }

        using var payload = JsonDocument.Parse(payloadMatch.Groups[1].Value);
        var streams = payload.RootElement.TryGetProperty("streams", out var streamList)
            && streamList.ValueKind == JsonValueKind.Array
                ? streamList
                : default;
        var source = string.Empty;
        if (streams.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in streams.EnumerateArray())
            {
                source = ReadString(item, "m3u8_url");
                if (!string.IsNullOrWhiteSpace(source) && !source.Equals("null", StringComparison.OrdinalIgnoreCase))
                {
                    break;
                }
            }
        }

        if (string.IsNullOrWhiteSpace(source) || source.Equals("null", StringComparison.OrdinalIgnoreCase))
        {
            throw new PlaybackResolutionException("Server 1 has no stream available for this title.");
        }

        if (source.StartsWith("pa!~", StringComparison.Ordinal))
        {
            var keyMatch = Regex.Match(
                html,
                @"window\.__PA_SEAL_KEY__\s*=\s*[""']([^""']+)[""']",
                RegexOptions.CultureInvariant);
            if (!keyMatch.Success)
            {
                throw new PlaybackResolutionException("Server 1 changed its stream format. Try again later.");
            }

            var key = Encoding.UTF8.GetBytes(keyMatch.Groups[1].Value);
            if (key.Length == 0)
            {
                throw new PlaybackResolutionException("Server 1 stream key is missing.");
            }

            var encrypted = DecodeBase64Url(source[4..]);
            for (var index = 0; index < encrypted.Length; index++)
            {
                encrypted[index] ^= key[index % key.Length];
            }

            source = Encoding.UTF8.GetString(encrypted);
        }

        if (source.StartsWith("/", StringComparison.Ordinal))
        {
            source = new Uri(Play4uRoot, source).AbsoluteUri;
        }

        if (!TrySafeHttpsUri(source, out var resolved))
        {
            throw new PlaybackResolutionException("Server 1 returned an unsupported stream address.");
        }

        return resolved;
    }

    private async Task<JsonDocument> GetMovyJsonAsync(Uri root, string route, CancellationToken cancellationToken)
    {
        var text = await GetTextAsync(root, route, cancellationToken).ConfigureAwait(false);
        return JsonDocument.Parse(text);
    }

    private async Task<string> GetTextAsync(Uri root, string route, CancellationToken cancellationToken)
    {
        var uri = new Uri(root, route.TrimStart('/'));
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        if (uri.Host.Equals("db.wecollege.net", StringComparison.OrdinalIgnoreCase)
            || uri.Host.Equals("api.wecollege.net", StringComparison.OrdinalIgnoreCase))
        {
            request.Headers.Referrer = MovyRoot;
            request.Headers.TryAddWithoutValidation("Origin", MovyRoot.GetLeftPart(UriPartial.Authority));
        }
        else if (uri.Host.Equals("play4u.org", StringComparison.OrdinalIgnoreCase))
        {
            request.Headers.Referrer = Play4uRoot;
        }

        request.Headers.TryAddWithoutValidation("Cache-Control", "no-cache");
        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
    }

    private static string DecodeMovy(string encoded, string seed, long mediaId)
    {
        var data = DecodeBase64Url(encoded);
        if (data.Length < 4)
        {
            throw new IOException("Server 2 stream response changed.");
        }

        const uint goldenRatio = 0x9e3779b9;
        var hash = 0x811c9dc5u;
        foreach (var character in seed)
        {
            hash = unchecked((hash ^ character) * 0x01000193u);
        }

        var id = unchecked((uint)mediaId);
        var stateValue = Mix(Mix(hash) ^ Mix(id ^ goldenRatio));
        var state = new uint[61];
        var used = new bool[61];
        for (var index = 0; index < 8; index++)
        {
            var slot = (int)(stateValue % 61u);
            stateValue = BitOperations.RotateLeft(unchecked(stateValue + goldenRatio), 7 + (index & 7));
            state[slot] = stateValue ^ Mix(stateValue);
            used[slot] = true;
            stateValue = Mix(unchecked(stateValue + (uint)slot));
        }

        var accumulator = Mix(0xa5a5a5a5u ^ stateValue);
        uint word = 0;
        for (var index = 0; index < data.Length; index++)
        {
            if (index % 4 == 0)
            {
                var slot = (int)(accumulator % 61u);
                var value = state[slot] ^ unchecked(goldenRatio * (uint)(index / 4 + 1));
                var mixed = accumulator ^ value;
                if (used[slot])
                {
                    mixed |= accumulator & value;
                }

                mixed = BitOperations.RotateLeft(unchecked(mixed + accumulator), slot & 31)
                    ^ BitOperations.RotateLeft(accumulator, (slot * 7) & 31);
                accumulator = Mix(unchecked(mixed + goldenRatio));
                state[slot] = accumulator;
                used[slot] = true;
                word = accumulator;
            }

            data[index] ^= (byte)(word >> ((index % 4) * 8));
        }

        if (data[0] != (byte)'m' || data[1] != (byte)'v' || data[2] != (byte)'m' || data[3] != (byte)'1')
        {
            throw new IOException("Server 2 stream response changed.");
        }

        return Encoding.UTF8.GetString(data, 4, data.Length - 4);
    }

    private static uint Mix(uint value)
    {
        value ^= value >> 16;
        value = unchecked(value * 0x85ebca6bu);
        value ^= value >> 13;
        value = unchecked(value * 0xc2b2ae35u);
        return value ^ (value >> 16);
    }

    private static byte[] DecodeBase64Url(string value)
    {
        var normalized = value.Trim().Replace("\"", string.Empty).Replace('-', '+').Replace('_', '/');
        normalized = normalized.TrimEnd('=');
        normalized = normalized.PadRight(normalized.Length + ((4 - normalized.Length % 4) % 4), '=');
        return Convert.FromBase64String(normalized);
    }

    private static bool TryNormalizePlay4uPath(
        string titlePath,
        string rawPath,
        bool allowEpisode,
        out Uri uri)
    {
        uri = null!;
        if (string.IsNullOrWhiteSpace(rawPath) || rawPath.Length > 2048)
        {
            return false;
        }

        Uri candidate;
        if (rawPath.StartsWith("/", StringComparison.Ordinal))
        {
            candidate = new Uri(Play4uRoot, rawPath);
        }
        else if (Uri.TryCreate(rawPath, UriKind.Absolute, out var absolute))
        {
            candidate = absolute;
        }
        else if (Uri.TryCreate(Play4uRoot, rawPath, out var relative))
        {
            candidate = relative;
        }
        else
        {
            return false;
        }

        if (!candidate.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || !candidate.Host.Equals("play4u.org", StringComparison.OrdinalIgnoreCase)
            || !string.IsNullOrEmpty(candidate.UserInfo)
            || !string.IsNullOrEmpty(candidate.Query)
            || !string.IsNullOrEmpty(candidate.Fragment))
        {
            return false;
        }

        var titleUri = Uri.TryCreate(titlePath, UriKind.Absolute, out var absoluteTitle)
            ? absoluteTitle
            : new Uri(Play4uRoot, titlePath);
        var owner = titleUri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var segments = candidate.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (owner.Length != 2 || segments.Length < 2
            || !segments[0].Equals("series", StringComparison.OrdinalIgnoreCase)
                && !segments[0].Equals("watch", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var ownerSlug = owner[1];
        if (segments.Length == 2)
        {
            var validTitlePath = segments[0] is "watch" or "series";
            if (!validTitlePath || !ownerSlug.Equals(segments[1], StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }
        else
        {
            if (!allowEpisode || !IsPlay4uEpisodePath(candidate.AbsolutePath)
                || !ownerSlug.Equals(segments[1], StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        uri = candidate;
        return true;
    }

    private static bool IsPlay4uEpisodePath(string path) =>
        Regex.IsMatch(path, @"^/series/[A-Za-z0-9._~-]{1,200}/s-[1-9][0-9]{0,3}/ep-[1-9][0-9]{0,4}/?$", RegexOptions.CultureInvariant);

    private static bool TryNormalizeMovyTitle(string rawPath, out Uri uri)
    {
        uri = null!;
        if (string.IsNullOrWhiteSpace(rawPath) || rawPath.Length > 2048)
        {
            return false;
        }

        var candidate = rawPath.StartsWith("/", StringComparison.Ordinal)
            ? new Uri(MovyRoot, rawPath)
            : Uri.TryCreate(rawPath, UriKind.Absolute, out var absolute)
                ? absolute
                : new Uri(MovyRoot, rawPath);
        if (!candidate.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || !candidate.Host.Equals("www.movy.sx", StringComparison.OrdinalIgnoreCase)
            || !string.IsNullOrEmpty(candidate.UserInfo)
            || !string.IsNullOrEmpty(candidate.Query)
            || !string.IsNullOrEmpty(candidate.Fragment)
            || !Regex.IsMatch(candidate.AbsolutePath, @"^/(movie|tv)/[0-9]{1,12}$", RegexOptions.CultureInvariant))
        {
            return false;
        }

        uri = candidate;
        return true;
    }

    private static bool TryNormalizeMovyEpisode(Uri titleUri, string rawPath, out Uri episodeUri)
    {
        episodeUri = null!;
        if (titleUri.AbsolutePath.StartsWith("/movie/", StringComparison.Ordinal))
        {
            return false;
        }

        var candidate = rawPath.StartsWith("/", StringComparison.Ordinal)
            ? new Uri(MovyRoot, rawPath)
            : Uri.TryCreate(rawPath, UriKind.Absolute, out var absolute)
                ? absolute
                : new Uri(MovyRoot, rawPath);
        if (!candidate.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || !candidate.Host.Equals("www.movy.sx", StringComparison.OrdinalIgnoreCase)
            || !candidate.AbsolutePath.Equals(titleUri.AbsolutePath, StringComparison.Ordinal)
            || !string.IsNullOrEmpty(candidate.UserInfo)
            || !string.IsNullOrEmpty(candidate.Fragment)
            || !Regex.IsMatch(candidate.Query, @"^\?season=[0-9]{1,3}&episode=[0-9]{1,4}$", RegexOptions.CultureInvariant))
        {
            return false;
        }

        var season = ParsePositive(candidate.Query, "season", 0);
        var episode = ParsePositive(candidate.Query, "episode", 0);
        if (season is <= 0 or > 500 || episode is <= 0 or > 10000)
        {
            return false;
        }

        episodeUri = candidate;
        return true;
    }

    private static int ParsePositive(string query, string key, int fallback)
    {
        var match = Regex.Match(query, $@"(?:\?|&){Regex.Escape(key)}=([0-9]+)(?:&|$)", RegexOptions.CultureInvariant);
        return match.Success && int.TryParse(match.Groups[1].Value, out var value) && value > 0 ? value : fallback;
    }

    private static IReadOnlyDictionary<string, string> ProviderHeaders(string source) => source == "Server 2"
        ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Referer"] = "https://www.movy.sx/",
            ["Origin"] = "https://www.movy.sx"
        }
        : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Referer"] = "https://play4u.org/",
            ["Origin"] = "https://play4u.org"
        };

    private static bool TrySafeHttpsUri(string address, out Uri uri)
    {
        uri = null!;
        if (string.IsNullOrWhiteSpace(address) || address.Length > 8192
            || !Uri.TryCreate(address, UriKind.Absolute, out var candidate)
            || !candidate.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(candidate.Host)
            || !string.IsNullOrEmpty(candidate.UserInfo))
        {
            return false;
        }

        uri = candidate;
        return true;
    }

    private static string UrlEncode(string value) => WebUtility.UrlEncode(value);

    private static string ReadString(JsonElement parent, string propertyName)
    {
        if (parent.ValueKind != JsonValueKind.Object || !parent.TryGetProperty(propertyName, out var value))
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

    private static int ReadInt(JsonElement parent, string propertyName, int fallback) =>
        parent.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var result)
            ? result
            : fallback;

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _httpClient.Dispose();
    }

    public sealed record PlaybackResolution(IReadOnlyList<ResolvedStream> Streams, string ResolvedCatalogPath);

    public sealed record ResolvedStream(
        Uri Address,
        string MimeType,
        string Server,
        IReadOnlyDictionary<string, string> Headers);

    public sealed class PlaybackResolutionException : IOException
    {
        public PlaybackResolutionException(string message, Exception? innerException = null)
            : base(message, innerException)
        {
        }
    }
}
