using Windows.Media.Core;
using Windows.Media.Playback;

namespace VibeFlix.Windows.Services;

/// <summary>
/// Owns the Windows-native playback engine. Provider-specific catalog and stream resolution
/// will be added separately; Android Media3 code is deliberately not shared with this client.
/// </summary>
public sealed class WindowsPlaybackService : IDisposable
{
    private bool _disposed;

    public WindowsPlaybackService()
    {
        Player = new MediaPlayer();
    }

    /// <summary>
    /// The native player can be hosted by a WinUI MediaPlayerElement when playback UI is added.
    /// </summary>
    public MediaPlayer Player { get; }

    /// <summary>
    /// Loads a resolved HTTP(S) media URI. Catalog/page URLs and provider credentials do not
    /// belong here; a future resolver must supply a validated, playable media URI.
    /// </summary>
    public void Load(Uri mediaUri)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        ArgumentNullException.ThrowIfNull(mediaUri);

        if (!mediaUri.IsAbsoluteUri ||
            (mediaUri.Scheme != Uri.UriSchemeHttp && mediaUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("Only absolute HTTP or HTTPS media URIs are supported.", nameof(mediaUri));
        }

        Player.Source = MediaSource.CreateFromUri(mediaUri);
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

        Player.Dispose();
        _disposed = true;
    }
}
