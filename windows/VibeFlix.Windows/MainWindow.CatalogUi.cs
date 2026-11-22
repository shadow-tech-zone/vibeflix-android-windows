using System.Globalization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Shapes;
using Microsoft.UI.Text;
using VibeFlix.Windows.Models;
using VibeFlix.Windows.Services;
using Windows.Foundation;
using Windows.UI;

namespace VibeFlix.Windows;

public sealed partial class MainWindow
{
    private StackPanel CreatePageHeader(string eyebrow, string title, string description)
    {
        var stack = new StackPanel { Spacing = 6 };
        stack.Children.Add(CreateText(eyebrow, 10, "#A998EF", FontWeights.SemiBold, characterSpacing: 120));
        stack.Children.Add(CreateText(title, 31, "#F3F5FA", FontWeights.SemiBold, TextWrapping.Wrap));
        stack.Children.Add(CreateText(description, 14, "#A6B0C0", TextWrapping.Wrap));
        return stack;
    }

    private Border CreatePreviewNotice()
    {
        var content = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12, VerticalAlignment = VerticalAlignment.Center };
        content.Children.Add(new Border
        {
            Width = 9,
            Height = 9,
            CornerRadius = new CornerRadius(5),
            Background = Brush("#A997FF"),
            VerticalAlignment = VerticalAlignment.Center
        });

        var copy = new StackPanel { Spacing = 3, VerticalAlignment = VerticalAlignment.Center };
        copy.Children.Add(CreateText("DESIGN PREVIEW  ·  SAMPLE CATALOGUE", 10, "#C4B9FF", FontWeights.SemiBold, characterSpacing: 80));
        copy.Children.Add(CreateText("Provider browsing and media playback are not connected. No stream URLs are loaded.", 12, "#A8B3C4", TextWrapping.Wrap));
        content.Children.Add(copy);

        return new Border
        {
            Padding = new Thickness(14, 11, 14, 11),
            CornerRadius = new CornerRadius(12),
            Background = Brush("#171621"),
            BorderBrush = Brush("#39334F"),
            BorderThickness = new Thickness(1),
            Child = content
        };
    }

    private Border CreateHero()
    {
        var heroGrid = new Grid();
        var compactHero = PageScrollViewer.ActualWidth < 760;
        heroGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        if (!compactHero)
        {
            heroGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(230) });
        }

        var background = new LinearGradientBrush
        {
            StartPoint = new Point(0, 0),
            EndPoint = new Point(1, 1)
        };
        background.GradientStops.Add(new GradientStop { Color = ColorFromHex("17223B"), Offset = 0 });
        background.GradientStops.Add(new GradientStop { Color = ColorFromHex("22203C"), Offset = 0.55 });
        background.GradientStops.Add(new GradientStop { Color = ColorFromHex("13202A"), Offset = 1 });
        heroGrid.Background = background;

        var halo = new Ellipse
        {
            Width = 250,
            Height = 250,
            Fill = new SolidColorBrush(Color.FromArgb(44, 137, 119, 233)),
            HorizontalAlignment = HorizontalAlignment.Right,
            VerticalAlignment = VerticalAlignment.Center,
            Margin = new Thickness(0, 0, 16, 0),
            IsHitTestVisible = false
        };
        heroGrid.Children.Add(halo);
        var haloInner = new Ellipse
        {
            Width = 154,
            Height = 154,
            Fill = new SolidColorBrush(Color.FromArgb(48, 76, 202, 177)),
            HorizontalAlignment = HorizontalAlignment.Right,
            VerticalAlignment = VerticalAlignment.Center,
            Margin = new Thickness(0, 0, 100, 0),
            IsHitTestVisible = false
        };
        heroGrid.Children.Add(haloInner);

        var copy = new StackPanel
        {
            Margin = new Thickness(compactHero ? 22 : 30, 28, compactHero ? 22 : 24, 28),
            MaxWidth = 650,
            VerticalAlignment = VerticalAlignment.Center,
            Spacing = 14
        };
        copy.Children.Add(CreateText("DISCOVER AT YOUR OWN PACE", 10, "#C6B9FF", FontWeights.SemiBold, characterSpacing: 100));
        copy.Children.Add(CreateText("Stories, sorted your way.", 34, "#FFFFFF", FontWeights.Bold, TextWrapping.Wrap));
        copy.Children.Add(CreateText(
            "A fresh desktop library for exploring sources, saving favourites, and finding your next watch.",
            14, "#C5CCDA", TextWrapping.Wrap));

        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10, Margin = new Thickness(0, 2, 0, 0) };
        actions.Children.Add(CreateActionButton("Browse catalogue", () => NavigateTo("Search"), isPrimary: true));
        actions.Children.Add(CreateActionButton("Open My List", () => NavigateTo("My List")));
        copy.Children.Add(actions);
        heroGrid.Children.Add(copy);

        var sideNote = new StackPanel
        {
            Margin = new Thickness(0, 28, 26, 28),
            VerticalAlignment = VerticalAlignment.Center,
            HorizontalAlignment = HorizontalAlignment.Stretch,
            Spacing = 10
        };
        sideNote.Children.Add(CreateMiniMetric("01", "CHOOSE A SOURCE", "Server 1, Server 2, or both"));
        sideNote.Children.Add(CreateMiniMetric("02", "KEEP YOUR PLACE", "Local list and resume flows"));
        sideNote.Children.Add(CreateMiniMetric("03", "BUILT FOR WINDOWS", "Keyboard, mouse, and resizing"));
        if (!compactHero)
        {
            Grid.SetColumn(sideNote, 1);
            heroGrid.Children.Add(sideNote);
        }

        return new Border
        {
            Height = 280,
            CornerRadius = new CornerRadius(18),
            BorderBrush = Brush("#344158"),
            BorderThickness = new Thickness(1),
            Child = heroGrid
        };
    }

    private Border CreateMiniMetric(string number, string title, string subtitle)
    {
        var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10 };
        row.Children.Add(CreateText(number, 15, "#B4A4FF", FontWeights.SemiBold));
        var copy = new StackPanel { Spacing = 2 };
        copy.Children.Add(CreateText(title, 9, "#D4D9E3", FontWeights.SemiBold, characterSpacing: 55));
        copy.Children.Add(CreateText(subtitle, 11, "#A7B1C1", TextWrapping.Wrap));
        row.Children.Add(copy);
        return new Border
        {
            Padding = new Thickness(11, 9, 11, 9),
            CornerRadius = new CornerRadius(10),
            Background = new SolidColorBrush(Color.FromArgb(78, 13, 18, 31)),
            BorderBrush = new SolidColorBrush(Color.FromArgb(75, 189, 197, 218)),
            BorderThickness = new Thickness(1),
            Child = row
        };
    }

    private StackPanel CreateBrowseFilters()
    {
        var wrapper = new StackPanel { Spacing = 10 };
        var header = new Grid();
        header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        header.Children.Add(CreateText("Browse by", 19, "#F0F2F7", FontWeights.SemiBold));
        var filterLabel = CreateText("FILTERS APPLY TO SAMPLE DATA", 9, "#748096", FontWeights.SemiBold, characterSpacing: 70);
        filterLabel.VerticalAlignment = VerticalAlignment.Center;
        Grid.SetColumn(filterLabel, 1);
        header.Children.Add(filterLabel);
        wrapper.Children.Add(header);

        var scroller = new ScrollViewer
        {
            Height = 44,
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

        var genreButton = CreateFilterChip(_activeGenre is null ? "Genres  +" : $"Genre: {_activeGenre}  ▾", _activeGenre is not null);
        genreButton.Click += (_, _) => ShowGenreMenu(genreButton);
        chips.Children.Add(genreButton);
        scroller.Content = chips;
        wrapper.Children.Add(scroller);
        return wrapper;
    }

    private ScrollViewer CreateCategoryShortcuts()
    {
        var shortcuts = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 9, VerticalAlignment = VerticalAlignment.Center };
        foreach (var genre in DemoCatalog.Genres.Take(6))
        {
            var chip = CreateFilterChip(genre, false);
            chip.Click += (_, _) => SetBrowseFilter("Genre", genre);
            shortcuts.Children.Add(chip);
        }

        return new ScrollViewer
        {
            Height = 44,
            Content = shortcuts,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            VerticalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Enabled,
            VerticalScrollMode = ScrollMode.Disabled,
            ZoomMode = ZoomMode.Disabled
        };
    }

    private void ShowGenreMenu(FrameworkElement target)
    {
        var menu = new MenuFlyout();
        var all = new MenuFlyoutItem { Text = "All genres" };
        all.Click += (_, _) => SetBrowseFilter("All");
        menu.Items.Add(all);

        foreach (var genre in DemoCatalog.Genres)
        {
            var item = new MenuFlyoutItem { Text = genre };
            item.Click += (_, _) => SetBrowseFilter("Genre", genre);
            menu.Items.Add(item);
        }

        menu.ShowAt(target);
    }

    private Button CreateFilterChip(string label, bool selected)
    {
        var button = new Button
        {
            Content = label,
            Padding = new Thickness(15, 8, 15, 8),
            Background = Brush(selected ? "#D8CEFF" : "#151B25"),
            BorderBrush = Brush(selected ? "#D8CEFF" : "#303A49"),
            BorderThickness = new Thickness(1),
            Foreground = Brush(selected ? "#151326" : "#D5DAE3"),
            FontSize = 12,
            FontWeight = selected ? FontWeights.SemiBold : FontWeights.Normal,
            VerticalAlignment = VerticalAlignment.Center
        };
        AutomationProperties.SetName(button, label);
        return button;
    }

    private Grid CreateSectionHeading(string title, string eyebrow)
    {
        var grid = new Grid { Margin = new Thickness(0, 4, 0, 0) };
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        grid.Children.Add(CreateText(title, 20, "#F0F2F7", FontWeights.SemiBold, TextWrapping.Wrap));
        var label = CreateText(eyebrow, 9, "#7E899C", FontWeights.SemiBold, characterSpacing: 75);
        label.VerticalAlignment = VerticalAlignment.Center;
        Grid.SetColumn(label, 1);
        grid.Children.Add(label);
        return grid;
    }

    private Border CreateCompactEmptyState(string title, string description)
    {
        var copy = new StackPanel { Spacing = 5 };
        copy.Children.Add(CreateText(title, 15, "#E2E6EE", FontWeights.SemiBold));
        copy.Children.Add(CreateText(description, 12, "#929EAF", TextWrapping.Wrap));
        return new Border
        {
            Padding = new Thickness(16, 13, 16, 13),
            CornerRadius = new CornerRadius(12),
            Background = Brush("#111721"),
            BorderBrush = Brush("#293240"),
            BorderThickness = new Thickness(1),
            Child = copy
        };
    }

    private Border CreateEmptyState(string title, string description, string actionLabel, Action action)
    {
        var content = new StackPanel { Spacing = 12, MaxWidth = 560 };
        content.Children.Add(CreateText("YOUR LIBRARY, YOUR PACE", 9, "#A998EF", FontWeights.SemiBold, characterSpacing: 90));
        content.Children.Add(CreateText(title, 21, "#F1F3F7", FontWeights.SemiBold, TextWrapping.Wrap));
        content.Children.Add(CreateText(description, 13, "#9CA7B8", TextWrapping.Wrap));
        content.Children.Add(CreateActionButton(actionLabel, action, isPrimary: true));
        return new Border
        {
            Padding = new Thickness(24),
            CornerRadius = new CornerRadius(15),
            Background = Brush("#121822"),
            BorderBrush = Brush("#2A3443"),
            BorderThickness = new Thickness(1),
            Child = content
        };
    }

    private FrameworkElement CreateTitleShelf(IReadOnlyList<CatalogTitle> titles)
    {
        var scroller = new ScrollViewer
        {
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            VerticalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Enabled,
            VerticalScrollMode = ScrollMode.Disabled,
            ZoomMode = ZoomMode.Disabled
        };
        var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 18 };
        foreach (var title in titles)
        {
            row.Children.Add(CreateTitleCard(title, 178));
        }

        scroller.Content = row;
        AutomationProperties.SetName(scroller, "Browse title shelf");
        return scroller;
    }

    private FrameworkElement CreateProgressShelf(IReadOnlyList<(ProgressEntry Progress, CatalogTitle Title)> progress)
    {
        var scroller = new ScrollViewer
        {
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            VerticalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Enabled,
            VerticalScrollMode = ScrollMode.Disabled,
            ZoomMode = ZoomMode.Disabled
        };
        var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 18 };
        foreach (var entry in progress)
        {
            row.Children.Add(CreateTitleCard(
                entry.Title,
                178,
                entry.Progress,
                "Remove resume marker",
                () => RemoveProgress(entry.Title)));
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
            () => RemoveProgress(progress[index].Title)));
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
        var viewportWidth = PageScrollViewer.ActualWidth;
        if (viewportWidth < 300)
        {
            viewportWidth = Math.Max(640, AppRoot.ActualWidth - NavigationColumn.Width.Value - 70);
        }

        var availableWidth = Math.Max(330, viewportWidth - 70);
        var columns = availableWidth switch
        {
            >= 1450 => 6,
            >= 1190 => 5,
            >= 930 => 4,
            >= 660 => 3,
            _ => 2
        };
        var cardWidth = Math.Min(178, Math.Max(140, (availableWidth - ((columns - 1) * 18)) / columns));

        var grid = new Grid
        {
            ColumnSpacing = 18,
            RowSpacing = 24,
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
        Action? extraAction = null)
    {
        var posterHeight = width * 1.26;
        var card = new StackPanel { Width = width, Spacing = 8 };
        var posterButton = new Button
        {
            Content = CreatePoster(title, posterHeight),
            Width = width,
            Height = posterHeight,
            Padding = new Thickness(0),
            Background = Brush("#00000000"),
            BorderThickness = new Thickness(0),
            HorizontalContentAlignment = HorizontalAlignment.Stretch,
            VerticalContentAlignment = VerticalAlignment.Stretch
        };
        AutomationProperties.SetName(posterButton, $"Open details for {title.Name}");
        AutomationProperties.SetHelpText(posterButton, title.Synopsis);
        ToolTipService.SetToolTip(posterButton, $"Open details: {title.Name}");
        posterButton.Click += (_, _) => ShowTitleDetails(title);
        card.Children.Add(posterButton);

        var titleRow = new Grid();
        titleRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        titleRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        var titleText = CreateText(title.Name, 14, "#E7EAF0", FontWeights.SemiBold, TextWrapping.Wrap);
        titleText.MaxLines = 2;
        titleText.TextTrimming = TextTrimming.CharacterEllipsis;
        titleRow.Children.Add(titleText);
        var saved = _library.IsSaved(title.Id);
        var saveButton = CreateSmallActionButton(saved ? "✓" : "+", saved ? "Remove from My List" : "Add to My List");
        saveButton.Click += (_, _) => ToggleSaved(title, saveButton);
        Grid.SetColumn(saveButton, 1);
        titleRow.Children.Add(saveButton);
        card.Children.Add(titleRow);

        card.Children.Add(CreateText(title.CardMetadata, 10, "#8C98AA", TextWrapping.Wrap));

        if (progress is not null)
        {
            var progressBar = new ProgressBar
            {
                Minimum = 0,
                Maximum = 100,
                Value = progress.Percent,
                Height = 5,
                Foreground = Brush("#A997FF"),
                Background = Brush("#293241")
            };
            card.Children.Add(progressBar);
            card.Children.Add(CreateText(
                progress.IsPreviewMarker ? $"Sample resume marker  ·  {progress.Percent}%" : $"Resume  ·  {progress.Percent}%",
                10, "#AEB8C8", TextWrapping.Wrap));
            var resumeButton = CreateActionButton("Open player preview", () => ShowTitleDetails(title));
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
        grid.Background = gradient;

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

        var content = new Grid { Margin = new Thickness(15) };
        content.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        content.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
        content.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        var badge = new Border
        {
            Padding = new Thickness(8, 5, 8, 5),
            CornerRadius = new CornerRadius(6),
            Background = new SolidColorBrush(Color.FromArgb(100, 12, 16, 26)),
            HorizontalAlignment = HorizontalAlignment.Left,
            Child = CreateText("SAMPLE  ·  " + (title.IsNew ? "NEW" : title.Kind.ToUpperInvariant()), 8, "#F4F3FB", FontWeights.SemiBold, characterSpacing: 35)
        };
        content.Children.Add(badge);

        var typeMark = CreateText(title.IsSeries ? "SERIES" : "FEATURE", 9, "#E3DDFB", FontWeights.SemiBold, characterSpacing: 130);
        typeMark.VerticalAlignment = VerticalAlignment.Center;
        typeMark.HorizontalAlignment = HorizontalAlignment.Left;
        Grid.SetRow(typeMark, 1);
        content.Children.Add(typeMark);

        var bottom = new StackPanel { Spacing = 5 };
        bottom.Children.Add(CreateText(title.Name, 18, "#FFFFFF", FontWeights.SemiBold, TextWrapping.Wrap));
        bottom.Children.Add(CreateText($"{title.Year}  ·  {title.Rating}", 10, "#E0E3EC", TextWrapping.Wrap));
        Grid.SetRow(bottom, 2);
        content.Children.Add(bottom);
        grid.Children.Add(content);

        return new Border
        {
            Height = height,
            CornerRadius = new CornerRadius(14),
            BorderBrush = Brush("#475164"),
            BorderThickness = new Thickness(1),
            Child = grid
        };
    }

    private Button CreateSmallActionButton(string text, string accessibleName)
    {
        var button = new Button
        {
            Content = text,
            Width = 32,
            Height = 32,
            Padding = new Thickness(0),
            Background = Brush("#1A202B"),
            BorderBrush = Brush("#354052"),
            BorderThickness = new Thickness(1),
            Foreground = Brush("#DED6FF"),
            FontSize = 16,
            FontWeight = FontWeights.SemiBold,
            VerticalAlignment = VerticalAlignment.Center
        };
        AutomationProperties.SetName(button, accessibleName);
        ToolTipService.SetToolTip(button, accessibleName);
        return button;
    }

    private Button CreateActionButton(string label, Action action, bool isPrimary = false)
    {
        var button = new Button
        {
            Content = label,
            Padding = new Thickness(15, 9, 15, 9),
            Background = Brush(isPrimary ? "#9E87F2" : "#1B222E"),
            BorderBrush = Brush(isPrimary ? "#9E87F2" : "#394456"),
            BorderThickness = new Thickness(1),
            Foreground = Brush(isPrimary ? "#171322" : "#E3E7EE"),
            FontSize = 12,
            FontWeight = isPrimary ? FontWeights.SemiBold : FontWeights.Normal,
            HorizontalAlignment = HorizontalAlignment.Left
        };
        button.Click += (_, _) => action();
        AutomationProperties.SetName(button, label);
        return button;
    }

    private Border CreateSettingsCard(string heading, string description, out StackPanel content)
    {
        content = new StackPanel { Spacing = 11 };
        content.Children.Add(CreateText(heading, 19, "#F0F2F7", FontWeights.SemiBold));
        content.Children.Add(CreateText(description, 13, "#A1ACBC", TextWrapping.Wrap));
        return new Border
        {
            Padding = new Thickness(20),
            CornerRadius = new CornerRadius(14),
            Background = Brush("#121822"),
            BorderBrush = Brush("#2A3442"),
            BorderThickness = new Thickness(1),
            Child = content
        };
    }

    private StackPanel CreateSettingsDetail(string label, string value)
    {
        var stack = new StackPanel { Spacing = 5 };
        stack.Children.Add(CreateText(label.ToUpperInvariant(), 9, "#808C9F", FontWeights.SemiBold, characterSpacing: 70));
        var valueText = CreateText(value, 12, "#CFD5DF", TextWrapping.Wrap);
        valueText.IsTextSelectionEnabled = true;
        stack.Children.Add(valueText);
        return stack;
    }

    private Border CreateStatusLine(string label, string value, string color)
    {
        var row = new Grid { Margin = new Thickness(0, 2, 0, 2) };
        row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        row.Children.Add(CreateText(label, 13, "#D5DAE3", TextWrapping.Wrap));
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

    private void RemoveProgress(CatalogTitle title)
    {
        try
        {
            _library.RemoveFromContinueWatching(title.Id);
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
