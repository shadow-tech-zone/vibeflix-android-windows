using System.Globalization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Shapes;
using Microsoft.UI.Text;
using VibeFlix.Windows.Models;
using VibeFlix.Windows.Services;
using Windows.Foundation;
using Windows.UI;
using Windows.UI.Text;

namespace VibeFlix.Windows;

public sealed partial class MainWindow
{
    private readonly Dictionary<string, BitmapImage?> _artworkCache = new(StringComparer.Ordinal);

    private double PageViewportWidth => PageScrollViewer.ActualWidth > 0
        ? PageScrollViewer.ActualWidth
        : Math.Max(320, AppRoot.ActualWidth);

    private double ContentGutter => PageViewportWidth switch
    {
        < 520 => 16,
        < 900 => 24,
        _ => 42
    };

    private Thickness ContentMargin(double top = 0, double bottom = 0) =>
        new(ContentGutter, top, ContentGutter, bottom);

    private double ShelfCardWidth => Math.Min(
        272,
        Math.Max(128, (PageViewportWidth - (2 * ContentGutter)) * 0.68));

    private double PosterShelfCardWidth => Math.Min(
        178,
        Math.Max(128, (PageViewportWidth - (2 * ContentGutter)) * 0.18));

    private StackPanel CreatePageHeader(string eyebrow, string title, string description)
    {
        var compact = PageViewportWidth < 560;
        var stack = new StackPanel { Spacing = 8, Margin = ContentMargin(20) };
        stack.Children.Add(CreateText(eyebrow, 10, "#B3B3B3", FontWeights.SemiBold, characterSpacing: 120));
        stack.Children.Add(CreateText(title, compact ? 30 : 36, "#FFFFFF", FontWeights.SemiBold, TextWrapping.Wrap));
        stack.Children.Add(CreateText(description, compact ? 13 : 14, "#B3B3B3", TextWrapping.Wrap));
        return stack;
    }

    private Border CreatePreviewNotice()
    {
        var sourceText = _catalogLoading
            ? "CONNECTING TO CATALOG SOURCES"
            : _server1Unavailable && _server2Unavailable
                ? "CATALOG SOURCES UNAVAILABLE"
                : _server1Unavailable
                    ? "SERVER 1 UNAVAILABLE"
                    : _server2Unavailable
                        ? "SERVER 2 UNAVAILABLE"
                        : "VIBEFLIX CATALOG SOURCES";
        var description = _catalogError
            ?? (_catalogServer2Fallback
                ? "Server 2 is using its website selection while its catalog API is unavailable."
                : "Browsing the same Server 1 and Server 2 resources used by the Android app. Catalog pages are not stream URLs.");
        var dotColor = _catalogError is not null || _server1Unavailable || _server2Unavailable
            ? "#E3A77B"
            : _catalogLoading ? "#D5C777" : "#83C79A";
        var content = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 11, VerticalAlignment = VerticalAlignment.Center };
        content.Children.Add(new Ellipse
        {
            Width = 8,
            Height = 8,
            Fill = Brush(dotColor),
            VerticalAlignment = VerticalAlignment.Center
        });

        var copy = new StackPanel { Spacing = 3, VerticalAlignment = VerticalAlignment.Center };
        copy.Children.Add(CreateText(sourceText, 10, "#D0D0D0", FontWeights.SemiBold, characterSpacing: 70));
        copy.Children.Add(CreateText(description, 12, "#B3B3B3", TextWrapping.Wrap));
        content.Children.Add(copy);

        return new Border
        {
            Margin = ContentMargin(),
            Padding = new Thickness(14, 10, 14, 10),
            CornerRadius = new CornerRadius(8),
            Background = Brush("#161616"),
            BorderBrush = Brush("#383838"),
            BorderThickness = new Thickness(1),
            Child = content
        };
    }

    private Border CreateHero(CatalogTitle featured)
    {
        var heroWidth = PageViewportWidth;
        var compactHero = heroWidth < 760;
        var narrowHero = heroWidth < 520;
        var targetHeight = AppRoot.ActualHeight > 0 ? AppRoot.ActualHeight * 0.46 : 460;
        var heroGrid = new Grid();
        var hero = new Border
        {
            Height = Math.Clamp(
                targetHeight,
                narrowHero ? 280 : compactHero ? 300 : 340,
                narrowHero ? 380 : compactHero ? 420 : 540),
            BorderBrush = Brush("#222222"),
            BorderThickness = new Thickness(0),
            Background = CreateHeroBackground(featured),
            Child = heroGrid
        };

        var horizontalScrim = new LinearGradientBrush
        {
            StartPoint = new Point(0, 0.5),
            EndPoint = new Point(1, 0.5)
        };
        horizontalScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("F5050505"), Offset = 0 });
        horizontalScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("E8050505"), Offset = 0.42 });
        horizontalScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("7A050505"), Offset = 0.72 });
        horizontalScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("08050505"), Offset = 1 });
        heroGrid.Children.Add(new Border { Background = horizontalScrim, IsHitTestVisible = false });

        var bottomScrim = new LinearGradientBrush
        {
            StartPoint = new Point(0.5, 0),
            EndPoint = new Point(0.5, 1)
        };
        bottomScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("00050505"), Offset = 0.55 });
        bottomScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("D9050505"), Offset = 1 });
        heroGrid.Children.Add(new Border { Background = bottomScrim, IsHitTestVisible = false });

        var copyMargin = narrowHero ? 18 : compactHero ? 26 : 48;
        var copy = new StackPanel
        {
            Margin = new Thickness(copyMargin, narrowHero ? 20 : 30, copyMargin, narrowHero ? 24 : 36),
            MaxWidth = compactHero ? 460 : 590,
            VerticalAlignment = VerticalAlignment.Center,
            Spacing = narrowHero ? 8 : compactHero ? 10 : 14
        };
        copy.Children.Add(CreateText($"VIBEFLIX FEATURE  ·  {featured.Source.ToUpperInvariant()}", 10, "#D0D0D0", FontWeights.SemiBold, characterSpacing: 105));
        copy.Children.Add(CreateText(featured.Name, narrowHero ? 30 : compactHero ? 36 : 52, "#FFFFFF", FontWeights.Black, TextWrapping.Wrap));
        var metadata = new[]
        {
            featured.Year > 0 ? featured.Year.ToString(CultureInfo.InvariantCulture) : string.Empty,
            featured.Rating,
            featured.RuntimeLabel,
            string.Join("  /  ", featured.Genres)
        }.Where(part => !string.IsNullOrWhiteSpace(part));
        copy.Children.Add(CreateText(string.Join("  ·  ", metadata), 12, "#E2E2E2", FontWeights.SemiBold, TextWrapping.Wrap));
        var synopsis = CreateText(featured.Synopsis, 15, "#E5E5E5", TextWrapping.Wrap);
        synopsis.MaxWidth = 550;
        synopsis.MaxLines = 3;
        synopsis.Visibility = string.IsNullOrWhiteSpace(featured.Synopsis) ? Visibility.Collapsed : Visibility.Visible;
        copy.Children.Add(synopsis);

        var actions = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 10,
            Margin = new Thickness(0, 4, 0, 0)
        };
        actions.Children.Add(CreateActionButton("▶  Play", () => ShowTitleDetails(featured, startPlayback: true), isPrimary: true));
        actions.Children.Add(CreateActionButton("More info", () => ShowTitleDetails(featured)));
        copy.Children.Add(actions);
        heroGrid.Children.Add(copy);
        AutomationProperties.SetName(hero, $"Featured title: {featured.Name}");
        return hero;
    }

    private Microsoft.UI.Xaml.Media.Brush CreateHeroBackground(CatalogTitle featured)
    {
        if (LoadArtworkForTitle(featured) is { } artwork)
        {
            return new ImageBrush
            {
                ImageSource = artwork,
                Stretch = Stretch.UniformToFill
            };
        }

        var gradient = new LinearGradientBrush
        {
            StartPoint = new Point(0, 0),
            EndPoint = new Point(1, 1)
        };
        gradient.GradientStops.Add(new GradientStop { Color = ColorFromHex(featured.AccentStart), Offset = 0 });
        gradient.GradientStops.Add(new GradientStop { Color = ColorFromHex(featured.AccentEnd), Offset = 1 });
        return gradient;
    }

    private BitmapImage? LoadArtworkForTitle(CatalogTitle title)
    {
        var address = title.PosterUrl;
        if (string.IsNullOrWhiteSpace(address)
            || !Uri.TryCreate(address, UriKind.Absolute, out var uri)
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || !string.IsNullOrEmpty(uri.UserInfo))
        {
            return null;
        }

        if (_artworkCache.TryGetValue(address, out var cached))
        {
            return cached;
        }

        try
        {
            var artwork = new BitmapImage(uri);
            _artworkCache[address] = artwork;
            return artwork;
        }
        catch (Exception)
        {
            _artworkCache[address] = null;
            return null;
        }
    }

    private StackPanel CreateBrowseFilters()
    {
        var wrapper = new StackPanel { Margin = ContentMargin() };
        var scroller = new ScrollViewer
        {
            Height = 56,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            VerticalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Enabled,
            VerticalScrollMode = ScrollMode.Disabled,
            ZoomMode = ZoomMode.Disabled
        };
        var chips = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8, VerticalAlignment = VerticalAlignment.Center };
        foreach (var filter in new[] { "All", "Movies", "Series", "Latest", "Hindi" })
        {
            var selected = _activeGenre is null && _activeFilter == filter;
            var chip = CreateFilterChip(filter, selected);
            chip.Click += (_, _) => SetBrowseFilter(filter);
            chips.Children.Add(chip);
        }

        var genreButton = CreateFilterChip(_activeGenre is null ? "Genres  ▾" : $"{_activeGenre}  ▾", _activeGenre is not null);
        genreButton.Click += (_, _) => ShowGenreMenu(genreButton);
        chips.Children.Add(genreButton);
        scroller.Content = chips;
        wrapper.Children.Add(scroller);
        return wrapper;
    }

    private ScrollViewer CreateCategoryShortcuts()
    {
        var shortcuts = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 9, VerticalAlignment = VerticalAlignment.Center };
        var genres = _server1Categories.Where(category => category.Group == "Genres").Take(6).ToArray();
        if (genres.Length > 0 && ServerPicker.SelectedIndex != 2)
        {
            foreach (var category in genres)
            {
                var chip = CreateFilterChip(category.Name, false);
                chip.Click += (_, _) => SetBrowseFilter("Category", category.Name, category.Key, category.Value);
                shortcuts.Children.Add(chip);
            }
        }
        else
        {
            foreach (var filter in new[] { "Movies", "Series", "Latest", "Hindi" })
            {
                var chip = CreateFilterChip(filter, false);
                chip.Click += (_, _) => SetBrowseFilter(filter);
                shortcuts.Children.Add(chip);
            }
        }

        return new ScrollViewer
        {
            Height = 56,
            Margin = ContentMargin(),
            Content = shortcuts,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            VerticalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Enabled,
            VerticalScrollMode = ScrollMode.Disabled,
            ZoomMode = ZoomMode.Disabled
        };
    }

    private async void ShowGenreMenu(FrameworkElement target)
    {
        var menu = new MenuFlyout();
        var loading = new MenuFlyoutItem { Text = "Loading provider categories…", IsEnabled = false };
        menu.Items.Add(loading);
        menu.ShowAt(target);

        try
        {
            if (ServerPicker.SelectedIndex == 2)
            {
                menu.Items.Clear();
                AddBrowseMenuItem(menu, "Movies", () => SetBrowseFilter("Movies"));
                AddBrowseMenuItem(menu, "Series", () => SetBrowseFilter("Series"));
                AddBrowseMenuItem(menu, "Hindi originals", () => SetBrowseFilter("Hindi"));
                return;
            }

            var categories = await _catalogSources.LoadServer1CategoriesAsync();
            _server1Categories = categories;
            menu.Items.Clear();
            AddBrowseMenuItem(menu, "All categories", () => SetBrowseFilter("All"));
            var group = string.Empty;
            foreach (var category in categories)
            {
                if (!string.Equals(group, category.Group, StringComparison.Ordinal))
                {
                    if (group.Length > 0)
                    {
                        menu.Items.Add(new MenuFlyoutSeparator());
                    }

                    group = category.Group;
                }

                var label = string.IsNullOrWhiteSpace(category.Count)
                    ? $"{category.Group}  ·  {category.Name}"
                    : $"{category.Group}  ·  {category.Name}  ·  {category.Count}";
                AddBrowseMenuItem(menu, label, () =>
                    SetBrowseFilter("Category", category.Name, category.Key, category.Value));
            }

            if (categories.Count == 0)
            {
                menu.Items.Add(new MenuFlyoutItem { Text = "No categories returned by Server 1", IsEnabled = false });
            }
        }
        catch (Exception)
        {
            menu.Items.Clear();
            var retry = new MenuFlyoutItem { Text = "Could not load categories · Retry" };
            retry.Click += (_, _) => ShowGenreMenu(target);
            menu.Items.Add(retry);
        }
    }

    private static void AddBrowseMenuItem(MenuFlyout menu, string label, Action action)
    {
        var item = new MenuFlyoutItem { Text = label };
        item.Click += (_, _) => action();
        menu.Items.Add(item);
    }

    private void ApplyButtonHover(Button button, string restingBackground, string hoverBackground)
    {
        button.UseSystemFocusVisuals = true;
        button.PointerEntered += (_, _) => button.Background = Brush(hoverBackground);
        button.PointerExited += (_, _) =>
        {
            button.Background = Brush(button.Tag is string state && state == "SelectedEpisode"
                ? "#2B1417"
                : restingBackground);
        };
    }

    private Button CreateFilterChip(string label, bool selected)
    {
        var button = new Button
        {
            Content = label,
            Padding = new Thickness(13, 6, 13, 6),
            CornerRadius = new CornerRadius(8),
            Background = Brush(selected ? "#F2F2F2" : "#161616"),
            BorderBrush = Brush(selected ? "#F2F2F2" : "#383838"),
            BorderThickness = new Thickness(1),
            Foreground = Brush(selected ? "#141414" : "#E5E5E5"),
            FontSize = 12,
            FontWeight = selected ? FontWeights.SemiBold : FontWeights.Normal,
            MinHeight = 40,
            VerticalAlignment = VerticalAlignment.Center,
            UseSystemFocusVisuals = true
        };
        AutomationProperties.SetName(button, label);
        ApplyButtonHover(button, selected ? "#F2F2F2" : "#161616", selected ? "#FFFFFF" : "#2D2D2D");
        return button;
    }

    private Grid CreateSectionHeading(string title, string eyebrow)
    {
        var grid = new Grid { Margin = ContentMargin(4) };
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        grid.Children.Add(CreateText(title, 24, "#FFFFFF", FontWeights.Medium, TextWrapping.Wrap));
        var label = CreateText(eyebrow, 9, "#858585", FontWeights.SemiBold, characterSpacing: 75);
        label.VerticalAlignment = VerticalAlignment.Center;
        Grid.SetColumn(label, 1);
        grid.Children.Add(label);
        return grid;
    }

    private StackPanel CreateCatalogPageNavigation()
    {
        var navigation = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
            Spacing = 12,
            Margin = ContentMargin(0, 18),
            Visibility = _catalogPage > 1 || _catalogHasNext ? Visibility.Visible : Visibility.Collapsed
        };
        if (_catalogPage > 1)
        {
            navigation.Children.Add(CreateActionButton("← Previous", () => ChangeCatalogPage(-1)));
        }

        navigation.Children.Add(CreateText($"Page {_catalogPage}", 12, "#B3B3B3", TextWrapping.NoWrap));
        if (_catalogHasNext)
        {
            navigation.Children.Add(CreateActionButton("Next →", () => ChangeCatalogPage(1), isPrimary: true));
        }

        return navigation;
    }

    private Border CreateCompactEmptyState(string title, string description, bool pageInset = false)
    {
        var copy = new StackPanel { Spacing = 5 };
        copy.Children.Add(CreateText(title, 15, "#E5E5E5", FontWeights.SemiBold));
        copy.Children.Add(CreateText(description, 12, "#A7A7A7", TextWrapping.Wrap));
        return new Border
        {
            Margin = pageInset ? ContentMargin() : new Thickness(0),
            Padding = new Thickness(16, 13, 16, 13),
            CornerRadius = new CornerRadius(8),
            Background = Brush("#232323"),
            BorderBrush = Brush("#383838"),
            BorderThickness = new Thickness(1),
            Child = copy
        };
    }

    private Border CreateEmptyState(string title, string description, string actionLabel, Action action)
    {
        var content = new StackPanel { Spacing = 12, MaxWidth = 560 };
        content.Children.Add(CreateText("YOUR LIBRARY, YOUR PACE", 9, "#B3B3B3", FontWeights.SemiBold, characterSpacing: 90));
        content.Children.Add(CreateText(title, 21, "#F5F5F5", FontWeights.SemiBold, TextWrapping.Wrap));
        content.Children.Add(CreateText(description, 13, "#B3B3B3", TextWrapping.Wrap));
        content.Children.Add(CreateActionButton(actionLabel, action, isPrimary: true));
        return new Border
        {
            Margin = ContentMargin(),
            Padding = new Thickness(24),
            CornerRadius = new CornerRadius(8),
            Background = Brush("#232323"),
            BorderBrush = Brush("#383838"),
            BorderThickness = new Thickness(1),
            Child = content
        };
    }

    private FrameworkElement CreateTitleShelf(IReadOnlyList<CatalogTitle> titles)
    {
        var scroller = new ScrollViewer
        {
            Margin = ContentMargin(),
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            VerticalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Enabled,
            VerticalScrollMode = ScrollMode.Disabled,
            ZoomMode = ZoomMode.Disabled
        };
        var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 14 };
        var cardWidth = PosterShelfCardWidth;
        foreach (var title in titles)
        {
            row.Children.Add(CreateTitleCard(title, cardWidth));
        }

        scroller.Content = row;
        AutomationProperties.SetName(scroller, "Browse title shelf");
        return scroller;
    }

    private FrameworkElement CreateProgressShelf(IReadOnlyList<(ProgressEntry Progress, CatalogTitle Title)> progress)
    {
        var scroller = new ScrollViewer
        {
            Margin = ContentMargin(),
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            VerticalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Enabled,
            VerticalScrollMode = ScrollMode.Disabled,
            ZoomMode = ZoomMode.Disabled
        };
        var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 18 };
        var cardWidth = Math.Min(ShelfCardWidth, 246);
        foreach (var entry in progress)
        {
            row.Children.Add(CreateTitleCard(
                entry.Title,
                cardWidth,
                entry.Progress,
                "Remove resume marker",
                () => RemoveProgress(entry.Title, entry.Progress),
                landscape: true));
        }

        scroller.Content = row;
        AutomationProperties.SetName(scroller, "Continue watching shelf");
        return scroller;
    }

    private Grid CreateResponsiveTitleGrid(IReadOnlyList<CatalogTitle> titles)
    {
        return CreateResponsiveGrid(titles.Count, (index, width) => CreateTitleCard(titles[index], width));
    }

    private Grid CreateResponsiveProgressGrid(IReadOnlyList<(ProgressEntry Progress, CatalogTitle Title)> progress)
    {
        return CreateResponsiveGrid(progress.Count, (index, width) => CreateTitleCard(
            progress[index].Title,
            width,
            progress[index].Progress,
            "Remove resume marker",
            () => RemoveProgress(progress[index].Title, progress[index].Progress)));
    }

    private Grid CreateResponsiveHistoryGrid(IReadOnlyList<(HistoryEntry History, CatalogTitle Title)> history)
    {
        return CreateResponsiveGrid(history.Count, (index, width) => CreateTitleCard(
            history[index].Title,
            width,
            extraActionLabel: "Remove from History",
            extraAction: () => RemoveHistory(history[index].Title)));
    }

    private Grid CreateResponsiveGrid(int count, Func<int, double, FrameworkElement> createItem)
    {
        var viewportWidth = PageViewportWidth;
        var gutter = ContentGutter;
        var columnSpacing = viewportWidth < 520 ? 12 : 18;
        var availableWidth = Math.Max(160, viewportWidth - (2 * gutter));
        var columns = availableWidth switch
        {
            >= 1450 => 6,
            >= 1190 => 5,
            >= 930 => 4,
            >= 660 => 3,
            >= 320 => 2,
            _ => 1
        };
        var cardWidth = Math.Min(
            178,
            Math.Max(112, (availableWidth - ((columns - 1) * columnSpacing)) / columns));

        var grid = new Grid
        {
            Margin = ContentMargin(),
            ColumnSpacing = columnSpacing,
            RowSpacing = viewportWidth < 520 ? 18 : 24,
            HorizontalAlignment = HorizontalAlignment.Stretch
        };
        for (var column = 0; column < columns; column++)
        {
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        }

        var rows = (int)Math.Ceiling(count / (double)columns);
        for (var row = 0; row < rows; row++)
        {
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        }

        for (var index = 0; index < count; index++)
        {
            var card = createItem(index, cardWidth);
            card.HorizontalAlignment = HorizontalAlignment.Center;
            grid.Children.Add(card);
            Grid.SetRow(card, index / columns);
            Grid.SetColumn(card, index % columns);
        }

        return grid;
    }

    private StackPanel CreateTitleCard(
        CatalogTitle title,
        double width,
        ProgressEntry? progress = null,
        string? extraActionLabel = null,
        Action? extraAction = null,
        bool landscape = false)
    {
        var posterHeight = width * (landscape ? 0.56 : 1.26);
        var card = new StackPanel { Width = width, Spacing = 8 };
        var poster = CreatePoster(title, posterHeight);
        var posterButton = new Button
        {
            Content = poster,
            Width = width,
            Height = posterHeight,
            Padding = new Thickness(0),
            Background = Brush("#00000000"),
            BorderThickness = new Thickness(0),
            HorizontalContentAlignment = HorizontalAlignment.Stretch,
            VerticalContentAlignment = VerticalAlignment.Stretch,
            UseSystemFocusVisuals = true
        };
        Border? titlePreview = null;
        if (!landscape && poster.Child is Grid posterGrid)
        {
            var previewContent = new StackPanel { Spacing = 8, VerticalAlignment = VerticalAlignment.Center };
            var previewTitle = CreateText(title.Name, 14, "#FFFFFF", FontWeights.SemiBold, TextWrapping.Wrap);
            previewTitle.MaxLines = 2;
            previewTitle.TextTrimming = TextTrimming.CharacterEllipsis;
            previewContent.Children.Add(previewTitle);
            var previewMetadataParts = new[]
            {
                title.Year > 0 ? title.Year.ToString(CultureInfo.InvariantCulture) : string.Empty,
                title.Rating,
                title.RuntimeMinutes > 0 ? title.RuntimeLabel : title.Kind,
                title.Source
            }.Where(part => !string.IsNullOrWhiteSpace(part));
            var previewMetadata = CreateText(
                string.Join("  ·  ", previewMetadataParts),
                10,
                "#D0D0D0",
                FontWeights.SemiBold,
                TextWrapping.Wrap);
            previewMetadata.MaxLines = 2;
            previewContent.Children.Add(previewMetadata);
            var synopsis = CreateText(
                string.IsNullOrWhiteSpace(title.Synopsis) ? "Open the title for provider details." : title.Synopsis,
                11,
                "#E5E5E5",
                TextWrapping.Wrap);
            synopsis.MaxLines = 4;
            previewContent.Children.Add(synopsis);
            previewContent.Children.Add(CreateText("VIEW TITLE DETAILS", 8, "#F08A92", FontWeights.SemiBold, characterSpacing: 65));
            titlePreview = new Border
            {
                Padding = new Thickness(11),
                CornerRadius = new CornerRadius(7),
                Background = Brush("#E6101010"),
                VerticalAlignment = VerticalAlignment.Stretch,
                Visibility = Visibility.Collapsed,
                IsHitTestVisible = false,
                Child = previewContent
            };
            posterGrid.Children.Add(titlePreview);
        }

        var pointerOverPoster = false;
        var posterHasFocus = false;
        void UpdatePosterEmphasis()
        {
            var highlighted = pointerOverPoster || posterHasFocus;
            poster.BorderBrush = Brush(highlighted ? "#E34855" : "#353535");
            poster.BorderThickness = new Thickness(highlighted ? 2 : 1);
            if (titlePreview is not null)
            {
                titlePreview.Visibility = highlighted ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        posterButton.PointerEntered += (_, _) =>
        {
            pointerOverPoster = true;
            UpdatePosterEmphasis();
        };
        posterButton.PointerExited += (_, _) =>
        {
            pointerOverPoster = false;
            UpdatePosterEmphasis();
        };
        posterButton.GotFocus += (_, _) =>
        {
            posterHasFocus = true;
            UpdatePosterEmphasis();
        };
        posterButton.LostFocus += (_, _) =>
        {
            posterHasFocus = false;
            UpdatePosterEmphasis();
        };
        AutomationProperties.SetName(posterButton, $"Open details for {title.Name}");
        AutomationProperties.SetHelpText(posterButton, title.Synopsis);
        ToolTipService.SetToolTip(posterButton, $"Open details: {title.Name}");
        posterButton.Click += (_, _) => ShowTitleDetails(title);
        card.Children.Add(posterButton);

        var titleRow = new Grid();
        titleRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        titleRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        var titleText = CreateText(title.Name, 14, "#F5F5F5", FontWeights.SemiBold, TextWrapping.Wrap);
        titleText.MaxLines = 2;
        titleText.TextTrimming = TextTrimming.CharacterEllipsis;
        titleRow.Children.Add(titleText);
        var saved = _library.IsSaved(title.Id);
        var saveButton = CreateSmallActionButton(
            saved ? "✓" : "+",
            saved ? $"Remove {title.Name} from My List" : $"Add {title.Name} to My List");
        saveButton.Click += (_, _) => ToggleSaved(title, saveButton);
        Grid.SetColumn(saveButton, 1);
        titleRow.Children.Add(saveButton);
        card.Children.Add(titleRow);

        card.Children.Add(CreateText(title.CardMetadata, 11, "#A0A0A0", TextWrapping.Wrap));

        if (progress is not null)
        {
            var progressBar = new ProgressBar
            {
                Minimum = 0,
                Maximum = 100,
                Value = progress.Percent,
                Height = 5,
                Foreground = Brush("#E34855"),
                Background = Brush("#2D2D2D")
            };
            card.Children.Add(progressBar);
            card.Children.Add(CreateText(FormatProgressLabel(title, progress), 10, "#B3B3B3", TextWrapping.Wrap));
            var resumeButton = CreateActionButton("Resume", () => ResumePlayback(title, progress));
            card.Children.Add(resumeButton);
        }

        if (extraActionLabel is not null && extraAction is not null)
        {
            var extra = CreateActionButton(extraActionLabel, extraAction);
            extra.HorizontalAlignment = HorizontalAlignment.Stretch;
            card.Children.Add(extra);
        }

        return card;
    }

    private static string FormatProgressLabel(CatalogTitle title, ProgressEntry progress)
    {
        if (progress.IsPreviewMarker)
        {
            return $"Legacy progress marker  ·  {progress.Percent}%";
        }

        foreach (var season in title.Seasons)
        {
            var episode = season.Episodes.FirstOrDefault(candidate =>
                string.Equals(
                    progress.EpisodeKey,
                    $"S{season.Number:00}E{candidate.Number:00}",
                    StringComparison.Ordinal));
            if (episode is not null)
            {
                return $"Resume  ·  S{season.Number:00} E{episode.Number:00}  ·  {episode.Name}  ·  {progress.Percent}%";
            }
        }

        return $"Resume  ·  {progress.Percent}%";
    }

    private Border CreatePoster(CatalogTitle title, double height)
    {
        var grid = new Grid();
        var gradient = new LinearGradientBrush
        {
            StartPoint = new Point(0, 0),
            EndPoint = new Point(1, 1)
        };
        gradient.GradientStops.Add(new GradientStop { Color = ColorFromHex(title.AccentStart), Offset = 0 });
        gradient.GradientStops.Add(new GradientStop { Color = ColorFromHex(title.AccentEnd), Offset = 1 });
        var artwork = LoadArtworkForTitle(title);
        grid.Background = artwork is null
            ? gradient
            : new ImageBrush { ImageSource = artwork, Stretch = Stretch.UniformToFill };

        if (artwork is null)
        {
            var largeShape = new Ellipse
            {
                Width = height * 0.76,
                Height = height * 0.76,
                Fill = new SolidColorBrush(Color.FromArgb(48, 240, 244, 255)),
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Top,
                Margin = new Thickness(0, -12, -34, 0),
                IsHitTestVisible = false
            };
            grid.Children.Add(largeShape);
            var smallShape = new Ellipse
            {
                Width = height * 0.4,
                Height = height * 0.4,
                Fill = new SolidColorBrush(Color.FromArgb(36, 13, 19, 34)),
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 30, 22),
                IsHitTestVisible = false
            };
            grid.Children.Add(smallShape);
        }

        var posterScrim = new LinearGradientBrush
        {
            StartPoint = new Point(0.5, 0),
            EndPoint = new Point(0.5, 1)
        };
        posterScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("08000000"), Offset = 0 });
        posterScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("18000000"), Offset = 0.45 });
        posterScrim.GradientStops.Add(new GradientStop { Color = ColorFromHex("E8000000"), Offset = 1 });
        grid.Children.Add(new Border { Background = posterScrim, IsHitTestVisible = false });

        var content = new Grid { Margin = new Thickness(12) };
        var badge = new Border
        {
            Padding = new Thickness(8, 5, 8, 5),
            CornerRadius = new CornerRadius(4),
            Background = new SolidColorBrush(Color.FromArgb(190, 12, 12, 12)),
            HorizontalAlignment = HorizontalAlignment.Left,
            VerticalAlignment = VerticalAlignment.Top,
            Child = CreateText(title.IsNew ? "NEW" : title.Kind.ToUpperInvariant(), 8, "#F5F5F5", FontWeights.SemiBold, characterSpacing: 55)
        };
        content.Children.Add(badge);
        grid.Children.Add(content);

        return new Border
        {
            Height = height,
            CornerRadius = new CornerRadius(8),
            BorderBrush = Brush("#353535"),
            BorderThickness = new Thickness(1),
            Child = grid
        };
    }

    private Button CreateSmallActionButton(string text, string accessibleName)
    {
        var button = new Button
        {
            Content = text,
            Width = 40,
            Height = 40,
            MinWidth = 40,
            MinHeight = 40,
            Padding = new Thickness(0),
            CornerRadius = new CornerRadius(8),
            Background = Brush("#232323"),
            BorderBrush = Brush("#383838"),
            BorderThickness = new Thickness(1),
            Foreground = Brush("#FFFFFF"),
            FontSize = 16,
            FontWeight = FontWeights.SemiBold,
            VerticalAlignment = VerticalAlignment.Center,
            UseSystemFocusVisuals = true
        };
        AutomationProperties.SetName(button, accessibleName);
        ToolTipService.SetToolTip(button, accessibleName);
        ApplyButtonHover(button, "#232323", "#2D2D2D");
        return button;
    }

    private Button CreateActionButton(string label, Action action, bool isPrimary = false)
    {
        var restingBackground = isPrimary ? "#E34855" : "#232323";
        var button = new Button
        {
            Content = label,
            Padding = new Thickness(16, 10, 16, 10),
            MinHeight = 44,
            CornerRadius = new CornerRadius(8),
            Background = Brush(restingBackground),
            BorderBrush = Brush(restingBackground),
            BorderThickness = new Thickness(1),
            Foreground = Brush("#FFFFFF"),
            FontSize = 14,
            FontWeight = isPrimary ? FontWeights.SemiBold : FontWeights.Normal,
            HorizontalAlignment = HorizontalAlignment.Left,
            UseSystemFocusVisuals = true
        };
        button.Click += (_, _) => action();
        AutomationProperties.SetName(button, label);
        ApplyButtonHover(button, restingBackground, isPrimary ? "#F05A66" : "#2D2D2D");
        return button;
    }

    private Border CreateSettingsCard(string heading, string description, out StackPanel content)
    {
        content = new StackPanel { Spacing = 11 };
        content.Children.Add(CreateText(heading, 19, "#F5F5F5", FontWeights.SemiBold));
        content.Children.Add(CreateText(description, 13, "#B3B3B3", TextWrapping.Wrap));
        return new Border
        {
            Margin = ContentMargin(),
            Padding = new Thickness(20),
            CornerRadius = new CornerRadius(8),
            Background = Brush("#232323"),
            BorderBrush = Brush("#383838"),
            BorderThickness = new Thickness(1),
            Child = content
        };
    }

    private StackPanel CreateSettingsDetail(string label, string value)
    {
        var stack = new StackPanel { Spacing = 5 };
        stack.Children.Add(CreateText(label.ToUpperInvariant(), 9, "#8C8C8C", FontWeights.SemiBold, characterSpacing: 70));
        var valueText = CreateText(value, 12, "#D0D0D0", TextWrapping.Wrap);
        valueText.IsTextSelectionEnabled = true;
        stack.Children.Add(valueText);
        return stack;
    }

    private Border CreateStatusLine(string label, string value, string color)
    {
        var row = new Grid { Margin = new Thickness(0, 2, 0, 2) };
        row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        row.Children.Add(CreateText(label, 13, "#D0D0D0", TextWrapping.Wrap));
        var status = CreateText(value, 12, color, FontWeights.SemiBold);
        Grid.SetColumn(status, 1);
        row.Children.Add(status);
        return new Border { Padding = new Thickness(0, 4, 0, 4), Child = row };
    }

    private TextBlock CreateText(string value, double fontSize, string foreground, TextWrapping wrapping) =>
        CreateText(value, fontSize, foreground, fontWeight: null, wrapping: wrapping, characterSpacing: 0);

    private TextBlock CreateText(
        string value,
        double fontSize,
        string foreground,
        FontWeight? fontWeight = null,
        TextWrapping wrapping = TextWrapping.NoWrap,
        int characterSpacing = 0)
    {
        var text = new TextBlock
        {
            Text = value,
            FontSize = fontSize,
            Foreground = Brush(foreground),
            TextWrapping = wrapping,
            CharacterSpacing = characterSpacing
        };
        if (fontWeight is not null)
        {
            text.FontWeight = fontWeight.Value;
        }

        return text;
    }

    private static SolidColorBrush Brush(string value) => new(ColorFromHex(value));

    private static Color ColorFromHex(string value)
    {
        var hex = value.TrimStart('#');
        if (hex.Length == 6)
        {
            var red = byte.Parse(hex[..2], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            var green = byte.Parse(hex[2..4], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            var blue = byte.Parse(hex[4..6], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            return Color.FromArgb(255, red, green, blue);
        }

        if (hex.Length == 8)
        {
            var alpha = byte.Parse(hex[..2], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            var red = byte.Parse(hex[2..4], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            var green = byte.Parse(hex[4..6], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            var blue = byte.Parse(hex[6..8], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            return Color.FromArgb(alpha, red, green, blue);
        }

        throw new FormatException($"Color '{value}' must be an RGB or ARGB hex value.");
    }

    private void ToggleSaved(CatalogTitle title, Button button)
    {
        try
        {
            _library.ToggleMyList(title.Id);
            var saved = _library.IsSaved(title.Id);
            button.Content = saved ? "✓" : "+";
            AutomationProperties.SetName(button, saved ? "Remove from My List" : "Add to My List");
            ToolTipService.SetToolTip(button, saved ? "Remove from My List" : "Add to My List");
            RenderCurrentPage(resetScroll: false);
        }
        catch (IOException)
        {
            ToolTipService.SetToolTip(button, "Could not save to local storage. Check device permissions and try again.");
        }
        catch (UnauthorizedAccessException)
        {
            ToolTipService.SetToolTip(button, "Could not save to local storage. Check device permissions and try again.");
        }
    }

    private void RemoveProgress(CatalogTitle title, ProgressEntry progress)
    {
        try
        {
            _library.RemoveFromContinueWatching(title.Id, progress.EpisodeKey);
            RenderCurrentPage(resetScroll: false);
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

    private void RemoveHistory(CatalogTitle title)
    {
        try
        {
            _library.RemoveFromHistory(title.Id);
            RenderCurrentPage(resetScroll: false);
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

    private void ShowLocalWriteError()
    {
        var dialog = new ContentDialog
        {
            Title = "Local save failed",
            Content = "VibeFlix could not write to the local library file. Your existing data was not intentionally cleared.",
            CloseButtonText = "Close",
            XamlRoot = AppRoot.XamlRoot
        };
        _ = dialog.ShowAsync();
    }
}
