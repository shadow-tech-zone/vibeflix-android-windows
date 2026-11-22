using Microsoft.UI.Dispatching;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using VibeFlix.Windows.Models;
using VibeFlix.Windows.Services;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Media.Core;
using Windows.Media.Playback;
using Windows.Storage;
using Windows.Storage.Pickers;
using Windows.System;
using WinRT.Interop;

namespace VibeFlix.Windows;

public sealed partial class MainWindow
{
    private async void ShowTitleDetails(CatalogTitle title, ProgressEntry? resumeProgress = null)
    {
        var dispatcherQueue = Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread();
        var dialog = new ContentDialog
        {
            Title = title.Name,
            CloseButtonText = "Close",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = AppRoot.XamlRoot,
            MaxWidth = 860
        };
        var scroll = new ScrollViewer
        {
            MaxHeight = 620,
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled
        };
        var body = new StackPanel { Spacing = 14, Margin = new Thickness(0, 4, 0, 4) };
        var detailsPanel = new StackPanel { Spacing = 14 };
        var playerPanel = new StackPanel { Spacing = 12, Visibility = Visibility.Collapsed };
        var statusText = CreateText(string.Empty, 12, "#A8D8BD", TextWrapping.Wrap);
        var playerFeedback = CreateText(string.Empty, 12, "#A8D8BD", TextWrapping.Wrap);
        var episodeOptions = new List<(int SeasonIndex, int EpisodeIndex, MediaEpisode Episode)>();
        for (var seasonIndex = 0; seasonIndex < title.Seasons.Count; seasonIndex++)
        {
            var season = title.Seasons[seasonIndex];
            for (var episodeIndex = 0; episodeIndex < season.Episodes.Count; episodeIndex++)
            {
                episodeOptions.Add((seasonIndex, episodeIndex, season.Episodes[episodeIndex]));
            }
        }

        var selectedEpisodeIndex = title.IsSeries && episodeOptions.Count > 0 ? 0 : -1;
        var currentItem = (MediaPlaybackItem?)null;
        var currentFile = (StorageFile?)null;
        var pendingResumePosition = (TimeSpan?)null;
        var selectedCaptionTrackKey = (string?)null;
        TextBlock playerEpisodeText = null!;
        TextBlock localFileText = null!;
        Button chooseFileButton = null!;
        Button playPauseButton = null!;
        Slider timelineSlider = null!;
        TextBlock timelineText = null!;
        ComboBox captionPicker = null!;
        TextBlock captionStatus = null!;
        Button previousEpisodeButton = null!;
        Button nextEpisodeButton = null!;
        DispatcherTimer progressTimer = null!;
        var isUpdatingCaptionPicker = false;
        var isUpdatingTimeline = false;
        var isUserSeeking = false;
        var progressTicks = 0;
        TypedEventHandler<MediaPlaybackItem, IVectorChangedEventArgs>? tracksChangedHandler = null;
        TypedEventHandler<MediaPlayer, object>? mediaOpenedHandler = null;
        TypedEventHandler<MediaPlayer, MediaPlayerFailedEventArgs>? mediaFailedHandler = null;

        var detailGrid = new Grid { ColumnSpacing = 16 };
        detailGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(148) });
        detailGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        detailGrid.Children.Add(CreatePoster(title, 224));

        var description = new StackPanel { Spacing = 10 };
        description.Children.Add(CreateText(
            $"{title.Year}  ·  {title.Rating}  ·  {title.RuntimeLabel}",
            12, "#B6C0CE", FontWeights.SemiBold, TextWrapping.Wrap));
        description.Children.Add(CreateText(
            $"{title.Source}  ·  {title.Language}  ·  {string.Join("  /  ", title.Genres)}",
            11, "#929EB0", TextWrapping.Wrap));
        description.Children.Add(CreateText(title.Synopsis, 13, "#D4D9E2", TextWrapping.Wrap));
        description.Children.Add(CreateText(
            "Fictional catalogue metadata only. Choose a local video file you are authorized to play; no provider stream is requested, and the file path is not saved.",
            10, "#8D99AA", TextWrapping.Wrap));

        var actions = new StackPanel { Spacing = 8, Margin = new Thickness(0, 2, 0, 0) };
        Button? listButton = null;
        listButton = CreateActionButton(
            _library.IsSaved(title.Id) ? "Remove from My List" : "Add to My List",
            () => ToggleSavedFromDetails(title, listButton, statusText));
        actions.Children.Add(listButton);
        actions.Children.Add(CreateActionButton("Mark watched manually", () => MarkWatchedFromDetails(title, statusText)));
        actions.Children.Add(CreateActionButton("Play a local video", () => OpenPlayer(null), isPrimary: true));
        description.Children.Add(actions);
        description.Children.Add(statusText);
        Grid.SetColumn(description, 1);
        detailGrid.Children.Add(description);
        detailsPanel.Children.Add(detailGrid);

        if (title.IsSeries && title.Seasons.Count > 0)
        {
            detailsPanel.Children.Add(CreateText("Episodes", 18, "#F0F2F7", FontWeights.SemiBold));
            var seasonPicker = new ComboBox
            {
                Width = 260,
                HorizontalAlignment = HorizontalAlignment.Left
            };
            AutomationProperties.SetName(seasonPicker, "Select a season");
            for (var seasonIndex = 0; seasonIndex < title.Seasons.Count; seasonIndex++)
            {
                var season = title.Seasons[seasonIndex];
                seasonPicker.Items.Add(new ComboBoxItem { Content = season.Label, Tag = seasonIndex });
            }

            var episodeList = new StackPanel { Spacing = 7 };
            void DrawEpisodes(int seasonIndex)
            {
                episodeList.Children.Clear();
                var season = title.Seasons[seasonIndex];
                for (var episodeIndex = 0; episodeIndex < season.Episodes.Count; episodeIndex++)
                {
                    var option = episodeOptions.FindIndex(item =>
                        item.SeasonIndex == seasonIndex && item.EpisodeIndex == episodeIndex);
                    var episode = season.Episodes[episodeIndex];
                    var episodeButton = CreateActionButton(
                        $"{episode.Number:00}  ·  {episode.Name}  ·  {episode.RuntimeMinutes} min",
                        () => OpenPlayer(option));
                    episodeButton.HorizontalAlignment = HorizontalAlignment.Stretch;
                    episodeButton.HorizontalContentAlignment = HorizontalAlignment.Left;
                    AutomationProperties.SetHelpText(episodeButton, episode.Synopsis);
                    ToolTipService.SetToolTip(episodeButton, episode.Synopsis);
                    episodeList.Children.Add(episodeButton);
                }
            }

            seasonPicker.SelectionChanged += (_, _) =>
            {
                if (seasonPicker.SelectedItem is ComboBoxItem { Tag: int seasonIndex })
                {
                    DrawEpisodes(seasonIndex);
                }
            };
            seasonPicker.SelectedIndex = 0;
            detailsPanel.Children.Add(seasonPicker);
            detailsPanel.Children.Add(episodeList);
        }

        playerEpisodeText = CreateText(title.Name, 18, "#E9ECF2", FontWeights.SemiBold, TextWrapping.Wrap);
        localFileText = CreateText(
            "No local video selected. The demo catalogue does not contain playable media.",
            11, "#A2ADBE", TextWrapping.Wrap);
        var mediaPlayerElement = new MediaPlayerElement
        {
            Height = 330,
            MinHeight = 230,
            AutoPlay = false,
            AreTransportControlsEnabled = false,
            RequestedTheme = ElementTheme.Dark
        };
        mediaPlayerElement.SetMediaPlayer(_playback.Player);
        var playerSurface = new Border
        {
            MinHeight = 230,
            CornerRadius = new CornerRadius(14),
            BorderBrush = Brush("#394456"),
            BorderThickness = new Thickness(1),
            Background = Brush("#05070A"),
            Child = mediaPlayerElement
        };
        playerPanel.Children.Add(playerSurface);
        playerPanel.Children.Add(playerEpisodeText);
        playerPanel.Children.Add(localFileText);

        var playbackActions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        chooseFileButton = CreateActionButton("Choose local video", () =>
        {
            _ = OpenPlayerAsync(selectedEpisodeIndex, resumeProgress: null, forcePicker: true);
        });
        playPauseButton = CreateActionButton("Play", TogglePlayback, isPrimary: true);
        playPauseButton.IsEnabled = false;
        playbackActions.Children.Add(chooseFileButton);
        playbackActions.Children.Add(playPauseButton);
        playerPanel.Children.Add(playbackActions);

        timelineSlider = new Slider
        {
            Minimum = 0,
            Maximum = 1000,
            Value = 0,
            StepFrequency = 1,
            IsEnabled = false,
            HorizontalAlignment = HorizontalAlignment.Stretch
        };
        AutomationProperties.SetName(timelineSlider, "Playback position");
        timelineText = CreateText("00:00 / 00:00", 11, "#AEB8C8");
        timelineSlider.ValueChanged += (_, _) =>
        {
            if (isUserSeeking && !isUpdatingTimeline)
            {
                timelineText.Text = FormatTimelinePreview(timelineSlider.Value);
            }
        };
        timelineSlider.PointerPressed += (_, _) => isUserSeeking = true;
        timelineSlider.PointerReleased += (_, _) => CommitTimelineSeek();
        timelineSlider.PointerCaptureLost += (_, _) => CommitTimelineSeek();
        timelineSlider.KeyDown += (_, args) =>
        {
            if (args.Key is VirtualKey.Left or VirtualKey.Right or VirtualKey.Home or VirtualKey.End)
            {
                isUserSeeking = true;
            }
        };
        timelineSlider.KeyUp += (_, args) =>
        {
            if (args.Key is VirtualKey.Left or VirtualKey.Right or VirtualKey.Home or VirtualKey.End)
            {
                CommitTimelineSeek();
            }
        };
        playerPanel.Children.Add(timelineSlider);
        playerPanel.Children.Add(timelineText);

        var captionControls = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        captionControls.Children.Add(CreateText("Captions", 12, "#D4D9E2", FontWeights.SemiBold));
        captionPicker = new ComboBox
        {
            Width = 280,
            IsEnabled = false,
            HorizontalAlignment = HorizontalAlignment.Left
        };
        AutomationProperties.SetName(captionPicker, "Select a timed-text caption track");
        captionPicker.Items.Add(new ComboBoxItem { Content = "Off", Tag = string.Empty });
        captionPicker.SelectedIndex = 0;
        captionStatus = CreateText(
            "Captions are off by default. Only timed-text tracks supplied by the selected media file are listed.",
            10, "#909CAD", TextWrapping.Wrap);
        captionPicker.SelectionChanged += (_, _) =>
        {
            if (isUpdatingCaptionPicker)
            {
                return;
            }

            var selectedKey = (captionPicker.SelectedItem as ComboBoxItem)?.Tag as string;
            selectedCaptionTrackKey = string.IsNullOrEmpty(selectedKey) ? null : selectedKey;
            if (currentItem is not null)
            {
                ApplyCaptionPresentationModes(currentItem);
            }

            captionStatus.Text = selectedCaptionTrackKey is null
                ? "Captions are off."
                : "Showing the selected timed-text track.";
        };
        captionControls.Children.Add(captionPicker);
        playerPanel.Children.Add(captionControls);
        playerPanel.Children.Add(captionStatus);

        var episodeNavigation = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        previousEpisodeButton = CreateActionButton("← Previous episode", () =>
        {
            _ = NavigateEpisode(-1);
        });
        nextEpisodeButton = CreateActionButton("Next episode →", () =>
        {
            _ = NavigateEpisode(1);
        });
        episodeNavigation.Children.Add(previousEpisodeButton);
        episodeNavigation.Children.Add(nextEpisodeButton);
        playerPanel.Children.Add(episodeNavigation);

        playerPanel.Children.Add(playerFeedback);
        playerPanel.Children.Add(CreateActionButton("Back to title details", () =>
        {
            StopCurrentPlayback(saveProgress: true);
            playerPanel.Visibility = Visibility.Collapsed;
            detailsPanel.Visibility = Visibility.Visible;
            dialog.Title = title.Name;
        }));

        progressTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        progressTimer.Tick += (_, _) =>
        {
            if (currentItem is null)
            {
                return;
            }

            UpdatePlaybackUi();
            progressTicks++;
            if (progressTicks >= 5)
            {
                progressTicks = 0;
                SavePlaybackProgress();
            }
        };

        void OpenPlayer(int? episodeIndex)
        {
            _ = OpenPlayerAsync(episodeIndex, resumeProgress: null);
        }

        async Task OpenPlayerAsync(int? episodeIndex, ProgressEntry? resumeProgress, bool forcePicker = false)
        {
            if (currentItem is not null)
            {
                SavePlaybackProgress();
            }

            if (episodeIndex is int index && index >= 0 && index < episodeOptions.Count)
            {
                selectedEpisodeIndex = index;
            }
            else if (title.IsSeries && selectedEpisodeIndex < 0 && episodeOptions.Count > 0)
            {
                selectedEpisodeIndex = 0;
            }
            else if (!title.IsSeries)
            {
                selectedEpisodeIndex = -1;
            }

            UpdateEpisodeHeader();
            playerFeedback.Text = string.Empty;
            playerPanel.Visibility = Visibility.Visible;
            detailsPanel.Visibility = Visibility.Collapsed;
            dialog.Title = selectedEpisodeIndex >= 0
                ? $"Local playback  ·  {EpisodeLabel(selectedEpisodeIndex)}"
                : $"Local playback  ·  {title.Name}";

            var episodeKey = CurrentEpisodeKey();
            var canUseResumeOverride = resumeProgress is not null
                && (resumeProgress.IsPreviewMarker
                    || string.Equals(resumeProgress.EpisodeKey, episodeKey, StringComparison.Ordinal));
            var savedProgress = canUseResumeOverride
                ? resumeProgress
                : _library.GetProgress(title.Id, episodeKey);
            var resumePosition = savedProgress is { IsPreviewMarker: false, PositionMilliseconds: > 0 }
                ? TimeSpan.FromMilliseconds(savedProgress.PositionMilliseconds)
                : (TimeSpan?)null;

            StopCurrentPlayback(saveProgress: false);
            var cacheKey = PlaybackCacheKey(title.Id, episodeKey);
            StorageFile? file = null;
            if (!forcePicker && _sessionMediaFiles.TryGetValue(cacheKey, out var rememberedFile))
            {
                file = rememberedFile;
            }
            else
            {
                file = await PickLocalVideoAsync();
            }

            if (file is null)
            {
                localFileText.Text = "No local video is loaded. Choose a file you are authorized to play; nothing was uploaded.";
                playerFeedback.Text = "No file selected. Playback was not started.";
                UpdatePlaybackUi();
                return;
            }

            _sessionMediaFiles[cacheKey] = file;
            currentFile = file;
            pendingResumePosition = resumePosition;
            localFileText.Text = $"Local file: {file.Name}  ·  file path is not saved";

            try
            {
                currentItem = _playback.CreateLocalPlaybackItem(file);
                AttachPlaybackHandlers(currentItem, file);
                RefreshCaptionOptions(currentItem);
                _playback.Load(currentItem);
                _playback.Play();
                playerFeedback.Foreground = Brush("#A8D8BD");
                playerFeedback.Text = resumePosition is null
                    ? "Playing a user-selected local file."
                    : $"Resuming near {FormatPlaybackTime(resumePosition.Value)}.";
                UpdatePlaybackUi();
            }
            catch (Exception)
            {
                StopCurrentPlayback(saveProgress: false);
                playerFeedback.Foreground = Brush("#F0A69B");
                playerFeedback.Text = "Windows could not open this file. Try another supported local video.";
            }
        }

        async Task NavigateEpisode(int offset)
        {
            var nextIndex = selectedEpisodeIndex + offset;
            if (nextIndex >= 0 && nextIndex < episodeOptions.Count)
            {
                await OpenPlayerAsync(nextIndex, resumeProgress: null);
            }
        }

        async Task<StorageFile?> PickLocalVideoAsync()
        {
            try
            {
                var picker = new FileOpenPicker
                {
                    ViewMode = PickerViewMode.Thumbnail,
                    SuggestedStartLocation = PickerLocationId.VideosLibrary
                };
                foreach (var extension in new[] { ".mp4", ".mkv", ".m4v", ".mov", ".wmv", ".avi", ".webm", ".mpeg", ".mpg", ".ts", ".m2ts", ".3gp" })
                {
                    picker.FileTypeFilter.Add(extension);
                }

                InitializeWithWindow.Initialize(picker, WindowNative.GetWindowHandle(this));
                return await picker.PickSingleFileAsync();
            }
            catch (Exception)
            {
                playerFeedback.Foreground = Brush("#F0A69B");
                playerFeedback.Text = "The Windows file picker could not be opened. Playback was not started.";
                return null;
            }
        }

        void AttachPlaybackHandlers(MediaPlaybackItem item, StorageFile file)
        {
            tracksChangedHandler = (_, _) =>
            {
                dispatcherQueue.TryEnqueue(() =>
                {
                    if (ReferenceEquals(currentItem, item))
                    {
                        RefreshCaptionOptions(item);
                    }
                });
            };
            item.TimedMetadataTracksChanged += tracksChangedHandler;

            mediaOpenedHandler = (_, _) =>
            {
                dispatcherQueue.TryEnqueue(() =>
                {
                    if (!ReferenceEquals(currentItem, item))
                    {
                        return;
                    }

                    if (pendingResumePosition is TimeSpan requestedPosition)
                    {
                        pendingResumePosition = null;
                        var session = _playback.Player.PlaybackSession;
                        if (session.CanSeek && session.NaturalDuration > TimeSpan.Zero)
                        {
                            var latestSeekPosition = session.NaturalDuration - TimeSpan.FromMilliseconds(250);
                            if (latestSeekPosition < TimeSpan.Zero)
                            {
                                latestSeekPosition = TimeSpan.Zero;
                            }

                            var actualPosition = requestedPosition > latestSeekPosition
                                ? latestSeekPosition
                                : requestedPosition;
                            _playback.Pause();
                            _playback.SeekTo(actualPosition);
                            _playback.Play();
                        }
                        else
                        {
                            playerFeedback.Text = "This file cannot seek; playback started at the beginning.";
                        }
                    }

                    progressTimer.Start();
                    UpdatePlaybackUi();
                });
            };
            _playback.Player.MediaOpened += mediaOpenedHandler;

            mediaFailedHandler = (_, _) =>
            {
                dispatcherQueue.TryEnqueue(() =>
                {
                    if (!ReferenceEquals(currentItem, item))
                    {
                        return;
                    }

                    progressTimer.Stop();
                    playerFeedback.Foreground = Brush("#F0A69B");
                    playerFeedback.Text = $"Windows could not decode {file.Name}. Try another supported local video or a Windows-supported codec.";
                    UpdatePlaybackUi();
                });
            };
            _playback.Player.MediaFailed += mediaFailedHandler;
        }

        void RefreshCaptionOptions(MediaPlaybackItem item)
        {
            var previousSelection = selectedCaptionTrackKey;
            var options = new List<(string Key, string Label)>();
            var tracks = item.TimedMetadataTracks;
            for (uint index = 0; index < tracks.Count; index++)
            {
                var track = tracks[(int)index];
                if (!IsCaptionTrack(track))
                {
                    continue;
                }

                var key = CaptionTrackKey(track, index);
                var label = string.IsNullOrWhiteSpace(track.Label) ? string.Empty : track.Label.Trim();
                var language = string.IsNullOrWhiteSpace(track.Language) ? string.Empty : track.Language.Trim();
                if (label.Length == 0)
                {
                    label = language;
                }
                else if (language.Length > 0 && !string.Equals(label, language, StringComparison.OrdinalIgnoreCase))
                {
                    label = $"{label} ({language})";
                }

                if (label.Length == 0)
                {
                    label = $"Timed text {index + 1}";
                }

                options.Add((key, label));
            }

            isUpdatingCaptionPicker = true;
            captionPicker.Items.Clear();
            captionPicker.Items.Add(new ComboBoxItem { Content = "Off", Tag = string.Empty });
            foreach (var option in options)
            {
                captionPicker.Items.Add(new ComboBoxItem { Content = option.Label, Tag = option.Key });
            }

            var selectedOptionIndex = options.FindIndex(option =>
                string.Equals(option.Key, previousSelection, StringComparison.Ordinal));
            selectedCaptionTrackKey = selectedOptionIndex >= 0 ? previousSelection : null;
            captionPicker.SelectedIndex = selectedOptionIndex >= 0 ? selectedOptionIndex + 1 : 0;
            captionPicker.IsEnabled = options.Count > 0;
            isUpdatingCaptionPicker = false;

            ApplyCaptionPresentationModes(item);
            captionStatus.Text = options.Count == 0
                ? "Captions are off. No caption or subtitle timed-text tracks were found in this file."
                : "Captions are off by default. Select an actual timed-text track to show it.";
        }

        void ApplyCaptionPresentationModes(MediaPlaybackItem item)
        {
            var tracks = item.TimedMetadataTracks;
            for (uint index = 0; index < tracks.Count; index++)
            {
                var track = tracks[(int)index];
                if (!IsCaptionTrack(track))
                {
                    continue;
                }

                var selected = string.Equals(
                    CaptionTrackKey(track, index),
                    selectedCaptionTrackKey,
                    StringComparison.Ordinal);
                tracks.SetPresentationMode(
                    index,
                    selected
                        ? TimedMetadataTrackPresentationMode.PlatformPresented
                        : TimedMetadataTrackPresentationMode.Disabled);
            }
        }

        void UpdateEpisodeHeader()
        {
            if (selectedEpisodeIndex >= 0 && selectedEpisodeIndex < episodeOptions.Count)
            {
                playerEpisodeText.Text = $"{title.Name}  ·  {EpisodeLabel(selectedEpisodeIndex)}\n{episodeOptions[selectedEpisodeIndex].Episode.Name}";
                previousEpisodeButton.IsEnabled = selectedEpisodeIndex > 0;
                nextEpisodeButton.IsEnabled = selectedEpisodeIndex < episodeOptions.Count - 1;
            }
            else
            {
                playerEpisodeText.Text = title.Name;
                previousEpisodeButton.IsEnabled = false;
                nextEpisodeButton.IsEnabled = false;
            }

            chooseFileButton.Content = currentFile is null ? "Choose local video" : "Change local video";
        }

        void UpdatePlaybackUi()
        {
            var loaded = currentItem is not null;
            playPauseButton.IsEnabled = loaded;
            chooseFileButton.Content = currentFile is null ? "Choose local video" : "Change local video";
            var session = _playback.Player.PlaybackSession;
            playPauseButton.Content = session.PlaybackState == MediaPlaybackState.Playing ? "Pause" : "Play";
            timelineSlider.IsEnabled = loaded && session.CanSeek && session.NaturalDuration > TimeSpan.Zero;

            if (session.NaturalDuration <= TimeSpan.Zero)
            {
                if (!isUserSeeking)
                {
                    timelineText.Text = "00:00 / 00:00";
                }

                return;
            }

            if (!isUserSeeking)
            {
                isUpdatingTimeline = true;
                timelineSlider.Value = Math.Clamp(
                    session.Position.TotalMilliseconds * 1000d / session.NaturalDuration.TotalMilliseconds,
                    0d,
                    1000d);
                timelineText.Text = $"{FormatPlaybackTime(session.Position)} / {FormatPlaybackTime(session.NaturalDuration)}";
                isUpdatingTimeline = false;
            }
        }

        string FormatTimelinePreview(double value)
        {
            var duration = _playback.Player.PlaybackSession.NaturalDuration;
            if (duration <= TimeSpan.Zero)
            {
                return "00:00 / 00:00";
            }

            var fraction = Math.Clamp(value / timelineSlider.Maximum, 0d, 1d);
            var preview = TimeSpan.FromTicks((long)(duration.Ticks * fraction));
            return $"{FormatPlaybackTime(preview)} / {FormatPlaybackTime(duration)}";
        }

        void CommitTimelineSeek()
        {
            if (!isUserSeeking)
            {
                return;
            }

            isUserSeeking = false;
            var session = _playback.Player.PlaybackSession;
            if (currentItem is null || !session.CanSeek || session.NaturalDuration <= TimeSpan.Zero)
            {
                UpdatePlaybackUi();
                return;
            }

            var fraction = Math.Clamp(timelineSlider.Value / timelineSlider.Maximum, 0d, 1d);
            var target = TimeSpan.FromTicks((long)(session.NaturalDuration.Ticks * fraction));
            try
            {
                _playback.SeekTo(target);
                SavePlaybackProgress();
            }
            catch (ArgumentOutOfRangeException)
            {
                playerFeedback.Foreground = Brush("#F0A69B");
                playerFeedback.Text = "Windows rejected that seek position. Try a point within the video duration.";
            }

            UpdatePlaybackUi();
        }

        void TogglePlayback()
        {
            if (currentItem is null)
            {
                return;
            }

            if (_playback.Player.PlaybackSession.PlaybackState == MediaPlaybackState.Playing)
            {
                _playback.Pause();
                SavePlaybackProgress();
            }
            else
            {
                _playback.Play();
            }

            UpdatePlaybackUi();
        }

        void SavePlaybackProgress()
        {
            if (currentItem is null)
            {
                return;
            }

            var session = _playback.Player.PlaybackSession;
            var duration = session.NaturalDuration;
            if (duration <= TimeSpan.Zero)
            {
                return;
            }

            var position = session.Position;
            var completesTitle = !title.IsSeries
                || (episodeOptions.Count > 0 && selectedEpisodeIndex == episodeOptions.Count - 1);
            try
            {
                _library.SavePlaybackProgress(
                    title.Id,
                    CurrentEpisodeKey(),
                    (long)Math.Max(0, position.TotalMilliseconds),
                    (long)duration.TotalMilliseconds,
                    completesTitle);
            }
            catch (IOException)
            {
                playerFeedback.Foreground = Brush("#F0A69B");
                playerFeedback.Text = "Playback is continuing, but the local resume position could not be saved.";
            }
            catch (UnauthorizedAccessException)
            {
                playerFeedback.Foreground = Brush("#F0A69B");
                playerFeedback.Text = "Playback is continuing, but the local resume position could not be saved.";
            }
        }

        void StopCurrentPlayback(bool saveProgress)
        {
            progressTimer.Stop();
            if (currentItem is null)
            {
                currentFile = null;
                pendingResumePosition = null;
                return;
            }

            if (saveProgress)
            {
                SavePlaybackProgress();
            }

            _playback.Pause();
            DetachPlaybackHandlers();
            _playback.ClearSource();
            currentItem = null;
            currentFile = null;
            pendingResumePosition = null;
            selectedCaptionTrackKey = null;
            isUserSeeking = false;
            captionPicker.Items.Clear();
            captionPicker.Items.Add(new ComboBoxItem { Content = "Off", Tag = string.Empty });
            captionPicker.SelectedIndex = 0;
            captionPicker.IsEnabled = false;
            captionStatus.Text = "Captions are off by default. Only timed-text tracks supplied by the selected media file are listed.";
            UpdatePlaybackUi();
        }

        void DetachPlaybackHandlers()
        {
            if (currentItem is not null && tracksChangedHandler is not null)
            {
                currentItem.TimedMetadataTracksChanged -= tracksChangedHandler;
            }

            if (mediaOpenedHandler is not null)
            {
                _playback.Player.MediaOpened -= mediaOpenedHandler;
                mediaOpenedHandler = null;
            }

            if (mediaFailedHandler is not null)
            {
                _playback.Player.MediaFailed -= mediaFailedHandler;
                mediaFailedHandler = null;
            }

            tracksChangedHandler = null;
        }

        string CurrentEpisodeKey()
        {
            if (selectedEpisodeIndex < 0 || selectedEpisodeIndex >= episodeOptions.Count)
            {
                return string.Empty;
            }

            var option = episodeOptions[selectedEpisodeIndex];
            return MakeEpisodeKey(title.Seasons[option.SeasonIndex], option.Episode);
        }

        string EpisodeLabel(int index)
        {
            var option = episodeOptions[index];
            var season = title.Seasons[option.SeasonIndex];
            return $"S{season.Number:00} E{option.Episode.Number:00}";
        }

        void ApplyInitialResumeTarget()
        {
            if (resumeProgress is null || string.IsNullOrEmpty(resumeProgress.EpisodeKey))
            {
                return;
            }

            var match = episodeOptions.FindIndex(option =>
                string.Equals(
                    MakeEpisodeKey(title.Seasons[option.SeasonIndex], option.Episode),
                    resumeProgress.EpisodeKey,
                    StringComparison.Ordinal));
            if (match >= 0)
            {
                selectedEpisodeIndex = match;
            }
        }

        ApplyInitialResumeTarget();
        UpdateEpisodeHeader();
        body.Children.Add(detailsPanel);
        body.Children.Add(playerPanel);
        scroll.Content = body;
        dialog.Content = scroll;

        _flushPlaybackOnClose = () => StopCurrentPlayback(saveProgress: true);
        var dialogOperation = dialog.ShowAsync();
        try
        {
            if (resumeProgress is not null)
            {
                await OpenPlayerAsync(selectedEpisodeIndex >= 0 ? selectedEpisodeIndex : null, resumeProgress);
            }

            await dialogOperation;
        }
        finally
        {
            progressTimer.Stop();
            StopCurrentPlayback(saveProgress: true);
            if (_flushPlaybackOnClose is not null)
            {
                _flushPlaybackOnClose = null;
            }

            if (!_windowClosed)
            {
                RenderCurrentPage(resetScroll: false);
            }
        }
    }

    private void ResumeLocalPlayback(CatalogTitle title, ProgressEntry progress)
    {
        ShowTitleDetails(title, progress);
    }

    private void ToggleSavedFromDetails(CatalogTitle title, Button? listButton, TextBlock feedback)
    {
        try
        {
            _library.ToggleMyList(title.Id);
            if (listButton is not null)
            {
                listButton.Content = _library.IsSaved(title.Id) ? "Remove from My List" : "Add to My List";
            }

            feedback.Foreground = Brush("#A8D8BD");
            feedback.Text = "Updated My List on this device.";
            RenderCurrentPage(resetScroll: false);
        }
        catch (IOException)
        {
            feedback.Foreground = Brush("#F0A69B");
            feedback.Text = "Could not update My List. Check local storage permissions and try again.";
        }
        catch (UnauthorizedAccessException)
        {
            feedback.Foreground = Brush("#F0A69B");
            feedback.Text = "Could not update My List. Check local storage permissions and try again.";
        }
    }

    private void MarkWatchedFromDetails(CatalogTitle title, TextBlock feedback)
    {
        try
        {
            _library.MarkWatched(title.Id);
            feedback.Foreground = Brush("#A8D8BD");
            feedback.Text = "Marked manually in local History; this does not verify that the title was played.";
            RenderCurrentPage(resetScroll: false);
        }
        catch (IOException)
        {
            feedback.Foreground = Brush("#F0A69B");
            feedback.Text = "Could not save the local History entry. Check storage permissions and try again.";
        }
        catch (UnauthorizedAccessException)
        {
            feedback.Foreground = Brush("#F0A69B");
            feedback.Text = "Could not save the local History entry. Check storage permissions and try again.";
        }
    }

    private static string MakeEpisodeKey(MediaSeason season, MediaEpisode episode) =>
        $"S{season.Number:00}E{episode.Number:00}";

    private static string PlaybackCacheKey(string titleId, string episodeKey) =>
        $"{titleId}\u001f{episodeKey}";

    private static bool IsCaptionTrack(TimedMetadataTrack track) =>
        track.TimedMetadataKind is TimedMetadataKind.Caption
            or TimedMetadataKind.Subtitle
            or TimedMetadataKind.ImageSubtitle;

    private static string CaptionTrackKey(TimedMetadataTrack track, uint index) =>
        $"{track.Id}\u001f{index}";

    private static string FormatPlaybackTime(TimeSpan value)
    {
        var hours = (long)Math.Max(0, value.TotalHours);
        return hours > 0
            ? $"{hours:00}:{value.Minutes:00}:{value.Seconds:00}"
            : $"{value.Minutes:00}:{value.Seconds:00}";
    }

    private async Task ConfirmClearHistoryAsync()
    {
        var dialog = new ContentDialog
        {
            Title = "Clear local History?",
            Content = "This removes local History entries. My List and episode resume positions will remain.",
            PrimaryButtonText = "Clear History",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = AppRoot.XamlRoot
        };

        if (await dialog.ShowAsync() != ContentDialogResult.Primary)
        {
            return;
        }

        try
        {
            _library.ClearHistory();
            RenderCurrentPage(resetScroll: true);
        }
        catch (IOException)
        {
            ShowLocalWriteError();
        }
        catch (UnauthorizedAccessException)
        {
            ShowLocalWriteError();
        }
    }

    private async Task ConfirmClearLibraryAsync()
    {
        var dialog = new ContentDialog
        {
            Title = "Reset local library data?",
            Content = "This clears My List, History, and local playback positions from this device. This action cannot be undone.",
            PrimaryButtonText = "Reset local data",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = AppRoot.XamlRoot
        };

        if (await dialog.ShowAsync() != ContentDialogResult.Primary)
        {
            return;
        }

        try
        {
            _library.ClearLibrary();
            RenderCurrentPage(resetScroll: true);
        }
        catch (IOException)
        {
            ShowLocalWriteError();
        }
        catch (UnauthorizedAccessException)
        {
            ShowLocalWriteError();
        }
    }

}
