using Windows.Media.Core;
using Windows.Media.Playback;
using Windows.Storage;

namespace VibeFlix.Windows.Services;

/// <summary>
/// Owns the Windows-native playback engine for user-selected local files. Provider-specific
/// catalogue and stream resolution are deliberately outside this local playback milestone.
/// </summary>
public sealed class WindowsPlaybackService : IDisposable
{
    private bool _disposed;

    public WindowsPlaybackService()
    {
        Player = new MediaPlayer
        {
            AutoPlay = false
        };
    }

    /// <summary>
    /// The native player is hosted by a WinUI MediaPlayerElement in the Windows playback view.
    /// </summary>
    public MediaPlayer Player { get; }

    public MediaPlaybackItem CreateLocalPlaybackItem(StorageFile file)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        ArgumentNullException.ThrowIfNull(file);
        return new MediaPlaybackItem(MediaSource.CreateFromStorageFile(file));
    }

    public void Load(MediaPlaybackItem playbackItem)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        ArgumentNullException.ThrowIfNull(playbackItem);
        Player.Source = playbackItem;
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
        ObjectDisposedException.ThrowIf(_disposed, this);
        Player.Pause();
        Player.Source = null;
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

        _disposed = true;
        Player.Dispose();
    }
}
