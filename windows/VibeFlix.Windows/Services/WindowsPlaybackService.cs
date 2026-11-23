using Windows.Media.Core;
using Windows.Media.Playback;
using Windows.Media.Streaming.Adaptive;
using WinHttpClient = Windows.Web.Http.HttpClient;

namespace VibeFlix.Windows.Services;

/// <summary>Owns the Windows-native player for provider-resolved HLS and MP4 streams.</summary>
public sealed class WindowsPlaybackService : IDisposable
{
    private AdaptiveMediaSource? _adaptiveSource;
    private WinHttpClient? _streamHttpClient;
    private bool _disposed;

    public WindowsPlaybackService()
    {
        Player = new MediaPlayer { AutoPlay = false };
    }

    public MediaPlayer Player { get; }

    public async Task LoadAsync(
        ProviderPlaybackService.ResolvedStream stream,
        CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        ArgumentNullException.ThrowIfNull(stream);
        cancellationToken.ThrowIfCancellationRequested();
        if (!string.Equals(stream.Address.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only secure HTTPS streams are supported.");
        }

        ClearSource();
        if (string.Equals(stream.MimeType, "application/x-mpegURL", StringComparison.OrdinalIgnoreCase)
            || stream.Address.AbsolutePath.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase))
        {
            var httpClient = new WinHttpClient();
            AdaptiveMediaSource? adaptiveSource = null;
            httpClient.DefaultRequestHeaders.TryAppendWithoutValidation(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36");
            foreach (var (name, value) in stream.Headers)
            {
                httpClient.DefaultRequestHeaders.TryAppendWithoutValidation(name, value);
            }

            using var cancellationRegistration = cancellationToken.Register(httpClient.Dispose);
            try
            {
                var result = await AdaptiveMediaSource.CreateFromUriAsync(stream.Address, httpClient);
                adaptiveSource = result.MediaSource;
                cancellationToken.ThrowIfCancellationRequested();
                if (result.Status != AdaptiveMediaSourceCreationStatus.Success || adaptiveSource is null)
                {
                    var detail = result.ExtendedError?.Message;
                    throw new InvalidOperationException(
                        string.IsNullOrWhiteSpace(detail)
                            ? $"Windows could not initialize this adaptive stream ({result.Status})."
                            : $"Windows could not initialize this adaptive stream: {detail}",
                        result.ExtendedError);
                }


                _streamHttpClient = httpClient;
                _adaptiveSource = adaptiveSource;
                Player.Source = new MediaPlaybackItem(MediaSource.CreateFromAdaptiveMediaSource(adaptiveSource));
                adaptiveSource = null;
            }
            catch
            {
                adaptiveSource?.Dispose();
                if (ReferenceEquals(_streamHttpClient, httpClient))
                {
                    _streamHttpClient = null;
                    _adaptiveSource = null;
                    Player.Source = null;
                }

                httpClient.Dispose();
                throw;
            }
        }
        else if (string.Equals(stream.MimeType, "video/mp4", StringComparison.OrdinalIgnoreCase))
        {
            cancellationToken.ThrowIfCancellationRequested();
            Player.Source = new MediaPlaybackItem(MediaSource.CreateFromUri(stream.Address));
        }
        else
        {
            throw new NotSupportedException("The provider returned a media format that Windows cannot play.");
        }
    }

    public void SeekTo(TimeSpan position)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (position < TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(position));
        }

        Player.PlaybackSession.Position = position;
    }

    public void ClearSource()
    {
        if (_disposed)
        {
            return;
        }

        Player.Pause();
        Player.Source = null;
        _adaptiveSource?.Dispose();
        _adaptiveSource = null;
        _streamHttpClient?.Dispose();
        _streamHttpClient = null;
    }

    public void Play()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        Player.Play();
    }

    public void Pause()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        Player.Pause();
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        ClearSource();
        _disposed = true;
        Player.Dispose();
    }
}
