using Microsoft.UI.Dispatching;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls;
using VibeFlix.Windows.Models;
using VibeFlix.Windows.Services;
using Windows.Foundation;
using Windows.Media.Playback;

namespace VibeFlix.Windows;

public sealed partial class MainWindow
{
    private async void ShowTitleDetails(
        CatalogTitle title,
        ProgressEntry? resumeProgress = null,
        bool startPlayback = false)
    {
        var activeTitle = title;
        var detailCancellation = new CancellationTokenSource();
        var dispatcher = DispatcherQueue.GetForCurrentThread();
        var windowWidth = AppRoot.ActualWidth > 0 ? AppRoot.ActualWidth : 1024;
        var windowHeight = AppRoot.ActualHeight > 0 ? AppRoot.ActualHeight : 900;
        var compactDetails = windowWidth < 680;
        var dialog = new ContentDialog
        {
            Title = title.Name,
            CloseButtonText = "Close",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = AppRoot.XamlRoot,
            MaxWidth = Math.Clamp(windowWidth - 32, 320, 980)
        };
        var scroll = new ScrollViewer
        {
            MaxHeight = Math.Clamp(windowHeight - 120, 320, 720),
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled
        };
        var body = new StackPanel { Spacing = 16, Margin = new Thickness(0, 4, 0, 4) };
        var detailsPanel = new StackPanel { Spacing = 14 };
        var playerPanel = new StackPanel { Spacing = 10, Visibility = Visibility.Collapsed };
        var feedback = CreateText(string.Empty, 12, "#B8C2D0", TextWrapping.Wrap);
        var detailStatus = CreateText("Loading details from the selected provider…", 12, "#B8C2D0", TextWrapping.Wrap);
        var retryDetailsButton = CreateActionButton("Retry loading title details", () => { });
        retryDetailsButton.Visibility = Visibility.Collapsed;
        var detailsFeedback = CreateText(string.Empty, 12, "#B8C2D0", TextWrapping.Wrap);
        var playbackPositionText = CreateText("00:00 / 00:00", 11, "#AEB8C8");
        var playbackProgress = new ProgressBar
        {
            Minimum = 0,
            Maximum = 100,
            Value = 0,
            Height = 5,
            Foreground = Brush("#E34855"),
            Background = Brush("#343434")
        };
        var episodeRows = new StackPanel { Spacing = 7 };
        var episodeButtons = new Dictionary<string, (Button Button, string Label, string Synopsis)>(StringComparer.Ordinal);
        var seasonPicker = new ComboBox
        {
            Width = Math.Clamp(windowWidth - 96, 200, 360),
            HorizontalAlignment = HorizontalAlignment.Left,
            Visibility = Visibility.Collapsed
        };
        AutomationProperties.SetName(seasonPicker, "Select a season");
        AutomationProperties.SetHelpText(seasonPicker, "Choose a season to load its episodes.");
        AutomationProperties.SetName(episodeRows, "Episode selection");
        AutomationProperties.SetName(detailStatus, "Title details status");
        AutomationProperties.SetName(feedback, "Playback status");
        AutomationProperties.SetName(playbackProgress, "Playback progress");
        AutomationProperties.SetName(playbackPositionText, "Playback position and duration");
        Button? listButton = null;
        var playButton = CreateActionButton("▶  Play", () => { }, isPrimary: true);
        playButton.IsEnabled = false;
        var playbackStarted = false;
        var activePlaybackPath = string.Empty;
        var activeEpisodeKey = string.Empty;
        var activeEpisode = (MediaEpisode?)null;
        var activeSeasonIndex = -1;
        var pendingEpisodeNavigation = 0;
        var seasons = new List<MediaSeason>();
        var selectedStreamIndex = 0;
        ProviderPlaybackService.PlaybackResolution? resolution = null;
        TimeSpan? resumePosition = resumeProgress is { IsPreviewMarker: false, PositionMilliseconds: > 0 }
            ? TimeSpan.FromMilliseconds(resumeProgress.PositionMilliseconds)
            : null;
        var seasonRequestVersion = 0;
        var playbackGeneration = 0;
        var openedPlaybackGeneration = -1;
        CancellationTokenSource? playbackCancellation = null;
        TypedEventHandler<MediaPlayer, object>? mediaOpenedHandler = null;
        TypedEventHandler<MediaPlayer, MediaPlayerFailedEventArgs>? mediaFailedHandler = null;
        TypedEventHandler<MediaPlayer, object>? mediaEndedHandler = null;

        var detailHeader = new Grid
        {
            ColumnSpacing = compactDetails ? 0 : 18,
            RowSpacing = 14
        };
        var titlePoster = CreatePoster(title, 214);
        var copy = new StackPanel { Spacing = 9 };
        if (compactDetails)
        {
            detailHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            detailHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            titlePoster.Width = 148;
            titlePoster.HorizontalAlignment = HorizontalAlignment.Left;
            detailHeader.Children.Add(titlePoster);
        }
        else
        {
            detailHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(148) });
            detailHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            detailHeader.Children.Add(titlePoster);
        }

        var metadata = new[]
        {
            title.Year > 0 ? title.Year.ToString() : string.Empty,
            title.Rating,
            title.RuntimeLabel,
            title.Source
        }.Where(part => !string.IsNullOrWhiteSpace(part));
        copy.Children.Add(CreateText(string.Join("  ·  ", metadata), 12, "#B6C0CE", FontWeights.SemiBold, TextWrapping.Wrap));
        var synopsis = CreateText(
            string.IsNullOrWhiteSpace(title.Synopsis) ? "Provider details are loading." : title.Synopsis,
            13,
            "#D4D9E2",
            TextWrapping.Wrap);
        copy.Children.Add(synopsis);
        copy.Children.Add(detailsFeedback);
        var actions = new StackPanel { Spacing = 8, Margin = new Thickness(0, 2, 0, 0) };
        listButton = CreateActionButton(
            _library.IsSaved(title.Id) ? "Remove from My List" : "Add to My List",
            () => ToggleSavedFromDetails(activeTitle, listButton, detailsFeedback));
        actions.Children.Add(playButton);
        actions.Children.Add(listButton);
        actions.Children.Add(CreateActionButton("Mark watched manually", () => MarkWatchedFromDetails(activeTitle, detailsFeedback)));
        copy.Children.Add(actions);
        if (compactDetails)
        {
            Grid.SetRow(copy, 1);
        }
        else
        {
            Grid.SetColumn(copy, 1);
        }

        detailHeader.Children.Add(copy);
        detailsPanel.Children.Add(detailHeader);
        detailsPanel.Children.Add(detailStatus);
        detailsPanel.Children.Add(retryDetailsButton);

        var seasonPanel = new StackPanel { Spacing = 8, Visibility = Visibility.Collapsed };
        seasonPanel.Children.Add(CreateText("Episodes", 18, "#F0F2F7", FontWeights.SemiBold));
        seasonPanel.Children.Add(seasonPicker);
        seasonPanel.Children.Add(episodeRows);
        detailsPanel.Children.Add(seasonPanel);

        var mediaPlayerElement = new MediaPlayerElement
        {
            Height = Math.Clamp(windowWidth * 0.46, 220, 430),
            MinHeight = 200,
            AutoPlay = false,
            AreTransportControlsEnabled = true,
            RequestedTheme = ElementTheme.Dark
        };
        AutomationProperties.SetName(mediaPlayerElement, $"VibeFlix player for {title.Name}");
        mediaPlayerElement.SetMediaPlayer(_playback.Player);
        playerPanel.Children.Add(new Border
        {
            MinHeight = 220,
            CornerRadius = new CornerRadius(8),
            BorderBrush = Brush("#333333"),
            BorderThickness = new Thickness(1),
            Background = Brush("#050505"),
            Child = mediaPlayerElement
        });
        var playerTitle = CreateText(title.Name, 18, "#E9ECF2", FontWeights.SemiBold, TextWrapping.Wrap);
        playerPanel.Children.Add(playerTitle);
        playerPanel.Children.Add(feedback);
        playerPanel.Children.Add(playbackProgress);
        playerPanel.Children.Add(playbackPositionText);
        var playerActions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        var previousEpisodeButton = CreateActionButton("← Previous episode", () => { });
        var nextEpisodeButton = CreateActionButton("Next episode →", () => { });
        previousEpisodeButton.Visibility = title.IsSeries ? Visibility.Visible : Visibility.Collapsed;
        nextEpisodeButton.Visibility = title.IsSeries ? Visibility.Visible : Visibility.Collapsed;
        previousEpisodeButton.IsEnabled = false;
        nextEpisodeButton.IsEnabled = false;
        var tryNextStreamButton = CreateActionButton("Try another stream", () => { });
        tryNextStreamButton.Visibility = Visibility.Collapsed;
        var backToDetailsButton = CreateActionButton("Back to details", () => { });
        playerActions.Children.Add(previousEpisodeButton);
        playerActions.Children.Add(nextEpisodeButton);
        playerActions.Children.Add(tryNextStreamButton);
        playerActions.Children.Add(backToDetailsButton);
        playerPanel.Children.Add(playerActions);

        void UpdateResponsiveDetailsLayout(double width, double height)
        {
            var nextCompactLayout = width < 680;
            if (nextCompactLayout != compactDetails)
            {
                compactDetails = nextCompactLayout;
                detailHeader.RowDefinitions.Clear();
                detailHeader.ColumnDefinitions.Clear();
                if (compactDetails)
                {
                    detailHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                    detailHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                    titlePoster.Width = 148;
                    titlePoster.HorizontalAlignment = HorizontalAlignment.Left;
                    Grid.SetRow(titlePoster, 0);
                    Grid.SetColumn(titlePoster, 0);
                    Grid.SetRow(copy, 1);
                    Grid.SetColumn(copy, 0);
                }
                else
                {
                    detailHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(148) });
                    detailHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                    titlePoster.Width = double.NaN;
                    titlePoster.HorizontalAlignment = HorizontalAlignment.Stretch;
                    Grid.SetRow(titlePoster, 0);
                    Grid.SetColumn(titlePoster, 0);
                    Grid.SetRow(copy, 0);
                    Grid.SetColumn(copy, 1);
                }

                detailHeader.ColumnSpacing = compactDetails ? 0 : 18;
                detailHeader.RowSpacing = 14;
            }

            dialog.MaxWidth = Math.Clamp(width - 32, 320, 980);
            scroll.MaxHeight = Math.Clamp(height - 120, 320, 720);
            mediaPlayerElement.Height = Math.Clamp(width * 0.46, 220, 430);
            seasonPicker.Width = Math.Clamp(width - 96, 200, 360);
        }

        var detailsResizeHandler = new SizeChangedEventHandler((_, args) =>
            UpdateResponsiveDetailsLayout(args.NewSize.Width, args.NewSize.Height));

        body.Children.Add(detailsPanel);
        body.Children.Add(playerPanel);
        scroll.Content = body;
        dialog.Content = scroll;

        var progressTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(5) };
        progressTimer.Tick += (_, _) => SavePlaybackCheckpoint();
        playButton.Click += (_, _) => _ = StartSelectedPlaybackAsync();
        previousEpisodeButton.Click += (_, _) => _ = NavigateEpisodeAsync(-1);
        nextEpisodeButton.Click += (_, _) => _ = NavigateEpisodeAsync(1);
        tryNextStreamButton.Click += (_, _) => _ = StartNextStreamAsync();
        backToDetailsButton.Click += (_, _) => ReturnToDetails();

        void SetFeedback(string message, bool isError = false)
        {
            feedback.Text = message;
            feedback.Foreground = Brush(isError ? "#F0A69B" : "#A8D8BD");
        }

        void SetDetailsStatus(string message, bool isError = false)
        {
            detailStatus.Text = message;
            detailStatus.Foreground = Brush(isError ? "#F0A69B" : "#A8D8BD");
        }

        void UpdateEpisodeNavigationButtons()
        {
            var selectedEpisode = activeEpisode;
            if (selectedEpisode is null || activeSeasonIndex < 0 || activeSeasonIndex >= seasons.Count)
            {
                previousEpisodeButton.IsEnabled = false;
                nextEpisodeButton.IsEnabled = false;
                return;
            }

            var episodes = seasons[activeSeasonIndex].Episodes;
            var episodeIndex = episodes.ToList().FindIndex(episode => episode.Number == selectedEpisode.Number);
            previousEpisodeButton.IsEnabled = episodeIndex > 0 || activeSeasonIndex > 0;
            nextEpisodeButton.IsEnabled = episodeIndex >= 0
                && (episodeIndex < episodes.Count - 1 || activeSeasonIndex < seasons.Count - 1);
        }

        void SetSelectedEpisode(MediaSeason season, MediaEpisode episode, int seasonIndex)
        {
            activeSeasonIndex = seasonIndex;
            activeEpisode = episode;
            activeEpisodeKey = MakeEpisodeKey(season, episode);
            playButton.Content = "▶  Play selected episode";
            playButton.IsEnabled = true;
            detailsFeedback.Text = $"Selected  ·  S{season.Number:00} E{episode.Number:00}  ·  {episode.Name}";
            detailsFeedback.Foreground = Brush("#AEB8C8");
            SetDetailsStatus(string.Empty);
            foreach (var entry in episodeButtons)
            {
                var selected = string.Equals(entry.Key, activeEpisodeKey, StringComparison.Ordinal);
                entry.Value.Button.Tag = selected ? "SelectedEpisode" : null;
                entry.Value.Button.Content = $"{(selected ? "✓" : "  ")}  {entry.Value.Label}";
                entry.Value.Button.Background = Brush(selected ? "#2B1417" : "#232323");
                entry.Value.Button.BorderBrush = Brush(selected ? "#E34855" : "#232323");
                AutomationProperties.SetHelpText(
                    entry.Value.Button,
                    selected
                        ? $"Selected episode. Press Play selected episode to start. {entry.Value.Synopsis}".Trim()
                        : $"Select this episode. {entry.Value.Synopsis}".Trim());
            }

            UpdateEpisodeNavigationButtons();
        }

        void DrawEpisodeRows(MediaSeason season, int seasonIndex)
        {
            episodeRows.Children.Clear();
            episodeButtons.Clear();
            if (season.Episodes.Count == 0)
            {
                episodeRows.Children.Add(CreateCompactEmptyState("No episodes returned.", "Try selecting this season again later."));
                activeEpisode = null;
                activeEpisodeKey = string.Empty;
                pendingEpisodeNavigation = 0;
                playButton.IsEnabled = false;
                UpdateEpisodeNavigationButtons();
                return;
            }

            foreach (var episode in season.Episodes)
            {
                var label = $"{episode.Number:00}  ·  {episode.Name}{(episode.RuntimeMinutes > 0 ? $"  ·  {episode.RuntimeMinutes} min" : string.Empty)}";
                var episodeButton = CreateActionButton(label, () => SetSelectedEpisode(season, episode, seasonIndex));
                episodeButton.HorizontalAlignment = HorizontalAlignment.Stretch;
                episodeButton.HorizontalContentAlignment = HorizontalAlignment.Left;
                AutomationProperties.SetName(episodeButton, $"Select season {season.Number}, episode {episode.Number}: {episode.Name}");
                AutomationProperties.SetHelpText(
                    episodeButton,
                    string.IsNullOrWhiteSpace(episode.Synopsis)
                        ? "Select this episode, then use Play selected episode to start playback."
                        : $"Select this episode, then use Play selected episode to start playback. {episode.Synopsis}");
                ToolTipService.SetToolTip(episodeButton, string.IsNullOrWhiteSpace(episode.Synopsis) ? label : episode.Synopsis);
                episodeButtons[MakeEpisodeKey(season, episode)] = (episodeButton, label, episode.Synopsis);
                episodeRows.Children.Add(episodeButton);
            }

            var preferredEpisode = resumeProgress is not null
                ? season.Episodes.FirstOrDefault(episode =>
                    string.Equals(MakeEpisodeKey(season, episode), resumeProgress.EpisodeKey, StringComparison.Ordinal))
                : null;
            SetSelectedEpisode(season, preferredEpisode ?? season.Episodes[0], seasonIndex);
        }

        async Task LoadSeasonEpisodesAsync(int seasonIndex)
        {
            if (seasonIndex < 0 || seasonIndex >= seasons.Count || detailCancellation.IsCancellationRequested)
            {
                return;
            }

            activeSeasonIndex = seasonIndex;
            activeEpisode = null;
            activeEpisodeKey = string.Empty;
            playButton.IsEnabled = false;
            var request = ++seasonRequestVersion;
            episodeRows.Children.Clear();
            episodeButtons.Clear();
            episodeRows.Children.Add(CreateCompactEmptyState("Loading episodes…", "Fetching this season from the selected provider."));
            try
            {
                var loadedEpisodes = await _catalogSources.LoadSeasonEpisodesAsync(
                    activeTitle,
                    seasons[seasonIndex],
                    detailCancellation.Token);
                if (request != seasonRequestVersion || detailCancellation.IsCancellationRequested)
                {
                    return;
                }

                seasons[seasonIndex] = seasons[seasonIndex] with { Episodes = loadedEpisodes };
                activeTitle = activeTitle with { Seasons = seasons.ToArray() };
                _titleCache[activeTitle.Id] = activeTitle;
                if (_library.IsKnownTitle(activeTitle.Id))
                {
                    _library.UpsertTitle(activeTitle);
                }

                if (seasonPicker.Items[seasonIndex] is ComboBoxItem seasonItem)
                {
                    seasonItem.Content = FormatSeasonLabel(seasons[seasonIndex]);
                }

                DrawEpisodeRows(seasons[seasonIndex], seasonIndex);
                if (pendingEpisodeNavigation != 0 && seasons[seasonIndex].Episodes.Count > 0)
                {
                    var direction = pendingEpisodeNavigation;
                    pendingEpisodeNavigation = 0;
                    var targetEpisode = direction > 0
                        ? seasons[seasonIndex].Episodes[0]
                        : seasons[seasonIndex].Episodes[^1];
                    SetSelectedEpisode(seasons[seasonIndex], targetEpisode, seasonIndex);
                    await StartSelectedPlaybackAsync();
                }
                else if (startPlayback && seasons[seasonIndex].Episodes.Count > 0)
                {
                    if (resumeProgress is { IsPreviewMarker: false }
                        && !string.Equals(activeEpisodeKey, resumeProgress.EpisodeKey, StringComparison.Ordinal))
                    {
                        startPlayback = false;
                        SetDetailsStatus("The saved episode is no longer available. Select an episode to continue.", isError: true);
                    }
                    else
                    {
                        startPlayback = false;
                        await StartSelectedPlaybackAsync();
                    }
                }
                else if (resumeProgress is not null && activeEpisode is not null
                    && string.Equals(activeEpisodeKey, resumeProgress.EpisodeKey, StringComparison.Ordinal))
                {
                    detailsFeedback.Text = $"Resume  ·  {FormatPlaybackTime(resumePosition ?? TimeSpan.Zero)}";
                }
            }
            catch (OperationCanceledException) when (detailCancellation.IsCancellationRequested)
            {
                // The dialog was closed or another season selection superseded this request.
            }
            catch (Exception)
            {
                if (request == seasonRequestVersion && !detailCancellation.IsCancellationRequested)
                {
                    episodeRows.Children.Clear();
                    episodeButtons.Clear();
                    episodeRows.Children.Add(CreateCompactEmptyState(
                        "Episodes are unavailable.",
                        "The provider could not return this season. Check your connection and retry."));
                    var retryEpisodesButton = CreateActionButton(
                        "Retry loading episodes",
                        () => _ = LoadSeasonEpisodesAsync(seasonIndex),
                        isPrimary: true);
                    episodeRows.Children.Add(retryEpisodesButton);
                    pendingEpisodeNavigation = 0;
                    activeEpisode = null;
                    activeEpisodeKey = string.Empty;
                    playButton.IsEnabled = false;
                    UpdateEpisodeNavigationButtons();
                    SetDetailsStatus("Could not load episodes from the selected provider.", isError: true);
                }
            }
        }

        async Task PopulateTitleDetailsAsync()
        {
            try
            {
                var details = await _catalogSources.LoadDetailsAsync(activeTitle, detailCancellation.Token);
                if (detailCancellation.IsCancellationRequested)
                {
                    return;
                }

                activeTitle = activeTitle with
                {
                    Year = details.Year > 0 ? details.Year : activeTitle.Year,
                    Rating = string.IsNullOrWhiteSpace(details.Rating) ? activeTitle.Rating : details.Rating,
                    RuntimeMinutes = details.RuntimeMinutes > 0 ? details.RuntimeMinutes : activeTitle.RuntimeMinutes,
                    Synopsis = string.IsNullOrWhiteSpace(details.Synopsis) ? activeTitle.Synopsis : details.Synopsis,
                    Language = string.IsNullOrWhiteSpace(details.Language) ? activeTitle.Language : details.Language,
                    Genres = details.Genres.Count == 0 ? activeTitle.Genres : details.Genres,
                    Seasons = details.Seasons.Count == 0 ? activeTitle.Seasons : details.Seasons
                };
                _titleCache[activeTitle.Id] = activeTitle;
                if (_library.IsKnownTitle(activeTitle.Id))
                {
                    _library.UpsertTitle(activeTitle);
                }

                synopsis.Text = activeTitle.Synopsis;
                var updatedMetadata = new[]
                {
                    activeTitle.Year > 0 ? activeTitle.Year.ToString() : string.Empty,
                    activeTitle.Rating,
                    activeTitle.RuntimeLabel,
                    activeTitle.Source,
                    activeTitle.Language,
                    string.Join("  /  ", activeTitle.Genres)
                }.Where(part => !string.IsNullOrWhiteSpace(part));
                detailsFeedback.Text = string.Join("  ·  ", updatedMetadata);
                detailsFeedback.Foreground = Brush("#AEB8C8");
                SetDetailsStatus(string.Empty);
                retryDetailsButton.Visibility = Visibility.Collapsed;

                if (activeTitle.IsSeries)
                {
                    seasons = activeTitle.Seasons.OrderBy(season => season.Number).ToList();
                    seasonPanel.Visibility = Visibility.Visible;
                    seasonPicker.Items.Clear();
                    foreach (var season in seasons)
                    {
                        seasonPicker.Items.Add(new ComboBoxItem { Content = FormatSeasonLabel(season) });
                    }

                    if (seasons.Count == 0)
                    {
                        episodeRows.Children.Add(CreateCompactEmptyState("No seasons returned.", "The provider has not listed episodes for this series."));
                        playButton.IsEnabled = false;
                        if (startPlayback)
                        {
                            SetDetailsStatus("This series has no provider episode list to play.", isError: true);
                        }

                        return;
                    }

                    var resumeSeason = resumeProgress is null
                        ? -1
                        : seasons.FindIndex(season => season.Number == ParseEpisodeKey(resumeProgress.EpisodeKey).Season);
                    var initialSeason = resumeSeason >= 0 ? resumeSeason : 0;
                    seasonPicker.SelectedIndex = initialSeason;
                    seasonPicker.SelectionChanged += async (_, _) =>
                    {
                        if (seasonPicker.SelectedIndex >= 0)
                        {
                            await LoadSeasonEpisodesAsync(seasonPicker.SelectedIndex);
                        }
                    };
                    await LoadSeasonEpisodesAsync(initialSeason);
                }
                else
                {
                    playButton.IsEnabled = true;
                    if (startPlayback)
                    {
                        await StartSelectedPlaybackAsync();
                    }
                }
            }
            catch (OperationCanceledException) when (detailCancellation.IsCancellationRequested)
            {
                // Dialog closed before the provider returned details.
            }
            catch (Exception)
            {
                if (!detailCancellation.IsCancellationRequested)
                {
                    SetDetailsStatus(
                        activeTitle.IsSeries
                            ? "Provider details could not be loaded. Retry to load this series and its episodes."
                            : "Provider details could not be loaded. You can still try Play.",
                        isError: true);
                    retryDetailsButton.Visibility = Visibility.Visible;
                    playButton.IsEnabled = !activeTitle.IsSeries;
                }
            }
        }

        retryDetailsButton.Click += (_, _) =>
        {
            retryDetailsButton.Visibility = Visibility.Collapsed;
            SetDetailsStatus("Loading details from the selected provider…");
            _ = PopulateTitleDetailsAsync();
        };

        async Task NavigateEpisodeAsync(int offset)
        {
            if (offset == 0 || activeSeasonIndex < 0 || activeSeasonIndex >= seasons.Count || activeEpisode is null)
            {
                return;
            }

            var currentEpisodes = seasons[activeSeasonIndex].Episodes;
            var currentIndex = currentEpisodes.ToList().FindIndex(episode => episode.Number == activeEpisode.Number);
            var targetIndex = currentIndex + Math.Sign(offset);
            if (currentIndex < 0)
            {
                return;
            }

            if (targetIndex >= 0 && targetIndex < currentEpisodes.Count)
            {
                SetSelectedEpisode(seasons[activeSeasonIndex], currentEpisodes[targetIndex], activeSeasonIndex);
                await StartSelectedPlaybackAsync();
                return;
            }

            var targetSeasonIndex = activeSeasonIndex + Math.Sign(offset);
            if (targetSeasonIndex < 0 || targetSeasonIndex >= seasons.Count)
            {
                return;
            }

            pendingEpisodeNavigation = Math.Sign(offset);
            seasonPicker.SelectedIndex = targetSeasonIndex;
        }

        async Task StartNextStreamAsync()
        {
            var currentResolution = resolution;
            var currentPlaybackCancellation = playbackCancellation;
            if (currentResolution is null || selectedStreamIndex + 1 >= currentResolution.Streams.Count
                || currentPlaybackCancellation is null || currentPlaybackCancellation.IsCancellationRequested)
            {
                return;
            }

            selectedStreamIndex++;
            playbackGeneration++;
            openedPlaybackGeneration = -1;
            progressTimer.Stop();
            playbackStarted = false;
            _playback.ClearSource();
            await LoadCurrentStreamAsync(playbackGeneration, currentPlaybackCancellation.Token);
        }

        async Task LoadCurrentStreamAsync(int generation, CancellationToken cancellationToken)
        {
            var currentResolution = resolution;
            if (currentResolution is null || selectedStreamIndex >= currentResolution.Streams.Count
                || cancellationToken.IsCancellationRequested)
            {
                return;
            }

            var stream = currentResolution.Streams[selectedStreamIndex];
            SetFeedback($"Connecting to {stream.Server}…");
            try
            {
                await _playback.LoadAsync(stream, cancellationToken);
                if (generation != playbackGeneration || cancellationToken.IsCancellationRequested)
                {
                    return;
                }

                playbackStarted = true;
                _playback.Play();
                progressTimer.Start();
                tryNextStreamButton.Visibility = selectedStreamIndex + 1 < currentResolution.Streams.Count
                    ? Visibility.Visible
                    : Visibility.Collapsed;
                SetFeedback("Playback started. Stream addresses remain in memory only.");
                if (openedPlaybackGeneration == generation)
                {
                    ApplyPendingResume(generation);
                }
                else
                {
                    UpdatePlaybackPosition();
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // A new playback request or a closed dialog superseded this stream.
            }
            catch (Exception)
            {
                if (generation != playbackGeneration || cancellationToken.IsCancellationRequested)
                {
                    return;
                }

                playbackStarted = false;
                progressTimer.Stop();
                if (selectedStreamIndex + 1 < currentResolution.Streams.Count)
                {
                    tryNextStreamButton.Visibility = Visibility.Visible;
                    SetFeedback("This stream could not start. Try another available stream.", isError: true);
                }
                else
                {
                    tryNextStreamButton.Visibility = Visibility.Collapsed;
                    SetFeedback("Windows could not start this provider stream. Try again later.", isError: true);
                }
            }
        }

        void ApplyPendingResume(int generation)
        {
            if (generation != playbackGeneration || !playbackStarted || resumePosition is not TimeSpan target)
            {
                UpdatePlaybackPosition();
                return;
            }

            resumePosition = null;
            var session = _playback.Player.PlaybackSession;
            if (!session.CanSeek || session.NaturalDuration <= TimeSpan.Zero)
            {
                SetFeedback("This provider stream cannot seek to the saved position. Playback started from the beginning.");
                UpdatePlaybackPosition();
                return;
            }

            var safeTarget = session.NaturalDuration - TimeSpan.FromMilliseconds(250);
            if (safeTarget < TimeSpan.Zero)
            {
                safeTarget = TimeSpan.Zero;
            }

            _playback.Pause();
            _playback.SeekTo(target > safeTarget ? safeTarget : target);
            _playback.Play();
            UpdatePlaybackPosition();
        }

        void UpdatePlaybackPosition()
        {
            if (!playbackStarted)
            {
                return;
            }

            var session = _playback.Player.PlaybackSession;
            var duration = session.NaturalDuration;
            var position = session.Position;
            playbackPositionText.Text = $"{FormatPlaybackTime(position)} / {FormatPlaybackTime(duration)}";
            playbackProgress.Value = duration > TimeSpan.Zero
                ? Math.Clamp(position.TotalMilliseconds * 100 / duration.TotalMilliseconds, 0, 100)
                : 0;
        }

        void SavePlaybackCheckpoint(bool ended = false)
        {
            if (!playbackStarted || string.IsNullOrWhiteSpace(activePlaybackPath))
            {
                return;
            }

            try
            {
                var session = _playback.Player.PlaybackSession;
                var duration = session.NaturalDuration;
                var position = session.Position;
                if (ended && duration > TimeSpan.Zero)
                {
                    position = duration;
                }

                if (duration <= TimeSpan.Zero || (position < TimeSpan.FromSeconds(5) && !ended))
                {
                    UpdatePlaybackPosition();
                    return;
                }

                var finalEpisode = !activeTitle.IsSeries;
                if (activeTitle.IsSeries && activeSeasonIndex >= 0 && activeSeasonIndex < seasons.Count)
                {
                    var currentEpisodes = seasons[activeSeasonIndex].Episodes;
                    finalEpisode = activeSeasonIndex == seasons.Count - 1
                        && currentEpisodes.Count > 0
                        && activeEpisode is not null
                        && activeEpisode.Number >= currentEpisodes.Max(episode => episode.Number);
                }

                var completed = duration > TimeSpan.Zero
                    && position.TotalMilliseconds / duration.TotalMilliseconds >= 0.95
                    && finalEpisode;
                _library.SavePlaybackProgress(
                    activeTitle.Id,
                    activeEpisodeKey,
                    Math.Max(0, (long)position.TotalMilliseconds),
                    Math.Max(0, (long)duration.TotalMilliseconds),
                    titleCompleted: completed);
                if (!_windowClosed)
                {
                    RenderCurrentPage(resetScroll: false);
                }

                if (completed)
                {
                    playbackStarted = false;
                    progressTimer.Stop();
                    SetFeedback("Title completed and added to History.");
                }
                else
                {
                    UpdatePlaybackPosition();
                }
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                SetFeedback("Playback continues, but VibeFlix could not save this resume point.", isError: true);
            }
        }

        async Task StartSelectedPlaybackAsync()
        {
            if (detailCancellation.IsCancellationRequested || (activeTitle.IsSeries && activeEpisode is null))
            {
                if (activeTitle.IsSeries)
                {
                    SetFeedback("Select an episode before starting playback.", isError: true);
                }

                return;
            }

            if (playbackStarted)
            {
                SavePlaybackCheckpoint();
            }

            playbackCancellation?.Cancel();
            playbackCancellation?.Dispose();
            playbackCancellation = CancellationTokenSource.CreateLinkedTokenSource(detailCancellation.Token);
            var requestToken = playbackCancellation.Token;
            var generation = ++playbackGeneration;
            openedPlaybackGeneration = -1;
            progressTimer.Stop();
            _playback.ClearSource();
            selectedStreamIndex = 0;
            resolution = null;
            activePlaybackPath = activeEpisode?.CatalogPath ?? activeTitle.CatalogPath;
            if (string.IsNullOrWhiteSpace(activePlaybackPath))
            {
                SetDetailsStatus("This title has no provider playback page.", isError: true);
                return;
            }

            activeEpisodeKey = activeTitle.IsSeries && activeSeasonIndex >= 0 && activeEpisode is not null
                ? MakeEpisodeKey(seasons[activeSeasonIndex], activeEpisode)
                : string.Empty;
            var matchingResume = resumeProgress is not null
                && (resumeProgress.IsPreviewMarker
                    || string.Equals(resumeProgress.EpisodeKey, activeEpisodeKey, StringComparison.Ordinal));
            var storedProgress = matchingResume
                ? resumeProgress
                : _library.GetProgress(activeTitle.Id, activeEpisodeKey);
            resumePosition = storedProgress is { IsPreviewMarker: false, PositionMilliseconds: > 0 }
                ? TimeSpan.FromMilliseconds(storedProgress.PositionMilliseconds)
                : null;
            resumeProgress = null;

            detailsPanel.Visibility = Visibility.Collapsed;
            playerPanel.Visibility = Visibility.Visible;
            playerTitle.Text = activeEpisode is null
                ? activeTitle.Name
                : $"{activeTitle.Name}  ·  S{seasons[activeSeasonIndex].Number:00} E{activeEpisode.Number:00}  ·  {activeEpisode.Name}";
            dialog.Title = $"Playing  ·  {activeTitle.Name}";
            SetFeedback("Resolving a provider stream…");
            playbackPositionText.Text = "00:00 / 00:00";
            playbackProgress.Value = 0;
            tryNextStreamButton.Visibility = Visibility.Collapsed;
            playbackStarted = false;

            try
            {
                _library.UpsertTitle(activeTitle);
                _titleCache[activeTitle.Id] = activeTitle;
                resolution = await _providerPlayback.ResolveAsync(
                    activeTitle,
                    activeEpisode?.CatalogPath,
                    requestToken);
                if (generation != playbackGeneration || requestToken.IsCancellationRequested)
                {
                    return;
                }

                if (!string.IsNullOrWhiteSpace(resolution.ResolvedCatalogPath)
                    && activeTitle.IsSeries
                    && activeEpisode is not null
                    && !resolution.ResolvedCatalogPath.Equals(activeEpisode.CatalogPath, StringComparison.Ordinal))
                {
                    activePlaybackPath = resolution.ResolvedCatalogPath;
                }

                await LoadCurrentStreamAsync(generation, requestToken);
            }
            catch (OperationCanceledException) when (requestToken.IsCancellationRequested)
            {
                // A new playback request or a closed dialog superseded this resolution.
            }
            catch (ProviderPlaybackService.PlaybackResolutionException exception)
            {
                if (generation == playbackGeneration && !requestToken.IsCancellationRequested)
                {
                    SetFeedback(exception.Message, isError: true);
                }
            }
            catch (Exception)
            {
                if (generation == playbackGeneration && !requestToken.IsCancellationRequested)
                {
                    SetFeedback("The selected provider could not prepare playback. Try again later.", isError: true);
                }
            }
        }

        void ReturnToDetails()
        {
            if (playbackStarted)
            {
                SavePlaybackCheckpoint();
            }

            playbackCancellation?.Cancel();
            playbackGeneration++;
            openedPlaybackGeneration = -1;
            progressTimer.Stop();
            _playback.ClearSource();
            playbackStarted = false;
            playerPanel.Visibility = Visibility.Collapsed;
            detailsPanel.Visibility = Visibility.Visible;
            dialog.Title = activeTitle.Name;
            SetFeedback(string.Empty);
        }

        void DetachPlayerHandlers()
        {
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

            if (mediaEndedHandler is not null)
            {
                _playback.Player.MediaEnded -= mediaEndedHandler;
                mediaEndedHandler = null;
            }
        }

        void AttachPlayerHandlers()
        {
            DetachPlayerHandlers();
            mediaOpenedHandler = (_, _) =>
            {
                var generation = playbackGeneration;
                dispatcher.TryEnqueue(() =>
                {
                    if (generation != playbackGeneration || detailCancellation.IsCancellationRequested)
                    {
                        return;
                    }

                    openedPlaybackGeneration = generation;
                    ApplyPendingResume(generation);
                });
            };
            mediaFailedHandler = (_, _) =>
            {
                var generation = playbackGeneration;
                dispatcher.TryEnqueue(() =>
                {
                    if (generation != playbackGeneration || resolution is null
                        || playerPanel.Visibility != Visibility.Visible)
                    {
                        return;
                    }

                    playbackStarted = false;
                    progressTimer.Stop();
                    tryNextStreamButton.Visibility = resolution is not null
                        && selectedStreamIndex + 1 < resolution.Streams.Count
                            ? Visibility.Visible
                            : Visibility.Collapsed;
                    SetFeedback("The provider stream stopped. Try another available stream or retry playback.", isError: true);
                });
            };
            mediaEndedHandler = (_, _) =>
            {
                var generation = playbackGeneration;
                dispatcher.TryEnqueue(() =>
                {
                    if (generation == playbackGeneration)
                    {
                        SavePlaybackCheckpoint(ended: true);
                    }
                });
            };
            _playback.Player.MediaOpened += mediaOpenedHandler;
            _playback.Player.MediaFailed += mediaFailedHandler;
            _playback.Player.MediaEnded += mediaEndedHandler;
        }

        async Task PopulateAndMaybePlayAsync()
        {
            await PopulateTitleDetailsAsync();
        }

        _flushPlaybackOnClose = () =>
        {
            detailCancellation.Cancel();
            playbackCancellation?.Cancel();
            progressTimer.Stop();
            if (playbackStarted)
            {
                SavePlaybackCheckpoint();
            }

            playbackGeneration++;
            _playback.ClearSource();
        };

        AppRoot.SizeChanged += detailsResizeHandler;
        UpdateResponsiveDetailsLayout(AppRoot.ActualWidth, AppRoot.ActualHeight);
        AttachPlayerHandlers();
        var dialogOperation = dialog.ShowAsync();
        var detailsLoad = PopulateAndMaybePlayAsync();
        try
        {
            await dialogOperation;
        }
        finally
        {
            AppRoot.SizeChanged -= detailsResizeHandler;
            detailCancellation.Cancel();
            playbackCancellation?.Cancel();
            seasonRequestVersion++;
            playbackGeneration++;
            progressTimer.Stop();
            if (playbackStarted)
            {
                SavePlaybackCheckpoint();
            }

            DetachPlayerHandlers();
            _playback.ClearSource();
            playbackStarted = false;
            if (_flushPlaybackOnClose is not null)
            {
                _flushPlaybackOnClose = null;
            }

            try
            {
                await detailsLoad;
            }
            catch (OperationCanceledException)
            {
                // Closing the details dialog cancels unfinished provider work.
            }

            playbackCancellation?.Dispose();
            playbackCancellation = null;
            detailCancellation.Dispose();
            if (!_windowClosed)
            {
                RenderCurrentPage(resetScroll: false);
            }
        }

    }

    private void ResumePlayback(CatalogTitle title, ProgressEntry progress)
    {
        ShowTitleDetails(title, progress, startPlayback: true);
    }

    private void ToggleSavedFromDetails(CatalogTitle title, Button? listButton, TextBlock feedback)
    {
        try
        {
            _library.UpsertTitle(title);
            _titleCache[title.Id] = title;
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
            _library.UpsertTitle(title);
            _titleCache[title.Id] = title;
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

    private static (int Season, int Episode) ParseEpisodeKey(string key)
    {
        var match = System.Text.RegularExpressions.Regex.Match(key, @"^S([0-9]{2,3})E([0-9]{2,5})$", System.Text.RegularExpressions.RegexOptions.CultureInvariant);
        return match.Success && int.TryParse(match.Groups[1].Value, out var season)
            && int.TryParse(match.Groups[2].Value, out var episode)
                ? (season, episode)
                : (0, 0);
    }

    private static string FormatSeasonLabel(MediaSeason season)
    {
        var name = string.IsNullOrWhiteSpace(season.Name) ? $"Season {season.Number}" : season.Name;
        return season.Episodes.Count == 0 ? name : $"{name}  ·  {season.Episodes.Count} episodes";
    }

    private static string FormatPlaybackTime(TimeSpan value)
    {
        if (value < TimeSpan.Zero)
        {
            value = TimeSpan.Zero;
        }

        var hours = (long)value.TotalHours;
        return hours > 0
            ? $"{hours:00}:{value.Minutes:00}:{value.Seconds:00}"
            : $"{value.Minutes:00}:{value.Seconds:00}";
    }

    private async Task ConfirmClearHistoryAsync()
    {
        var dialog = new ContentDialog
        {
            Title = "Clear local History?",
            Content = "This removes local History entries and the resume positions for those titles. My List is not changed.",
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
            Title = "Clear local library data?",
            Content = "This clears My List, History, saved title metadata, and local playback positions from this device. This action cannot be undone.",
            PrimaryButtonText = "Clear local data",
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
            _titleCache.Clear();
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
