using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml.Input;
using VibeFlix.Windows.Models;
using VibeFlix.Windows.Services;
using Windows.System;

namespace VibeFlix.Windows;

public sealed partial class MainWindow : Window
{
    private readonly LocalLibraryStore _library = new();
    private readonly WindowsPlaybackService _playback = new();
    private readonly CatalogSourceService _catalogSources = new();
    private readonly ProviderPlaybackService _providerPlayback = new();
    private readonly Dictionary<string, CatalogTitle> _titleCache = new(StringComparer.Ordinal);
    private IReadOnlyList<CatalogTitle> _catalog = Array.Empty<CatalogTitle>();
    private CancellationTokenSource? _activeCatalogRequest;
    private CancellationTokenSource? _searchDebounce;
    private IReadOnlyList<CatalogSourceService.CatalogCategory> _server1Categories = Array.Empty<CatalogSourceService.CatalogCategory>();
    private int _catalogRequestVersion;
    private int _catalogPage = 1;
    private bool _catalogLoading;
    private bool _catalogHasNext;
    private bool _catalogServer2Fallback;
    private bool _server1OnlyCategory;
    private string? _activeCategoryKey;
    private string? _activeCategoryValue;
    private string? _catalogError;
    private bool _server1Unavailable;
    private bool _server2Unavailable;
    private string _currentPage = "Home";
    private string _activeFilter = "All";
    private string? _activeGenre;
    private bool _suppressSearchEvents;
    private bool _rendering;
    private double _lastContentWidth = -1;
    private Action? _flushPlaybackOnClose;
    private bool _windowClosed;

    public MainWindow()
    {
        InitializeComponent();
        foreach (var title in _library.GetKnownTitles())
        {
            _titleCache[title.Id] = title;
        }

        Title = "VibeFlix";
        Closed += (_, _) =>
        {
            _windowClosed = true;
            var flushPlayback = _flushPlaybackOnClose;
            _flushPlaybackOnClose = null;
            try
            {
                flushPlayback?.Invoke();
            }
            finally
            {
                _activeCatalogRequest?.Cancel();
                _searchDebounce?.Cancel();
                _catalogSources.Dispose();
                _providerPlayback.Dispose();
                _playback.Dispose();
            }
        };
        _rendering = true;
        ServerPicker.SelectedIndex = 0;
        _rendering = false;
        _ = LoadCatalogAsync(resetScroll: true);
    }

    private void NavigationButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button { Tag: string destination })
        {
            return;
        }

        if (destination is "Movies" or "Series")
        {
            _currentPage = "Home";
            _activeFilter = destination;
            _activeGenre = null;
            _activeCategoryKey = null;
            _activeCategoryValue = null;
            _catalogPage = 1;
            SetSearchTextSilently(string.Empty);
            UpdateNavigationState();
            _ = LoadCatalogAsync(resetScroll: true);
            return;
        }

        NavigateTo(destination);
    }

    private void MoreNavigationButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not FrameworkElement target)
        {
            return;
        }

        var menu = new MenuFlyout();
        var historyItem = new MenuFlyoutItem { Text = "History" };
        historyItem.Click += (_, _) => NavigateTo("History");
        menu.Items.Add(historyItem);

        var settingsItem = new MenuFlyoutItem { Text = "Settings" };
        settingsItem.Click += (_, _) => NavigateTo("Settings");
        menu.Items.Add(settingsItem);

        menu.ShowAt(target);
    }

    private void NavigateTo(string destination)
    {
        _currentPage = destination;
        _activeFilter = "All";
        _activeGenre = null;
        _activeCategoryKey = null;
        _activeCategoryValue = null;
        _catalogPage = 1;

        if (!string.Equals(destination, "Search", StringComparison.Ordinal))
        {
            SetSearchTextSilently(string.Empty);
        }

        UpdateNavigationState();
        if (destination is "Home" or "Search")
        {
            _ = LoadCatalogAsync(resetScroll: true);
        }
        else
        {
            RenderCurrentPage(resetScroll: true);
        }

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
            _catalogPage = 1;
            ScheduleCatalogSearch();
            RenderCurrentPage(resetScroll: false);
        }
    }

    private void ScheduleCatalogSearch()
    {
        _searchDebounce?.Cancel();
        _searchDebounce?.Dispose();
        var debounce = new CancellationTokenSource();
        _searchDebounce = debounce;
        _ = DebouncedCatalogSearchAsync(debounce);
    }

    private async Task DebouncedCatalogSearchAsync(CancellationTokenSource debounce)
    {
        try
        {
            await Task.Delay(TimeSpan.FromMilliseconds(350), debounce.Token);
            if (!_windowClosed && ReferenceEquals(_searchDebounce, debounce) && _currentPage == "Search")
            {
                await LoadCatalogAsync(resetScroll: false);
            }
        }
        catch (OperationCanceledException)
        {
            // A newer keystroke or navigation superseded this debounce timer.
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

            _catalogPage = 1;
            _ = LoadCatalogAsync(resetScroll: true);
            e.Handled = true;
        }
        else if (e.Key == VirtualKey.Escape && !string.IsNullOrEmpty(SearchBox.Text))
        {
            SetSearchTextSilently(string.Empty);
            if (_currentPage == "Search")
            {
                _catalogPage = 1;
                _ = LoadCatalogAsync(resetScroll: true);
            }

            e.Handled = true;
        }
    }

    private void ServerPicker_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_rendering || _windowClosed)
        {
            return;
        }

        _catalogPage = 1;
        if (_currentPage is "Home" or "Search")
        {
            _ = LoadCatalogAsync(resetScroll: false);
        }
        else
        {
            RenderCurrentPage(resetScroll: false);
        }
    }

    private async Task LoadCatalogAsync(bool resetScroll)
    {
        if (_windowClosed)
        {
            return;
        }

        _activeCatalogRequest?.Cancel();
        _activeCatalogRequest?.Dispose();
        var requestCancellation = new CancellationTokenSource();
        _activeCatalogRequest = requestCancellation;
        var requestVersion = ++_catalogRequestVersion;
        var requestQuery = _currentPage == "Search" ? SearchBox.Text.Trim() : string.Empty;
        var sourceIndex = Math.Clamp(ServerPicker.SelectedIndex, 0, 2);

        _catalogLoading = true;
        _catalog = Array.Empty<CatalogTitle>();
        _catalogError = null;
        _catalogHasNext = false;
        _catalogServer2Fallback = false;
        _server1OnlyCategory = false;
        _server1Unavailable = false;
        _server2Unavailable = false;
        RenderCurrentPage(resetScroll);

        try
        {
            var result = await _catalogSources.BrowseAsync(
                sourceIndex,
                _activeFilter,
                requestQuery,
                _catalogPage,
                _activeCategoryKey,
                _activeCategoryValue,
                requestCancellation.Token);
            if (requestVersion != _catalogRequestVersion || _windowClosed)
            {
                return;
            }

            _catalog = result.Titles;
            RememberTitles(result.Titles);
            _catalogHasNext = result.HasNext;
            _catalogServer2Fallback = result.Server2WebsiteFallback;
            _server1OnlyCategory = result.Server1OnlyCategory;
            _server1Unavailable = result.Server1Unavailable;
            _server2Unavailable = result.Server2Unavailable;

            if (result.Server1OnlyCategory && sourceIndex == 2)
            {
                _catalogError = "This category is available from Server 1. Select Server 1 or Both Servers to browse it.";
            }
            else if (result.Titles.Count == 0 && result.Server1Unavailable && result.Server2Unavailable)
            {
                _catalogError = "Both catalog sources are unavailable right now. Check your connection and retry.";
            }
            else if (result.Titles.Count == 0 && sourceIndex == 1 && result.Server1Unavailable)
            {
                _catalogError = "Server 1 is unavailable right now. Check your connection and retry.";
            }
            else if (result.Titles.Count == 0 && sourceIndex == 2 && result.Server2Unavailable)
            {
                _catalogError = "Server 2 is unavailable right now. Check your connection and retry.";
            }
            else if (result.Titles.Count == 0 && sourceIndex == 0
                && (result.Server1Unavailable || result.Server2Unavailable))
            {
                _catalogError = "The selected sources could not load titles. Check your connection and retry.";
            }
        }
        catch (OperationCanceledException) when (requestCancellation.IsCancellationRequested)
        {
            return;
        }
        catch (Exception)
        {
            if (requestVersion == _catalogRequestVersion)
            {
                _catalogError = "VibeFlix could not load the catalog. Check your connection and retry.";
            }
        }
        finally
        {
            if (requestVersion == _catalogRequestVersion)
            {
                _catalogLoading = false;
                if (ReferenceEquals(_activeCatalogRequest, requestCancellation))
                {
                    _activeCatalogRequest = null;
                }

                RenderCurrentPage(resetScroll: false);
            }

            requestCancellation.Dispose();
        }
    }

    private void RememberTitles(IEnumerable<CatalogTitle> titles)
    {
        foreach (var freshTitle in titles)
        {
            var title = freshTitle;
            if (_titleCache.TryGetValue(freshTitle.Id, out var existing))
            {
                title = freshTitle with
                {
                    Rating = string.IsNullOrWhiteSpace(freshTitle.Rating) ? existing.Rating : freshTitle.Rating,
                    RuntimeMinutes = freshTitle.RuntimeMinutes > 0 ? freshTitle.RuntimeMinutes : existing.RuntimeMinutes,
                    Synopsis = string.IsNullOrWhiteSpace(freshTitle.Synopsis) ? existing.Synopsis : freshTitle.Synopsis,
                    Language = string.IsNullOrWhiteSpace(freshTitle.Language) ? existing.Language : freshTitle.Language,
                    Genres = freshTitle.Genres.Count == 0 ? existing.Genres : freshTitle.Genres,
                    Seasons = freshTitle.Seasons.Count == 0 ? existing.Seasons : freshTitle.Seasons,
                    PosterUrl = string.IsNullOrWhiteSpace(freshTitle.PosterUrl) ? existing.PosterUrl : freshTitle.PosterUrl,
                    IsNew = freshTitle.IsNew || existing.IsNew
                };
            }

            _titleCache[title.Id] = title;
            if (_library.IsKnownTitle(title.Id))
            {
                _library.UpsertTitle(title);
            }
        }
    }

    private void ChangeCatalogPage(int offset)
    {
        var target = _catalogPage + offset;
        if (target < 1 || (offset > 0 && !_catalogHasNext))
        {
            return;
        }

        _catalogPage = target;
        _ = LoadCatalogAsync(resetScroll: true);
    }

    private void AppRoot_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        var width = e.NewSize.Width;
        var compact = width < 900;
        var veryCompact = width < 400;
        var horizontalPadding = veryCompact ? 8 : width < 560 ? 14 : compact ? 18 : 24;
        AppHeader.Padding = new Thickness(horizontalPadding, 7, horizontalPadding, 7);
        HeaderLayout.ColumnSpacing = compact ? 8 : 14;
        HeaderLayout.RowSpacing = compact ? 2 : 0;

        Grid.SetRow(NavigationScrollViewer, compact ? 1 : 0);
        Grid.SetColumn(NavigationScrollViewer, compact ? 0 : 1);
        Grid.SetColumnSpan(NavigationScrollViewer, compact ? 3 : 1);
        NavigationScrollViewer.Margin = compact
            ? new Thickness(0, 3, 0, 0)
            : new Thickness(12, 0, 8, 0);

        if (compact)
        {
            SearchBox.Width = Math.Clamp(width - (veryCompact ? 230 : 270), veryCompact ? 64 : 80, 220);
            ServerPicker.Width = veryCompact ? 90 : width < 560 ? 104 : 116;
        }
        else if (width < 1120)
        {
            SearchBox.Width = 170;
            ServerPicker.Width = 124;
        }
        else
        {
            SearchBox.Width = 220;
            ServerPicker.Width = 140;
        }

        PreviewBadge.Visibility = width < 1120 ? Visibility.Collapsed : Visibility.Visible;
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
        var visible = GetVisibleCatalog();
        if (visible.Count == 0)
        {
            var waitingForSearch = _currentPage == "Search" && !string.IsNullOrWhiteSpace(SearchBox.Text);
            PageContent.Children.Add(CreatePageHeader(
                "VIBEFLIX  /  DISCOVER",
                _catalogLoading ? "Loading titles…" : waitingForSearch ? "Searching the selected source…" : "Browse VibeFlix titles.",
                "Choose a provider, browse a category, or search the same resources used by the Android app."));
            PageContent.Children.Add(CreatePreviewNotice());
            if (_catalogLoading)
            {
                PageContent.Children.Add(CreateCompactEmptyState("Loading provider catalog…", "Fetching current titles and posters from the selected source.", pageInset: true));
                return;
            }

            if (_catalogError is not null)
            {
                PageContent.Children.Add(CreateEmptyState(
                    "Catalog unavailable.",
                    _catalogError,
                    "Retry",
                    () => _ = LoadCatalogAsync(resetScroll: false)));
                return;
            }

            PageContent.Children.Add(CreateEmptyState(
                "No titles match this view.",
                "Try another source or category, or clear the active filters.",
                "Clear filters",
                () =>
                {
                    _activeFilter = "All";
                    _activeGenre = null;
                    _activeCategoryKey = null;
                    _activeCategoryValue = null;
                    _catalogPage = 1;
                    if (ServerPicker.SelectedIndex != 0)
                    {
                        ServerPicker.SelectedIndex = 0;
                    }
                    else
                    {
                        _ = LoadCatalogAsync(resetScroll: true);
                    }
                }));
            return;
        }

        var featured = visible[0];
        PageContent.Children.Add(CreateHero(featured));
        PageContent.Children.Add(CreateBrowseFilters());

        var progress = GetVisibleProgress()
            .Where(entry => MatchesActiveBrowseFilter(entry.Title))
            .ToArray();
        if (progress.Length > 0)
        {
            PageContent.Children.Add(CreateSectionHeading("Continue watching", "ON THIS DEVICE"));
            PageContent.Children.Add(CreateProgressShelf(progress));
        }

        var saved = GetVisibleSavedTitles()
            .Where(MatchesActiveBrowseFilter)
            .ToArray();
        if (saved.Length > 0)
        {
            PageContent.Children.Add(CreateSectionHeading("My List", $"{saved.Length} SAVED LOCALLY"));
            PageContent.Children.Add(CreateTitleShelf(saved.Take(8).ToArray()));
        }

        var isUnfilteredHome = _activeGenre is null && _activeFilter == "All";
        var sectionTitle = _activeGenre ?? _activeFilter switch
        {
            "All" => "Explore titles",
            "Latest" => "Latest titles",
            "Hindi" => "Hindi titles",
            "Category" => "Category results",
            _ => _activeFilter
        };
        PageContent.Children.Add(CreateSectionHeading(sectionTitle, $"{visible.Count} TITLES  ·  PAGE {_catalogPage}"));
        PageContent.Children.Add(CreateTitleShelf(visible.Take(8).ToArray()));

        if (isUnfilteredHome)
        {
            var series = visible.Where(title => title.IsSeries).ToArray();
            if (series.Length > 0)
            {
                PageContent.Children.Add(CreateSectionHeading("Series", $"{series.Length} ON THIS PAGE"));
                PageContent.Children.Add(CreateTitleShelf(series));
            }

            var movies = visible.Where(title => !title.IsSeries).ToArray();
            if (movies.Length > 0)
            {
                PageContent.Children.Add(CreateSectionHeading("Movies", $"{movies.Length} ON THIS PAGE"));
                PageContent.Children.Add(CreateTitleShelf(movies));
            }
        }

        PageContent.Children.Add(CreateCatalogPageNavigation());
    }

    private void RenderSearch()
    {
        var query = SearchBox.Text.Trim();
        PageContent.Children.Add(CreatePageHeader(
            "SEARCH  /  CATALOGUE",
            query.Length == 0 ? "Find your next watch." : $"Results for “{query}”",
            "Search the selected Server 1 and Server 2 resources used by VibeFlix on Android."));
        PageContent.Children.Add(CreatePreviewNotice());
        PageContent.Children.Add(CreateBrowseFilters());

        var results = GetVisibleCatalog();
        if (_catalogLoading && results.Count == 0)
        {
            PageContent.Children.Add(CreateCompactEmptyState(
                "Searching provider catalog…",
                query.Length == 0 ? "Loading current titles from the selected source." : "Waiting for matching results.",
                pageInset: true));
            return;
        }

        if (_catalogError is not null && results.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "Search is unavailable.",
                _catalogError,
                "Retry",
                () => _ = LoadCatalogAsync(resetScroll: false)));
            return;
        }

        if (query.Length == 0)
        {
            PageContent.Children.Add(CreateSectionHeading("Start with a provider category", "BROWSE LIVE TITLES"));
            PageContent.Children.Add(CreateCategoryShortcuts());
            if (results.Count == 0)
            {
                PageContent.Children.Add(CreateCompactEmptyState(
                    "No catalog titles loaded yet.",
                    "Choose a category above or retry the selected source.",
                    pageInset: true));
                return;
            }

            PageContent.Children.Add(CreateSectionHeading("Browse results", $"{results.Count} TITLES  ·  PAGE {_catalogPage}"));
            PageContent.Children.Add(CreateResponsiveTitleGrid(results));
            PageContent.Children.Add(CreateCatalogPageNavigation());
            return;
        }

        PageContent.Children.Add(CreateSectionHeading("Search results", $"{results.Count} MATCHES  ·  PAGE {_catalogPage}"));
        if (results.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "No matching titles yet.",
                "Try a different title or choose another content source.",
                "Clear search",
                () =>
                {
                    SetSearchTextSilently(string.Empty);
                    _catalogPage = 1;
                    _ = LoadCatalogAsync(resetScroll: true);
                    SearchBox.Focus(FocusState.Programmatic);
                }));
            return;
        }

        PageContent.Children.Add(CreateResponsiveTitleGrid(results));
        PageContent.Children.Add(CreateCatalogPageNavigation());
    }

    private void RenderMyList()
    {
        var titles = GetVisibleSavedTitles();
        PageContent.Children.Add(CreatePageHeader(
            "YOUR LIBRARY  /  SAVED",
            "My List",
            "Titles you save here are stored on this device; Android-style opt-in cloud sync is not wired into this Windows build yet."));
        PageContent.Children.Add(CreatePreviewNotice());

        if (titles.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "Your list is ready for a first title.",
                "Browse the live provider catalog and save a movie or series. Your local list remains available when a source is offline.",
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
            "Resume positions are stored per provider title and episode on this device. Stream addresses and provider credentials are not saved."));
        PageContent.Children.Add(CreatePreviewNotice());

        if (progress.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "Nothing to resume yet.",
                "Start watching a movie or episode from a provider title. Windows will add a resume marker when playback progress is available.",
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
            "Movies and completed series episodes watched through a provider, plus titles you marked watched manually, appear here."));
        PageContent.Children.Add(CreatePreviewNotice());

        if (history.Count == 0)
        {
            PageContent.Children.Add(CreateEmptyState(
                "Your history is empty.",
                "Finish a movie or mark a title watched manually from its details.",
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
            "Local library controls and content-source status."));
        PageContent.Children.Add(CreatePreviewNotice());

        var localCard = CreateSettingsCard(
            "Local library",
            "My List, History, provider title metadata, and per-episode resume positions are stored on this device. Stream URLs and provider credentials are never saved.",
            out var localCardContent);
        localCardContent.Children.Add(CreateSettingsDetail("Storage file", _library.StorageLocation));
        var localActions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10, Margin = new Thickness(0, 12, 0, 0) };
        localActions.Children.Add(CreateActionButton("Clear history", async () => await ConfirmClearHistoryAsync()));
        localActions.Children.Add(CreateActionButton("Clear local library", async () => await ConfirmClearLibraryAsync(), isPrimary: false));
        localCardContent.Children.Add(localActions);
        PageContent.Children.Add(localCard);

        var integrationCard = CreateSettingsCard(
            "Connections",
            "The Windows app uses the same Server 1 and Server 2 catalog and playback resources as Android. A stream address is resolved only after you choose Play.",
            out var integrationCardContent);
        integrationCardContent.Children.Add(CreateStatusLine(
            "Server 1 catalog",
            _server1Unavailable ? "Unavailable" : "Connected",
            _server1Unavailable ? "#E3A77B" : "#A8D8BD"));
        integrationCardContent.Children.Add(CreateStatusLine(
            "Server 2 catalog",
            _server2Unavailable ? "Unavailable" : "Connected",
            _server2Unavailable ? "#E3A77B" : "#A8D8BD"));
        integrationCardContent.Children.Add(CreateStatusLine("Provider stream playback", "Available on demand", "#A8D8BD"));
        integrationCardContent.Children.Add(CreateStatusLine("Android account and cloud sync", "Not connected in Windows", "#B3B3B3"));
        integrationCardContent.Children.Add(CreateText(
            "Library sync is not implemented in this Windows milestone. Android remains opt-in and user-triggered; this app does not sync in the background.",
            13, "#A7A7A7", TextWrapping.Wrap));
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

    private IEnumerable<CatalogTitle> ApplyBrowseFilter(IEnumerable<CatalogTitle> titles) => _activeFilter switch
    {
        "Movies" => titles.Where(title => !title.IsSeries),
        "Series" => titles.Where(title => title.IsSeries),
        _ => titles
    };

    private bool MatchesActiveBrowseFilter(CatalogTitle title) =>
        ApplyBrowseFilter(new[] { title }).Any();

    private IReadOnlyList<CatalogTitle> GetVisibleSavedTitles()
    {
        var visibleById = ApplySourceFilter(_titleCache.Values)
            .GroupBy(title => title.Id, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);
        return _library.GetMyListIds()
            .Where(visibleById.ContainsKey)
            .Select(id => visibleById[id])
            .ToArray();
    }

    private IReadOnlyList<(ProgressEntry Progress, CatalogTitle Title)> GetVisibleProgress()
    {
        var titles = _titleCache;
        return _library.GetContinueWatching()
            .Where(progress => titles.ContainsKey(progress.TitleId))
            .Where(progress => SourceMatches(titles[progress.TitleId]))
            .Select(progress => (progress, titles[progress.TitleId]))
            .ToArray();
    }

    private IReadOnlyList<(HistoryEntry History, CatalogTitle Title)> GetVisibleHistory()
    {
        var titles = _titleCache;
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

    private void SetBrowseFilter(
        string filter,
        string? categoryName = null,
        string? categoryKey = null,
        string? categoryValue = null)
    {
        _activeFilter = filter;
        _activeGenre = filter == "Category" ? categoryName : null;
        _activeCategoryKey = categoryKey;
        _activeCategoryValue = categoryValue;
        _catalogPage = 1;
        if (_currentPage is not "Home" and not "Search")
        {
            _currentPage = "Home";
            SetSearchTextSilently(string.Empty);
        }

        UpdateNavigationState();
        _ = LoadCatalogAsync(resetScroll: true);
    }

    private void UpdateNavigationState()
    {
        var selectedPage = _currentPage switch
        {
            "History" or "Settings" => "More",
            "Home" when _activeGenre is null && (_activeFilter is "Movies" or "Series") => _activeFilter,
            "Home" => "Home",
            _ => _currentPage
        };

        foreach (var button in NavigationButtons())
        {
            var selected = string.Equals(button.Tag as string, selectedPage, StringComparison.Ordinal);
            button.Background = Brush(selected ? "#211315" : "#00000000");
            button.BorderBrush = Brush(selected ? "#E34855" : "#00000000");
            button.BorderThickness = new Thickness(0, 0, 0, 2);
            button.Foreground = Brush(selected ? "#FFFFFF" : "#B3B3B3");
            button.FontWeight = selected ? FontWeights.SemiBold : FontWeights.Normal;
            AutomationProperties.SetHelpText(button, selected ? "Current navigation destination." : string.Empty);
        }
    }

    private IEnumerable<Button> NavigationButtons() =>
        new[] { HomeNav, SeriesNav, MoviesNav, SearchNav, MyListNav, ContinueNav, MoreNav };
}
