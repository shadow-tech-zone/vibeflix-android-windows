using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml.Controls;
using VibeFlix.Windows.Models;

namespace VibeFlix.Windows;

public sealed partial class MainWindow
{
    private async void ShowTitleDetails(CatalogTitle title)
    {
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

        var selectedEpisodeIndex = -1;
        var captionsPreviewEnabled = false;
        Action<int?> openPlayerPreview = _ => { };

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
            "Fictional sample title. Provider metadata and playback are not connected.",
            10, "#8D99AA", TextWrapping.Wrap));

        var actions = new StackPanel { Spacing = 8, Margin = new Thickness(0, 2, 0, 0) };
        Button? listButton = null;
        listButton = CreateActionButton(
            _library.IsSaved(title.Id) ? "Remove from My List" : "Add to My List",
            () => ToggleSavedFromDetails(title, listButton, statusText));
        actions.Children.Add(listButton);
        actions.Children.Add(CreateActionButton("Mark watched", () => MarkWatchedFromDetails(title, statusText)));
        actions.Children.Add(CreateActionButton("Open player preview", () => openPlayerPreview(null)));
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
                        () => openPlayerPreview(option));
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

        var playerEpisodeText = CreateText(title.Name, 18, "#E9ECF2", FontWeights.SemiBold, TextWrapping.Wrap);
        var playerMessage = CreateText(
            "A provider stream resolver is not connected. No media is being requested or played.",
            12, "#A2ADBE", TextWrapping.Wrap);
        var captionHeading = CreateText("SAMPLE CAPTIONS  ·  NOT TIMED TO MEDIA", 9, "#B9ACF6", FontWeights.SemiBold, characterSpacing: 70);
        var captionText = CreateText(string.Empty, 16, "#FFFFFF", FontWeights.SemiBold, TextWrapping.Wrap);
        var captionPreview = new Border
        {
            Padding = new Thickness(14, 10, 14, 10),
            CornerRadius = new CornerRadius(9),
            Background = Brush("#C9000000"),
            HorizontalAlignment = HorizontalAlignment.Center,
            Visibility = Visibility.Collapsed,
            Child = new StackPanel { Spacing = 6, Children = { captionHeading, captionText } }
        };
        var playerContent = new StackPanel
        {
            VerticalAlignment = VerticalAlignment.Center,
            HorizontalAlignment = HorizontalAlignment.Center,
            Spacing = 10,
            Children =
            {
                CreateText("PLAYER PREVIEW", 10, "#B6A8F5", FontWeights.SemiBold, characterSpacing: 100),
                playerEpisodeText,
                playerMessage,
                captionPreview
            }
        };
        var playerSurface = new Border
        {
            MinHeight = 230,
            Padding = new Thickness(20),
            CornerRadius = new CornerRadius(14),
            BorderBrush = Brush("#394456"),
            BorderThickness = new Thickness(1),
            Background = Brush("#121721"),
            Child = playerContent
        };
        playerPanel.Children.Add(playerSurface);
        playerPanel.Children.Add(CreateText(
            "This is a non-playing UI preview. The caption switch below previews sample text only; no timed subtitle track is loaded.",
            11, "#909CAD", TextWrapping.Wrap));

        var playerControls = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        var audioButton = CreateActionButton("Audio · unavailable", () => { });
        audioButton.IsEnabled = false;
        ToolTipService.SetToolTip(audioButton, "Audio tracks become available when Windows playback is connected.");
        playerControls.Children.Add(audioButton);
        var captionsButton = CreateActionButton("CC · Off", () =>
        {
            captionsPreviewEnabled = !captionsPreviewEnabled;
            UpdatePlayerPreview();
        });
        playerControls.Children.Add(captionsButton);
        playerPanel.Children.Add(playerControls);

        var episodeNavigation = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        var previousEpisodeButton = CreateActionButton("← Previous episode", () => NavigateEpisode(-1));
        var nextEpisodeButton = CreateActionButton("Next episode →", () => NavigateEpisode(1));
        previousEpisodeButton.IsEnabled = false;
        nextEpisodeButton.IsEnabled = false;
        episodeNavigation.Children.Add(previousEpisodeButton);
        episodeNavigation.Children.Add(nextEpisodeButton);
        playerPanel.Children.Add(episodeNavigation);

        playerPanel.Children.Add(CreateActionButton(
            "Add 35% sample resume marker",
            () => AddPreviewProgress(title, playerFeedback),
            isPrimary: true));
        playerPanel.Children.Add(CreateActionButton("Mark watched", () => MarkWatchedFromDetails(title, playerFeedback)));
        playerPanel.Children.Add(playerFeedback);
        playerPanel.Children.Add(CreateActionButton("Back to title details", () =>
        {
            playerPanel.Visibility = Visibility.Collapsed;
            detailsPanel.Visibility = Visibility.Visible;
            dialog.Title = title.Name;
        }));

        void UpdatePlayerPreview()
        {
            var episode = selectedEpisodeIndex >= 0 && selectedEpisodeIndex < episodeOptions.Count
                ? episodeOptions[selectedEpisodeIndex].Episode
                : null;
            playerEpisodeText.Text = episode is null
                ? title.Name
                : $"{title.Name}  ·  S{episodeOptions[selectedEpisodeIndex].SeasonIndex + 1} E{episode.Number:00}\n{episode.Name}";
            playerMessage.Text = episode is null
                ? "A provider stream resolver is not connected. No media is being requested or played."
                : $"{episode.RuntimeMinutes} min  ·  {episode.Synopsis}\nNo episode stream is loaded.";
            captionText.Text = episode?.CaptionPreview is { Length: > 0 } sample
                ? $"“{sample}”"
                : "No sample caption text is available for this title.";
            captionPreview.Visibility = captionsPreviewEnabled ? Visibility.Visible : Visibility.Collapsed;
            captionsButton.Content = captionsPreviewEnabled ? "CC · Preview on" : "CC · Off";
            AutomationProperties.SetName(captionsButton,
                captionsPreviewEnabled ? "Turn off sample captions preview" : "Show sample captions preview");
            previousEpisodeButton.IsEnabled = selectedEpisodeIndex > 0;
            nextEpisodeButton.IsEnabled = selectedEpisodeIndex >= 0 && selectedEpisodeIndex < episodeOptions.Count - 1;
        }

        void OpenPlayerPreview(int? episodeIndex)
        {
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

            playerFeedback.Text = string.Empty;
            UpdatePlayerPreview();
            detailsPanel.Visibility = Visibility.Collapsed;
            playerPanel.Visibility = Visibility.Visible;
            if (selectedEpisodeIndex >= 0)
            {
                var option = episodeOptions[selectedEpisodeIndex];
                dialog.Title = $"Playback preview  ·  S{option.SeasonIndex + 1} E{option.Episode.Number:00}";
            }
            else
            {
                dialog.Title = $"Playback preview  ·  {title.Name}";
            }
        }

        void NavigateEpisode(int offset)
        {
            var nextIndex = selectedEpisodeIndex + offset;
            if (nextIndex >= 0 && nextIndex < episodeOptions.Count)
            {
                OpenPlayerPreview(nextIndex);
            }
        }

        openPlayerPreview = OpenPlayerPreview;
        body.Children.Add(detailsPanel);
        body.Children.Add(playerPanel);
        scroll.Content = body;
        dialog.Content = scroll;
        await dialog.ShowAsync();
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
            feedback.Text = "Marked watched in the local preview History. No media was played.";
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

    private void AddPreviewProgress(CatalogTitle title, TextBlock feedback)
    {
        try
        {
            _library.AddPreviewProgress(title.Id, 35);
            feedback.Foreground = Brush("#A8D8BD");
            feedback.Text = "Saved a 35% sample resume marker locally. This is not actual playback progress.";
            RenderCurrentPage(resetScroll: false);
        }
        catch (IOException)
        {
            feedback.Foreground = Brush("#F0A69B");
            feedback.Text = "Could not save the local preview marker. Check storage permissions and try again.";
        }
        catch (UnauthorizedAccessException)
        {
            feedback.Foreground = Brush("#F0A69B");
            feedback.Text = "Could not save the local preview marker. Check storage permissions and try again.";
        }
    }

    private async Task ConfirmClearHistoryAsync()
    {
        var dialog = new ContentDialog
        {
            Title = "Clear local History?",
            Content = "This removes the History entries stored by this Windows preview. My List and resume markers will remain.",
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
            Title = "Reset local preview data?",
            Content = "This clears My List, History, and sample resume markers from this device. This action cannot be undone.",
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
