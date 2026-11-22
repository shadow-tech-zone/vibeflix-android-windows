using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using VibeFlix.Windows.Models;
using VibeFlix.Windows.Services;
using Windows.System;

namespace VibeFlix.Windows;

public sealed partial class MainWindow : Window
{
    private readonly LocalLibraryStore _library = new();
    private readonly IReadOnlyList<CatalogTitle> _catalog = DemoCatalog.Titles;
    private string _currentPage = "Home";
    private string _activeFilter = "All";
    private string? _activeGenre;
    private bool _suppressSearchEvents;
    private bool _compactNavigation;
    private bool _rendering;
    private double _lastContentWidth = -1;

    public MainWindow()
    {
        InitializeComponent();
        Title = "VibeFlix";
        ServerPicker.SelectedIndex = 0;
        RenderCurrentPage(resetScroll: true);
    }

    private void NavigationButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string destination })
        {
            NavigateTo(destination);
        }
    }

    private void NavigateTo(string destination)
    {
        _currentPage = destination;
        _activeFilter = "All";
        _activeGenre = null;

        if (!string.Equals(destination, "Search", StringComparison.Ordinal))
        {
            SetSearchTextSilently(string.Empty);
        }

        UpdateNavigationState();
        RenderCurrentPage(resetScroll: true);

        if (string.Equals(destination, "Search", StringComparison.Ordinal))
        {
            SearchBox.Focus(FocusState.Programmatic);
        }
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        if (_suppressSearchEvents)
        {
            return;
        }

        if (!string.IsNullOrWhiteSpace(SearchBox.Text) && _currentPage != "Search")
        {
            _currentPage = "Search";
            _activeFilter = "All";
            _activeGenre = null;
            UpdateNavigationState();
        }

        if (_currentPage == "Search")
        {
            RenderCurrentPage(resetScroll: false);
        }
    }

    private void SearchBox_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (e.Key == VirtualKey.Enter)
        {
            if (_currentPage != "Search")
            {
                _currentPage = "Search";
                UpdateNavigationState();
            }

            RenderCurrentPage(resetScroll: true);
            e.Handled = true;
        }
        else if (e.Key == VirtualKey.Escape && !string.IsNullOrEmpty(SearchBox.Text))
        {
            SetSearchTextSilently(string.Empty);
            if (_currentPage == "Search")
            {
                RenderCurrentPage(resetScroll: true);
            }

            e.Handled = true;
        }
    }

    private void ServerPicker_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (!_rendering)
        {
            RenderCurrentPage(resetScroll: false);
        }
    }

    private void AppRoot_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        var compact = e.NewSize.Width < 1010;
        if (compact != _compactNavigation)
        {
            _compactNavigation = compact;
            NavigationColumn.Width = new GridLength(compact ? 76 : 232);
            NavigationSidebar.Padding = compact
                ? new Thickness(8, 24, 8, 18)
                : new Thickness(14, 24, 14, 18);

            NavigationCaption.Visibility = compact ? Visibility.Collapsed : Visibility.Visible;
            LocalOnlyDescription.Visibility = compact ? Visibility.Collapsed : Visibility.Visible;
            LocalOnlyTitle.Text = compact ? "LOCAL" : "LOCAL FIRST";
            LocalOnlyCard.Padding = compact ? new Thickness(10) : new Thickness(14);

            foreach (var button in NavigationButtons())
            {
                button.HorizontalContentAlignment = compact
                    ? HorizontalAlignment.Center
                    : HorizontalAlignment.Stretch;
            }

            foreach (var label in NavigationLabels())
            {
                label.Visibility = compact ? Visibility.Collapsed : Visibility.Visible;
            }

            UpdateNavigationState();
        }

        BrandSubtitle.Visibility = e.NewSize.Width < 1160 ? Visibility.Collapsed : Visibility.Visible;
        PreviewBadge.Visibility = e.NewSize.Width < 830 ? Visibility.Collapsed : Visibility.Visible;
        ServerPicker.Width = e.NewSize.Width < 920 ? 132 : 150;
    }

    private void PageScrollViewer_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        if (Math.Abs(e.NewSize.Width - _lastContentWidth) < 1)
        {
            return;
        }

        _lastContentWidth = e.NewSize.Width;
        if (!_rendering && (_currentPage is "Home" or "Search" or "My List" or "Continue Watching" or "History"))
        {
            RenderCurrentPage(resetScroll: false);
        }
    }

    private void RenderCurrentPage(bool resetScroll)
    {
        if (_rendering)
        {
            return;
        }

        _rendering = true;
        try
        {
            PageContent.Children.Clear();
            switch (_currentPage)
            {
                case "Search":
                    RenderSearch();
                    break;
                case "My List":
                    RenderMyList();
                    break;
                case "Continue Watching":
                    RenderContinueWatching();
                    break;
                case "History":
                    RenderHistory();
                    break;
                case "Settings":
                    RenderSettings();
                    break;
                default:
                    _currentPage = "Home";
                    RenderHome();
                    break;
            }

            UpdateNavigationState();
        }
        finally
        {
            _rendering = false;
        }

        if (resetScroll)
        {
            PageScrollViewer.ChangeView(null, 0, null, disableAnimation: true);
        }
    }

    private void RenderHome()
    {
        PageContent.Children.Add(CreatePageHeader(
            "HOME  /  YOUR LIBRARY",
            "Make room for a good story.",
            "A desktop-first home for browsing, saving, and picking up where you left off."));
        PageContent.Children.Add(CreatePreviewNotice());
        PageContent.Children.Add(CreateHero());
        PageContent.Children.Add(CreateBrowseFilters());

        var progress = GetVisibleProgress();
        if (progress.Count > 0)
        {
            PageContent.Children.Add(CreateSectionHeading("Continue watching", "LOCAL RESUME"));
            PageContent.Children.Add(CreateProgressShelf(progress));
        }
        else
        {
            PageContent.Children.Add(CreateCompactEmptyState(
                "Continue watching",
                "Your resume list is clear.",
                "When a real player is connected, local progress will appear here. The title preview can add a clearly marked sample progress marker for layout testing."));
        }

        var saved = GetVisibleSavedTitles();
        if (saved.Count > 0)
        {
            PageContent.Children.Add(CreateSectionHeading("Your list", $"{saved.Count} SAVED"));
            PageContent.Children.Add(CreateTitleShelf(saved.Take(8).ToArray()));
        }

        var visible = GetVisibleCatalog();
        PageContent.Children.Add(CreateSectionHeading(
            _activeGenre is null ? "Browse sample titles" : $"{_activeGenre} picks",
            $"{visible.Count} PREVIEW TITLES"));

        if (visible.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "Nothing matches these filters.",
                "Try another source, category, or genre to see more of the preview catalogue.",
                "Clear filters",
                () =>
                {
                    ServerPicker.SelectedIndex = 0;
                    _activeFilter = "All";
                    _activeGenre = null;
                    RenderCurrentPage(resetScroll: true);
                }));
            return;
        }

        PageContent.Children.Add(CreateResponsiveTitleGrid(visible));
    }

    private void RenderSearch()
    {
        var query = SearchBox.Text.Trim();
        PageContent.Children.Add(CreatePageHeader(
            "SEARCH  /  CATALOGUE",
            query.Length == 0 ? "Find your next watch." : $"Results for “{query}”",
            "Search the local preview catalogue by title, genre, language, or source."));
        PageContent.Children.Add(CreatePreviewNotice());
        PageContent.Children.Add(CreateBrowseFilters());

        var results = GetVisibleCatalog();
        if (query.Length == 0)
        {
            PageContent.Children.Add(CreateSectionHeading("Start with a category", "BROWSE WITHOUT A QUERY"));
            PageContent.Children.Add(CreateCategoryShortcuts());
            PageContent.Children.Add(CreateSectionHeading("All preview titles", $"{results.Count} TITLES"));
            PageContent.Children.Add(CreateResponsiveTitleGrid(results));
            return;
        }

        PageContent.Children.Add(CreateSectionHeading("Search results", $"{results.Count} MATCHES"));
        if (results.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "No matching titles yet.",
                "Try a different word, genre, language, or source. Search currently uses sample data only.",
                "Clear search",
                () =>
                {
                    SetSearchTextSilently(string.Empty);
                    RenderCurrentPage(resetScroll: true);
                    SearchBox.Focus(FocusState.Programmatic);
                }));
            return;
        }

        PageContent.Children.Add(CreateResponsiveTitleGrid(results));
    }

    private void RenderMyList()
    {
        var titles = GetVisibleSavedTitles();
        PageContent.Children.Add(CreatePageHeader(
            "YOUR LIBRARY  /  SAVED",
            "My List",
            "Titles you save here are stored locally on this device."));
        PageContent.Children.Add(CreatePreviewNotice());

        if (titles.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "Your list is ready for a first title.",
                "Save something from the preview catalogue. The list stays local; cloud sync is not connected in this Windows build.",
                "Browse titles",
                () => NavigateTo("Home")));
            return;
        }

        PageContent.Children.Add(CreateSectionHeading("Saved titles", $"{titles.Count} IN YOUR LIST"));
        PageContent.Children.Add(CreateResponsiveTitleGrid(titles));
    }

    private void RenderContinueWatching()
    {
        var progress = GetVisibleProgress();
        PageContent.Children.Add(CreatePageHeader(
            "YOUR LIBRARY  /  RESUME",
            "Continue watching",
            "Resume markers are stored on this device. Sample markers are clearly identified as preview data."));
        PageContent.Children.Add(CreatePreviewNotice());

        if (progress.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "Nothing to resume yet.",
                "Real progress will appear after the Windows player is connected. Open a title and add a sample marker to explore this view.",
                "Browse titles",
                () => NavigateTo("Home")));
            return;
        }

        PageContent.Children.Add(CreateSectionHeading("On this device", $"{progress.Count} RESUME MARKERS"));
        PageContent.Children.Add(CreateResponsiveProgressGrid(progress));
    }

    private void RenderHistory()
    {
        var history = GetVisibleHistory();
        PageContent.Children.Add(CreatePageHeader(
            "YOUR LIBRARY  /  RECENT",
            "History",
            "A local record of titles you marked as watched in this preview."));
        PageContent.Children.Add(CreatePreviewNotice());

        if (history.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "Your history is empty.",
                "Mark a sample title as watched from its detail view to see how history is organized.",
                "Browse titles",
                () => NavigateTo("Home")));
            return;
        }

        var clearButton = CreateActionButton("Clear history", async () => await ConfirmClearHistoryAsync());
        var actionRow = new Grid { HorizontalAlignment = HorizontalAlignment.Stretch };
        actionRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        actionRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        actionRow.Children.Add(CreateSectionHeading("Recently marked watched", $"{history.Count} TITLES"));
        Grid.SetColumn(clearButton, 1);
        actionRow.Children.Add(clearButton);
        PageContent.Children.Add(actionRow);
        PageContent.Children.Add(CreateResponsiveHistoryGrid(history));
    }

    private void RenderSettings()
    {
        PageContent.Children.Add(CreatePageHeader(
            "PREFERENCES  /  DEVICE",
            "Settings",
            "Local library controls and the current Windows integration status."));
        PageContent.Children.Add(CreatePreviewNotice());

        var localCard = CreateSettingsCard(
            "Local library",
            "My List, History, and preview resume markers are stored on this device. Stream addresses and provider credentials are not saved in the library.",
            out var localCardContent);
        localCardContent.Children.Add(CreateSettingsDetail("Storage file", _library.StorageLocation));
        var localActions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10, Margin = new Thickness(0, 12, 0, 0) };
        localActions.Children.Add(CreateActionButton("Clear history", async () => await ConfirmClearHistoryAsync()));
        localActions.Children.Add(CreateActionButton("Reset local preview data", async () => await ConfirmClearLibraryAsync(), isPrimary: false));
        localCardContent.Children.Add(localActions);
        PageContent.Children.Add(localCard);

        var integrationCard = CreateSettingsCard(
            "Connections",
            "The Server 1 / Server 2 selector currently filters fictional preview entries. Provider catalogue browsing and stream resolution are not connected.",
            out var integrationCardContent);
        integrationCardContent.Children.Add(CreateStatusLine("Catalogue providers", "Not connected", "#DDBB85"));
        integrationCardContent.Children.Add(CreateStatusLine("Windows playback", "Not connected", "#DDBB85"));
        integrationCardContent.Children.Add(CreateStatusLine("Account and cloud sync", "Not connected", "#AEB8C8"));
        integrationCardContent.Children.Add(CreateText(
            "Signing in will not upload or sync anything in this build. The existing local-first, explicit-consent boundary remains unchanged.",
            13, "#9DA8B9", TextWrapping.Wrap));
        PageContent.Children.Add(integrationCard);

        var interactionCard = CreateSettingsCard(
            "Desktop interaction",
            "Use Tab and Shift+Tab to move through controls. Enter or Space activates the focused button; Enter submits the search box and Esc clears it.",
            out _);
        PageContent.Children.Add(interactionCard);
    }

    private IReadOnlyList<CatalogTitle> GetVisibleCatalog()
    {
        IEnumerable<CatalogTitle> titles = ApplySourceFilter(_catalog);
        titles = ApplyBrowseFilter(titles);

        if (_currentPage == "Search" && !string.IsNullOrWhiteSpace(SearchBox.Text))
        {
            var query = SearchBox.Text.Trim();
            titles = titles.Where(title => Matches(title.Name, query)
                || Matches(title.Synopsis, query)
                || Matches(title.Language, query)
                || Matches(title.Source, query)
                || Matches(title.Kind, query)
                || title.Genres.Any(genre => Matches(genre, query)));
        }

        return titles.ToArray();
    }

    private IEnumerable<CatalogTitle> ApplySourceFilter(IEnumerable<CatalogTitle> titles)
    {
        return ServerPicker.SelectedIndex switch
        {
            1 => titles.Where(title => title.Source == "Server 1"),
            2 => titles.Where(title => title.Source == "Server 2"),
            _ => titles
        };
    }

    private IEnumerable<CatalogTitle> ApplyBrowseFilter(IEnumerable<CatalogTitle> titles)
    {
        if (_activeGenre is not null)
        {
            return titles.Where(title => title.Genres.Contains(_activeGenre, StringComparer.OrdinalIgnoreCase));
        }

        return _activeFilter switch
        {
            "Movies" => titles.Where(title => !title.IsSeries),
            "Series" => titles.Where(title => title.IsSeries),
            "Latest" => titles.Where(title => title.IsNew),
            "Hindi" => titles.Where(title => string.Equals(title.Language, "Hindi", StringComparison.OrdinalIgnoreCase)),
            _ => titles
        };
    }

    private IReadOnlyList<CatalogTitle> GetVisibleSavedTitles()
    {
        var visibleById = ApplySourceFilter(_catalog)
            .ToDictionary(title => title.Id, StringComparer.Ordinal);
        return _library.GetMyListIds()
            .Where(visibleById.ContainsKey)
            .Select(id => visibleById[id])
            .ToArray();
    }

    private IReadOnlyList<(ProgressEntry Progress, CatalogTitle Title)> GetVisibleProgress()
    {
        var titles = _catalog.ToDictionary(title => title.Id, StringComparer.Ordinal);
        return _library.GetContinueWatching()
            .Where(progress => titles.ContainsKey(progress.TitleId))
            .Where(progress => SourceMatches(titles[progress.TitleId]))
            .Select(progress => (progress, titles[progress.TitleId]))
            .ToArray();
    }

    private IReadOnlyList<(HistoryEntry History, CatalogTitle Title)> GetVisibleHistory()
    {
        var titles = _catalog.ToDictionary(title => title.Id, StringComparer.Ordinal);
        return _library.GetHistory()
            .Where(history => titles.ContainsKey(history.TitleId))
            .Where(history => SourceMatches(titles[history.TitleId]))
            .Select(history => (history, titles[history.TitleId]))
            .ToArray();
    }

    private bool SourceMatches(CatalogTitle title) => ServerPicker.SelectedIndex switch
    {
        1 => title.Source == "Server 1",
        2 => title.Source == "Server 2",
        _ => true
    };

    private static bool Matches(string source, string query) =>
        source.Contains(query, StringComparison.OrdinalIgnoreCase);

    private void SetSearchTextSilently(string value)
    {
        _suppressSearchEvents = true;
        SearchBox.Text = value;
        _suppressSearchEvents = false;
    }

    private void SetBrowseFilter(string filter, string? genre = null)
    {
        _activeFilter = filter;
        _activeGenre = genre;
        if (_currentPage is not "Home" and not "Search")
        {
            _currentPage = "Home";
            SetSearchTextSilently(string.Empty);
        }

        UpdateNavigationState();
        RenderCurrentPage(resetScroll: true);
    }

    private void UpdateNavigationState()
    {
        var selectedPage = _currentPage == "Continue Watching" ? "Continue Watching" : _currentPage;
        foreach (var button in NavigationButtons())
        {
            var selected = string.Equals(button.Tag as string, selectedPage, StringComparison.Ordinal);
            button.Background = selected ? Brush("#202736") : Brush("#00000000");
            button.Foreground = Brush(selected ? "#F3F5FA" : "#BAC3D1");
        }
    }

    private IEnumerable<Button> NavigationButtons() =>
    [HomeNav, SearchNav, MyListNav, ContinueNav, HistoryNav, SettingsNav];

    private IEnumerable<TextBlock> NavigationLabels() =>
    [HomeNavLabel, SearchNavLabel, MyListNavLabel, ContinueNavLabel, HistoryNavLabel, SettingsNavLabel];
}
