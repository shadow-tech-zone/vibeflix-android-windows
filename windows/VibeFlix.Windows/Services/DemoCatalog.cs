using VibeFlix.Windows.Models;

namespace VibeFlix.Windows.Services;

/// <summary>
/// Fictional titles used to exercise the desktop browsing and local-library UI.
/// These entries are not fetched from or attributed to any streaming provider.
/// </summary>
internal static class DemoCatalog
{
    public static string[] Genres { get; } =
    [
        "Drama",
        "Mystery",
        "Comedy",
        "Adventure",
        "Science Fiction",
        "Documentary",
        "Family"
    ];

    public static CatalogTitle[] Titles { get; } =
    [
        new CatalogTitle(
            Id: "the-glass-orbit",
            Name: "The Glass Orbit",
            Kind: "Series",
            Year: 2024,
            Rating: "TV-14",
            RuntimeMinutes: 47,
            Source: "Server 1",
            Language: "English",
            Genres: ["Science Fiction", "Mystery"],
            Synopsis: "A quiet observatory begins receiving echoes from a station that vanished beyond the moon.",
            AccentStart: "#425A78",
            AccentEnd: "#152339",
            IsNew: true,
            Seasons:
            [
                Season(1,
                    Episode(1, "A Signal in the Dark", 46, "An observatory receives an impossible transmission.", "The signal is repeating our last message."),
                    Episode(2, "The Empty Coordinates", 43, "A second set of coordinates points to an empty region of space.", "Those coordinates are not in any star chart."),
                    Episode(3, "A Map of Quiet", 49, "Mira finds a map encoded in the radio telescope's static.", "Listen between the pulses, not after them."),
                    Episode(4, "The Other Side", 45, "The team discovers a familiar voice hidden in the recording.", "If you can hear this, keep the station dark.")),
                Season(2,
                    Episode(1, "Return Window", 48, "A new signal arrives on the anniversary of the first one.", "The window is open for only eleven minutes."),
                    Episode(2, "The Long Frequency", 51, "A patient experiment reveals a pattern in the silence.", "We have been answering it for years."),
                    Episode(3, "Pale Blue Light", 44, "The crew sees a new point of light beyond the lunar horizon.", "That light was not there yesterday."))
            ]),
        new CatalogTitle(
            Id: "river-of-maps",
            Name: "River of Maps",
            Kind: "Movie",
            Year: 2023,
            Rating: "PG-13",
            RuntimeMinutes: 112,
            Source: "Server 2",
            Language: "English",
            Genres: ["Adventure", "Drama"],
            Synopsis: "An archivist and a boatbuilder follow a hand-drawn atlas through a changing delta.",
            AccentStart: "#8B684D",
            AccentEnd: "#2E393C"),
        new CatalogTitle(
            Id: "small-hours-club",
            Name: "The Small Hours Club",
            Kind: "Series",
            Year: 2022,
            Rating: "TV-PG",
            RuntimeMinutes: 29,
            Source: "Server 1",
            Language: "English",
            Genres: ["Comedy", "Drama"],
            Synopsis: "Three night-shift neighbours build an unlikely community in a twenty-four-hour bakery.",
            AccentStart: "#A56C62",
            AccentEnd: "#473A5B",
            Seasons:
            [
                Season(1,
                    Episode(1, "First Batch", 28, "The new baker meets the regulars before sunrise.", "There is always room for one more at this table."),
                    Episode(2, "The Lost Recipe", 31, "A flour-dusted notebook sends the neighbours looking for its author.", "It is written in the margins, not the ingredients."),
                    Episode(3, "After Closing", 27, "A late customer leaves behind a very familiar umbrella.", "We can solve this before the first bus."))
            ]),
        new CatalogTitle(
            Id: "blue-hour-fieldnotes",
            Name: "Blue Hour Fieldnotes",
            Kind: "Movie",
            Year: 2025,
            Rating: "G",
            RuntimeMinutes: 84,
            Source: "Server 2",
            Language: "Urdu",
            Genres: ["Documentary", "Family"],
            Synopsis: "A young photographer learns to record the wetlands she hopes her town will protect.",
            AccentStart: "#477B83",
            AccentEnd: "#1E344C",
            IsNew: true),
        new CatalogTitle(
            Id: "second-staircase",
            Name: "The Second Staircase",
            Kind: "Series",
            Year: 2021,
            Rating: "TV-14",
            RuntimeMinutes: 52,
            Source: "Server 1",
            Language: "Urdu",
            Genres: ["Mystery", "Drama"],
            Synopsis: "A conservator notices a staircase in a restored house that does not appear on any plan.",
            AccentStart: "#755A8F",
            AccentEnd: "#242C40",
            Seasons:
            [
                Season(1,
                    Episode(1, "The Measured Room", 50, "A careful survey reveals an extra step in the old house.", "The blueprint says this wall is three feet shorter."),
                    Episode(2, "Dust Lines", 53, "Fresh footprints appear in a room sealed for decades.", "Someone has been here since we locked the door."),
                    Episode(3, "A Door Below", 49, "A familiar tune leads the conservator beneath the stairs.", "Wait here. I know this song."))
            ]),
        new CatalogTitle(
            Id: "paper-comets",
            Name: "Paper Comets",
            Kind: "Movie",
            Year: 2020,
            Rating: "PG",
            RuntimeMinutes: 96,
            Source: "Server 2",
            Language: "English",
            Genres: ["Family", "Adventure"],
            Synopsis: "A summer science fair sends two siblings on a search for their grandfather's missing notebook.",
            AccentStart: "#A77C48",
            AccentEnd: "#485D75"),
        new CatalogTitle(
            Id: "winter-garden-radio",
            Name: "Winter Garden Radio",
            Kind: "Series",
            Year: 2023,
            Rating: "TV-PG",
            RuntimeMinutes: 38,
            Source: "Server 1",
            Language: "English",
            Genres: ["Comedy", "Mystery"],
            Synopsis: "A tiny community station broadcasts dedications from an old greenhouse during a snowbound winter.",
            AccentStart: "#597664",
            AccentEnd: "#34424A",
            IsNew: true,
            Seasons:
            [
                Season(1,
                    Episode(1, "The First Dedication", 37, "A shy caller asks the station to play a song for a stranger.", "Somebody out there still remembers the old chorus."),
                    Episode(2, "Static at Noon", 41, "A burst of static repeats a voice from the greenhouse archive.", "Turn the dial slowly. There is a voice underneath."),
                    Episode(3, "The Conservatory Key", 36, "The station's newest volunteer finds a key taped under a desk.", "I think this belongs to the room with all the ferns."))
            ]),
        new CatalogTitle(
            Id: "salt-and-saffron-skies",
            Name: "Salt and Saffron Skies",
            Kind: "Movie",
            Year: 2024,
            Rating: "PG-13",
            RuntimeMinutes: 105,
            Source: "Server 2",
            Language: "Urdu",
            Genres: ["Drama", "Adventure"],
            Synopsis: "Two cousins restore a weather station along a coast where the monsoon arrives early.",
            AccentStart: "#947253",
            AccentEnd: "#3A425B",
            IsNew: true),
        new CatalogTitle(
            Id: "ordinary-machines",
            Name: "Ordinary Machines",
            Kind: "Series",
            Year: 2025,
            Rating: "TV-14",
            RuntimeMinutes: 44,
            Source: "Server 1",
            Language: "English",
            Genres: ["Science Fiction", "Drama"],
            Synopsis: "A repair shop crew discovers that an abandoned household robot remembers a neighbourhood's history.",
            AccentStart: "#607F91",
            AccentEnd: "#2B344A",
            IsNew: true,
            Seasons:
            [
                Season(1,
                    Episode(1, "Soft Reset", 43, "A donated robot remembers the street before its last renovation.", "Please do not reset me. I know where the old well is."),
                    Episode(2, "Battery Weather", 46, "A strange weather log leads the crew to a missing sensor.", "It rained here before the clouds arrived."),
                    Episode(3, "The Parts Drawer", 45, "The youngest mechanic recognizes a name etched inside a circuit board.", "My grandmother made this mark."))
            ]),
        new CatalogTitle(
            Id: "the-last-tea-room",
            Name: "The Last Tea Room",
            Kind: "Movie",
            Year: 2019,
            Rating: "PG",
            RuntimeMinutes: 99,
            Source: "Server 2",
            Language: "Urdu",
            Genres: ["Drama", "Family"],
            Synopsis: "A family gathers to save a small tea room whose handwritten guestbook spans a century.",
            AccentStart: "#997057",
            AccentEnd: "#414A52"),
        new CatalogTitle(
            Id: "cloud-library",
            Name: "Cloud Library",
            Kind: "Series",
            Year: 2024,
            Rating: "TV-G",
            RuntimeMinutes: 25,
            Source: "Server 1",
            Language: "English",
            Genres: ["Family", "Comedy"],
            Synopsis: "A librarian and a curious child turn a rooftop reading room into a neighbourhood project.",
            AccentStart: "#6077A4",
            AccentEnd: "#4A6571",
            Seasons:
            [
                Season(1,
                    Episode(1, "A Room Above", 26, "The librarian opens the building's forgotten rooftop room.", "We could make a shelf for every neighbour."),
                    Episode(2, "The Borrowed Kite", 24, "A kite catches on the roof just as the reading club begins.", "One good idea can travel a long way."),
                    Episode(3, "A Shelf for Everyone", 27, "The children build a lending shelf for the whole block.", "This shelf belongs to everyone who needs a story."))
            ]),
        new CatalogTitle(
            Id: "the-patient-comet",
            Name: "The Patient Comet",
            Kind: "Movie",
            Year: 2022,
            Rating: "PG-13",
            RuntimeMinutes: 118,
            Source: "Server 2",
            Language: "English",
            Genres: ["Science Fiction", "Adventure"],
            Synopsis: "A science teacher returns to her hill-town school after a comet changes the night sky.",
            AccentStart: "#596B92",
            AccentEnd: "#302B4E"),
        new CatalogTitle(
            Id: "market-of-memories",
            Name: "Market of Memories",
            Kind: "Series",
            Year: 2020,
            Rating: "TV-14",
            RuntimeMinutes: 41,
            Source: "Server 1",
            Language: "Urdu",
            Genres: ["Drama", "Mystery"],
            Synopsis: "A second-hand bookstall owner uncovers the stories behind notes left between the pages.",
            AccentStart: "#9B754E",
            AccentEnd: "#3E3447",
            Seasons:
            [
                Season(1,
                    Episode(1, "Inside Cover", 40, "A note in a returned book points to a stall that disappeared years ago.", "The note is addressed to someone who still works here."),
                    Episode(2, "Margin Notes", 42, "Two readers remember the same afternoon very differently.", "There was another sentence in the margin."),
                    Episode(3, "The Missing Name", 43, "The bookseller finds a familiar name missing from every record.", "I promised I would never let the name disappear."))
            ]),
        new CatalogTitle(
            Id: "lantern-assembly",
            Name: "Lantern Assembly",
            Kind: "Movie",
            Year: 2021,
            Rating: "G",
            RuntimeMinutes: 78,
            Source: "Server 2",
            Language: "English",
            Genres: ["Documentary", "Family"],
            Synopsis: "Makers of all ages prepare a lantern parade in the courtyard of an old apartment block.",
            AccentStart: "#A07850",
            AccentEnd: "#41485E"),
        new CatalogTitle(
            Id: "monsoon-letters",
            Name: "Monsoon Letters",
            Kind: "Movie",
            Year: 2025,
            Rating: "PG",
            RuntimeMinutes: 91,
            Source: "Server 2",
            Language: "Hindi",
            Genres: ["Drama", "Family"],
            Synopsis: "Two childhood friends rebuild a riverside reading room through a season of unexpected rain.",
            AccentStart: "#7A6A62",
            AccentEnd: "#3D5460",
            IsNew: true)
    ];

    private static MediaSeason Season(int number, params MediaEpisode[] episodes) =>
        new(number, episodes);

    private static MediaEpisode Episode(
        int number,
        string name,
        int runtimeMinutes,
        string synopsis,
        string captionPreview) =>
        new(number, name, synopsis, runtimeMinutes, captionPreview);
}
