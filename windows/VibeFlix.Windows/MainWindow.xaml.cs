using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace VibeFlix.Windows;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Title = "VibeFlix";
    }

    private void NavigationButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string section })
        {
            NavigateToSection(section);
        }
    }

    private void NavigateToSection(string section)
    {
        if (section == "Home")
        {
            HomeView.Visibility = Visibility.Visible;
            EmptySectionView.Visibility = Visibility.Collapsed;
            return;
        }

        HomeView.Visibility = Visibility.Collapsed;
        EmptySectionView.Visibility = Visibility.Visible;
        SectionEyebrow.Text = section.ToUpperInvariant();

        (SectionTitle.Text, SectionDescription.Text, EmptyStateTitle.Text, EmptyStateDescription.Text) = section switch
        {
            "Search" => (
                "Find something to watch.",
                "Search the catalogs you choose to browse.",
                "Search is ready for its catalog connection.",
                "This first shell is intentionally local and contains no provider credentials or playback links."),
            "My List" => (
                "Keep your favorites close.",
                "Your list starts on this device and stays available offline.",
                "Your list is waiting for its first title.",
                "Additions and removals will be stored locally first. Any future cloud sync will be explicitly opt-in."),
            "History" => (
                "Pick up where you left off.",
                "Your viewing history belongs to your local library.",
                "Nothing here yet.",
                "Playback history and resume state will be added with the Windows player, without changing the Android app."),
            "Settings" => (
                "Make VibeFlix yours.",
                "Controls and account options will live here.",
                "A clean slate, by design.",
                "This starter build has no sign-in or sync controls. Local-first behavior and separate, optional sync remain product requirements."),
            _ => (
                section,
                "This section is part of the Windows client shell.",
                "More is on the way.",
                "This screen is a foundation, not a claim that the Android feature set has already been ported.")
        };
    }

    private void BrowseButton_Click(object sender, RoutedEventArgs e)
    {
        NavigateToSection("Search");
    }
}
