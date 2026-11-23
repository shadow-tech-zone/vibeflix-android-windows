import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

const RED = "#e50914";
const INK = "#080808";
const PAPER = "#f5f2ef";
const MUTED = "#aaa6a2";
const REPOSITORY_URL =
  "https://github.com/shadow-tech-zone/vibeflix-android-windows";
const STORAGE_KEY = "vibeflix-private-prototype-my-list";

const CATALOG = [
  {
    id: "quiet-hour",
    title: "The Quiet Hour",
    type: "Series",
    year: "2026",
    maturity: "16+",
    length: "2 seasons",
    genre: ["Mystery", "Drama"],
    art: "/art/spotlight-night.svg",
    cardArt: "/art/card-hollow.svg",
    progress: 64,
    episode: "S2:E4 · The Long Way Home",
    match: "98% match",
    synopsis:
      "A late-night radio host begins receiving calls from a town that disappeared from every map. Each voice knows what happens next—except for her.",
  },
  {
    id: "blue-hour",
    title: "Blue Hour",
    type: "Film",
    year: "2025",
    maturity: "13+",
    length: "1h 48m",
    genre: ["Drama", "City stories"],
    art: "/art/card-blue-hour.svg",
    cardArt: "/art/card-blue-hour.svg",
    progress: 31,
    episode: "Paused at 42 min",
    match: "94% match",
    synopsis:
      "Two strangers miss the last train home and spend one changing night learning how much a city can keep to itself.",
  },
  {
    id: "orbit-house",
    title: "Orbit House",
    type: "Series",
    year: "2026",
    maturity: "13+",
    length: "1 season",
    genre: ["Science fiction", "Mystery"],
    art: "/art/card-orbit.svg",
    cardArt: "/art/card-orbit.svg",
    progress: 0,
    episode: "6 episodes",
    match: "96% match",
    synopsis:
      "A small research crew keeps a station running at the quiet edge of a crowded solar system. Then the station starts answering questions nobody asked.",
  },
  {
    id: "embers-on-the-ridge",
    title: "Embers on the Ridge",
    type: "Film",
    year: "2024",
    maturity: "16+",
    length: "2h 02m",
    genre: ["Adventure", "Drama"],
    art: "/art/card-embers.svg",
    cardArt: "/art/card-embers.svg",
    progress: 0,
    episode: "2h 02m",
    match: "91% match",
    synopsis:
      "After a mountain observatory loses contact with the valley, a cartographer returns to the trail she swore she had left behind.",
  },
  {
    id: "river-of-glass",
    title: "River of Glass",
    type: "Series",
    year: "2025",
    maturity: "13+",
    length: "3 seasons",
    genre: ["Adventure", "Mystery"],
    art: "/art/card-river.svg",
    cardArt: "/art/card-river.svg",
    progress: 82,
    episode: "S1:E7 · The Crossing",
    match: "97% match",
    synopsis:
      "A field researcher follows an impossible river through a landscape that seems to remember everyone who passes through it.",
  },
  {
    id: "northbound",
    title: "Northbound",
    type: "Film",
    year: "2025",
    maturity: "13+",
    length: "1h 56m",
    genre: ["Adventure", "Drama"],
    art: "/art/card-north.svg",
    cardArt: "/art/card-north.svg",
    progress: 0,
    episode: "1h 56m",
    match: "93% match",
    synopsis:
      "A winter rail line is about to close for good. A conductor and one remaining passenger take the long route through the mountains.",
  },
  {
    id: "signal-lost",
    title: "Signal Lost",
    type: "Series",
    year: "2024",
    maturity: "16+",
    length: "2 seasons",
    genre: ["Thriller", "Science fiction"],
    art: "/art/card-signal.svg",
    cardArt: "/art/card-signal.svg",
    progress: 0,
    episode: "8 episodes",
    match: "95% match",
    synopsis:
      "A night-shift engineer discovers a second pattern hidden inside the city’s emergency broadcast. It only appears when every other channel goes quiet.",
  },
  {
    id: "hollow-sun",
    title: "A Hollow Sun",
    type: "Film",
    year: "2023",
    maturity: "16+",
    length: "1h 42m",
    genre: ["Mystery", "Drama"],
    art: "/art/card-hollow.svg",
    cardArt: "/art/card-hollow.svg",
    progress: 0,
    episode: "1h 42m",
    match: "89% match",
    synopsis:
      "A photographer returns to her childhood observatory and finds the lens still pointed at a light that should have faded decades ago.",
  },
];

function readSavedIds() {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function openRepository() {
  if (typeof window !== "undefined") {
    window.open(REPOSITORY_URL, "_blank", "noopener,noreferrer");
  }
}

function Brand() {
  return (
    <View style={styles.brand} accessibilityRole="header">
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>V</Text>
      </View>
      <Text style={styles.brandWord}>VIBEFLIX</Text>
    </View>
  );
}

function Header({
  activeTab,
  onTabChange,
  compact,
  searchOpen,
  onSearchToggle,
  query,
  onQueryChange,
}) {
  const tabs = ["Home", "Series", "Films", "My List"];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={styles.headerLeft}>
        <Brand />
        {!compact && (
          <View style={styles.navItems}>
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="button"
                onPress={() => onTabChange(tab)}
                style={styles.navPressable}
              >
                <Text
                  style={[
                    styles.navText,
                    activeTab === tab && styles.navTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.headerRight, compact && styles.headerRightCompact]}>
        {searchOpen && (
          <View style={[styles.searchBox, compact && styles.searchBoxCompact]}>
            <Text style={styles.searchGlyph}>⌕</Text>
            <TextInput
              accessibilityLabel="Search titles"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={onQueryChange}
              placeholder="Titles, genres"
              placeholderTextColor="#9d9996"
              style={styles.searchInput}
              value={query}
            />
            {query.length > 0 && (
              <Pressable accessibilityRole="button" onPress={() => onQueryChange("")}>
                <Text style={styles.searchClear}>×</Text>
              </Pressable>
            )}
          </View>
        )}
        <Pressable
          accessibilityLabel={searchOpen ? "Close search" : "Search"}
          accessibilityRole="button"
          onPress={onSearchToggle}
          style={[styles.headerIconButton, compact && styles.headerIconButtonCompact]}
        >
          <Text style={styles.searchIcon}>{searchOpen ? "×" : "⌕"}</Text>
        </Pressable>
        {compact && !searchOpen ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setMobileMenuOpen((open) => !open)}
            style={styles.mobileMenuButton}
          >
            <Text style={styles.mobileMenuText}>{mobileMenuOpen ? "CLOSE" : "BROWSE"}</Text>
          </Pressable>
        ) : !compact ? (
          <Text style={styles.kidsLink}>KIDS</Text>
        ) : null}
        {(!compact || !searchOpen) && (
          <Pressable
            accessibilityLabel="Profile: Sam"
            accessibilityRole="button"
            style={styles.avatarButton}
          >
            <Text style={styles.avatarText}>S</Text>
          </Pressable>
        )}
      </View>
      {compact && mobileMenuOpen && (
        <View style={styles.mobileMenu}>
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="button"
              onPress={() => {
                onTabChange(tab);
                setMobileMenuOpen(false);
              }}
              style={styles.mobileMenuItem}
            >
              <Text
                style={[
                  styles.mobileMenuItemText,
                  activeTab === tab && styles.navTextActive,
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function SolidButton({ children, onPress, quiet = false, icon }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.solidButton,
        quiet && styles.solidButtonQuiet,
        hovered && !quiet && styles.solidButtonHover,
        pressed && styles.solidButtonPressed,
      ]}
    >
      {icon && <Text style={[styles.solidButtonIcon, quiet && styles.quietIcon]}>{icon}</Text>}
      <Text style={[styles.solidButtonText, quiet && styles.solidButtonTextQuiet]}>
        {children}
      </Text>
    </Pressable>
  );
}

function Hero({ item, compact, onPlay, onMoreInfo }) {
  return (
    <View style={[styles.heroStage, compact && styles.heroStageCompact]}>
      <Image
        accessibilityLabel="Original illustrated night landscape for The Quiet Hour"
        resizeMode="cover"
        source={{ uri: "/art/spotlight-night.svg" }}
        style={styles.heroArtwork}
      />
      <View style={styles.heroAtmosphere} />
      <View style={styles.heroLeftShade} />
      <View style={styles.heroBottomShade} />
      <Header {...item.headerProps} compact={compact} />

      <View style={[styles.heroContent, compact && styles.heroContentCompact]}>
        <View style={styles.spotlightLabel}>
          <View style={styles.spotlightMark}>
            <Text style={styles.spotlightMarkText}>V</Text>
          </View>
          <Text style={styles.spotlightText}>VIBEFLIX SPOTLIGHT</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
          {item.title}
        </Text>
        <View style={styles.heroMetadata}>
          <Text style={styles.matchText}>{item.match}</Text>
          <Text style={styles.metadataDot}>•</Text>
          <Text style={styles.heroMetaText}>{item.year}</Text>
          <Text style={styles.metadataDot}>•</Text>
          <Text style={styles.heroMetaText}>{item.maturity}</Text>
          <Text style={styles.metadataDot}>•</Text>
          <Text style={styles.heroMetaText}>{item.length}</Text>
        </View>
        <Text style={[styles.heroSynopsis, compact && styles.heroSynopsisCompact]}>
          {item.synopsis}
        </Text>
        <View style={styles.heroActions}>
          <SolidButton icon="▶" onPress={() => onPlay(item)}>Play</SolidButton>
          <SolidButton icon="ⓘ" onPress={() => onMoreInfo(item)} quiet>
            More info
          </SolidButton>
        </View>
        <Text style={styles.heroGenre}>{item.genre.join("  ·  ")}</Text>
      </View>

      <View style={styles.heroSideNote}>
        <View style={styles.heroSideRule} />
        <Text style={styles.heroSideText}>A STORY FOR AFTER DARK</Text>
      </View>
      <View style={styles.heroAgeBadge}>
        <Text style={styles.heroAgeText}>16+</Text>
      </View>
    </View>
  );
}

function TitleCard({ item, onSelect, compact }) {
  return (
    <Pressable
      accessibilityLabel={`${item.title}, ${item.type}, ${item.match}`}
      accessibilityRole="button"
      onPress={() => onSelect(item)}
      style={({ hovered, pressed }) => [
        styles.titleCard,
        compact && styles.titleCardCompact,
        hovered && styles.titleCardHover,
        pressed && styles.titleCardPressed,
      ]}
    >
      <View style={styles.cardArtworkWrap}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={`Original fictional artwork for ${item.title}`}
          resizeMode="cover"
          source={{ uri: item.cardArt }}
          style={styles.cardArtwork}
        />
        <View style={styles.cardArtworkShade} />
        <View style={styles.cardTopLine}>
          <Text style={styles.cardType}>{item.type.toUpperCase()}</Text>
          <Text style={styles.cardMatch}>{item.match}</Text>
        </View>
        <View style={styles.cardPlayDot}>
          <Text style={styles.cardPlayIcon}>▶</Text>
        </View>
        {item.progress > 0 && (
          <View style={styles.cardProgressTrack}>
            <View style={[styles.cardProgressFill, { width: `${item.progress}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.cardSubline}>
          {item.progress > 0 ? item.episode : `${item.year}  ·  ${item.genre[0]}`}
        </Text>
      </View>
    </Pressable>
  );
}

function ContentRow({ title, note, items, compact, onSelect }) {
  const scroller = useRef(null);
  if (!items.length) return null;
  return (
    <View style={styles.rowSection}>
      <View style={styles.rowHeading}>
        <View style={styles.rowTitleGroup}>
          <Text accessibilityRole="header" style={[styles.rowTitle, compact && styles.rowTitleCompact]}>
            {title}
          </Text>
          {note && <Text style={styles.rowNote}>{note}</Text>}
        </View>
        <Pressable
          accessibilityLabel={`Explore more: ${title}`}
          accessibilityRole="button"
          onPress={() => scroller.current?.scrollToEnd({ animated: true })}
          style={styles.rowMore}
        >
          <Text style={styles.rowMoreText}>EXPLORE</Text>
          <Text style={styles.rowMoreArrow}>›</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scroller}
        contentContainerStyle={[styles.rowScroller, compact && styles.rowScrollerCompact]}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {items.map((item) => (
          <TitleCard key={item.id} item={item} onSelect={onSelect} compact={compact} />
        ))}
      </ScrollView>
    </View>
  );
}

function DetailModal({ item, saved, onClose, onPlay, onToggleSaved }) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(item)}
    >
      {item && (
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="Close details" onPress={onClose} style={styles.modalDismiss} />
          <View style={styles.detailSheet}>
            <View style={styles.detailArtworkWrap}>
              <Image
                accessibilityLabel={`Original fictional artwork for ${item.title}`}
                resizeMode="cover"
                source={{ uri: item.art }}
                style={styles.detailArtwork}
              />
              <View style={styles.detailArtworkFade} />
              <Pressable accessibilityLabel="Close details" onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <Text style={styles.detailKicker}>VIBEFLIX · FICTIONAL DEMO TITLE</Text>
              <Text accessibilityRole="header" style={styles.detailTitle}>{item.title}</Text>
              <View style={styles.detailMetadata}>
                <Text style={styles.matchText}>{item.match}</Text>
                <Text style={styles.metadataDot}>•</Text>
                <Text style={styles.detailMetaText}>{item.year}</Text>
                <Text style={styles.metadataDot}>•</Text>
                <Text style={styles.detailMetaText}>{item.maturity}</Text>
                <Text style={styles.metadataDot}>•</Text>
                <Text style={styles.detailMetaText}>{item.length}</Text>
              </View>
              <Text style={styles.detailSynopsis}>{item.synopsis}</Text>
              <Text style={styles.detailGenres}>
                <Text style={styles.detailGenreLabel}>Genres: </Text>
                {item.genre.join(", ")}
              </Text>
              <View style={styles.detailActions}>
                <SolidButton icon="▶" onPress={() => onPlay(item)}>Play</SolidButton>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onToggleSaved(item.id)}
                  style={styles.listButton}
                >
                  <Text style={styles.listButtonIcon}>{saved ? "✓" : "+"}</Text>
                  <Text style={styles.listButtonText}>{saved ? "In My List" : "My List"}</Text>
                </Pressable>
              </View>
              <Text style={styles.detailDisclaimer}>
                This private prototype uses fictional sample titles and original artwork. No streaming source is connected.
              </Text>
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}

function PlayerModal({ item, visible, onClose }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.playerBackdrop}>
        <Image
          accessibilityLabel="Original fictional artwork"
          resizeMode="cover"
          source={{ uri: item?.art || "/art/spotlight-night.svg" }}
          style={styles.playerArtwork}
        />
        <View style={styles.playerShade} />
        <Pressable accessibilityLabel="Close preview" onPress={onClose} style={styles.closeButtonPlayer}>
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
        <View style={styles.playerMessage}>
          <View style={styles.playerIconCircle}>
            <Text style={styles.playerIcon}>▶</Text>
          </View>
          <Text style={styles.playerTitle}>{item?.title || "VibeFlix"}</Text>
          <Text style={styles.playerBody}>
            Playback isn’t connected in this private UI experiment. This screen is a visual prototype only.
          </Text>
        </View>
        <Text style={styles.playerPrototypeLabel}>PRIVATE PROTOTYPE · NO STREAM SOURCE CONNECTED</Text>
      </View>
    </Modal>
  );
}

function EmptyState({ onExplore }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>+</Text></View>
      <Text accessibilityRole="header" style={styles.emptyTitle}>Your list is waiting.</Text>
      <Text style={styles.emptyBody}>
        Save a title and it’ll be here when you want it. Your list is stored in this browser for the prototype.
      </Text>
      <Pressable accessibilityRole="button" onPress={onExplore} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>BROWSE TITLES</Text>
      </Pressable>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerTop}>
        <Brand />
        <Text style={styles.footerLabel}>PRIVATE HOBBY PROTOTYPE</Text>
      </View>
      <Text style={styles.footerText}>
        VibeFlix is an independent personal project. This UI uses fictional demo titles and original illustrations; it is not affiliated with Netflix or any content provider. No media playback or provider service is connected.
      </Text>
      <View style={styles.footerBottom}>
        <Text style={styles.footerSmall}>© 2026 VIBEFLIX · PERSONAL USE</Text>
        <Pressable accessibilityRole="link" onPress={openRepository}>
          <Text style={styles.footerLink}>PROJECT SOURCE ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [activeTab, setActiveTab] = useState("Home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState(readSavedIds);
  const [selectedItem, setSelectedItem] = useState(null);
  const [playingItem, setPlayingItem] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // Local persistence is optional; the prototype still works without browser storage.
    }
  }, [savedIds]);

  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const visibleItems = useMemo(() => {
    let items = CATALOG;
    if (activeTab === "Series") items = items.filter((item) => item.type === "Series");
    if (activeTab === "Films") items = items.filter((item) => item.type === "Film");
    if (activeTab === "My List") items = items.filter((item) => saved.has(item.id));
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) {
      items = items.filter((item) =>
        [item.title, item.synopsis, item.type, ...item.genre]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }
    return items;
  }, [activeTab, query, saved]);

  const isHome = activeTab === "Home" && query.trim().length === 0;
  const heroItem = CATALOG[0];
  const rowSections = useMemo(() => {
    if (query.trim()) {
      return [{ title: `Search results for “${query.trim()}”`, note: "FICTIONAL SAMPLE CATALOG", items: visibleItems }];
    }
    if (activeTab === "My List") {
      return [{ title: "My List", note: `${visibleItems.length} SAVED`, items: visibleItems }];
    }
    if (activeTab !== "Home") {
      return [{ title: activeTab === "Series" ? "Series" : "Films", note: "CHOOSE SOMETHING TO WATCH", items: visibleItems }];
    }
    return [
      {
        title: "Continue watching",
        note: "PICK UP WHERE YOU LEFT OFF",
        items: CATALOG.filter((item) => item.progress > 0),
      },
      {
        title: "A little mystery",
        note: "NEW STORIES TO DISCOVER",
        items: CATALOG.filter((item) => item.genre.includes("Mystery") || item.genre.includes("Thriller")),
      },
      {
        title: "Other worlds, close by",
        note: "A CHANGE OF SCENERY",
        items: CATALOG.filter((item) => item.genre.includes("Science fiction") || item.genre.includes("Adventure")),
      },
      {
        title: "Films for later",
        note: "SAVE A PLACE FOR TONIGHT",
        items: CATALOG.filter((item) => item.type === "Film"),
      },
    ];
  }, [activeTab, query, visibleItems]);

  const toggleSaved = (id) => {
    setSavedIds((ids) => ids.includes(id) ? ids.filter((savedId) => savedId !== id) : [...ids, id]);
  };

  const startPreview = (item) => {
    setSelectedItem(null);
    setPlayingItem(item);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== "Home") {
      setSearchOpen(false);
      setQuery("");
    }
  };

  const handleSearchToggle = () => {
    if (searchOpen) {
      setSearchOpen(false);
      setQuery("");
    } else {
      setSearchOpen(true);
    }
  };

  return (
    <ScrollView
      style={styles.appRoot}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      {isHome ? (
        <Hero
          compact={compact}
          item={{ ...heroItem, headerProps: {
            activeTab,
            onTabChange: handleTabChange,
            searchOpen,
            onSearchToggle: handleSearchToggle,
            query,
            onQueryChange: setQuery,
          } }}
          onMoreInfo={setSelectedItem}
          onPlay={startPreview}
        />
      ) : (
        <View style={[styles.catalogHeader, compact && styles.catalogHeaderCompact]}>
          <Header
            activeTab={activeTab}
            compact={compact}
            onTabChange={handleTabChange}
            onQueryChange={setQuery}
            onSearchToggle={handleSearchToggle}
            query={query}
            searchOpen={searchOpen}
          />
          <View style={styles.catalogIntro}>
            <Text style={styles.catalogKicker}>VIBEFLIX · PRIVATE PROTOTYPE</Text>
            <Text accessibilityRole="header" style={[styles.catalogTitle, compact && styles.catalogTitleCompact]}>
              {query.trim() ? "Search" : activeTab === "My List" ? "My List" : `Explore ${activeTab.toLowerCase()}`}
            </Text>
            <Text style={styles.catalogSubcopy}>
              A fictional sample catalog for the VibeFlix UI experiment.
            </Text>
          </View>
        </View>
      )}

      {activeTab === "My List" && visibleItems.length === 0 ? (
        <EmptyState onExplore={() => handleTabChange("Home")} />
      ) : (
        <View style={[styles.rowsWrap, compact && styles.rowsWrapCompact]}>
          {rowSections.map((row) => (
            <ContentRow
              key={`${activeTab}-${row.title}`}
              compact={compact}
              items={row.items}
              note={row.note}
              onSelect={setSelectedItem}
              title={row.title}
            />
          ))}
          {visibleItems.length === 0 && query.trim() && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsTitle}>No matches this time.</Text>
              <Text style={styles.noResultsBody}>Try a title, genre, or a different search.</Text>
              <Pressable accessibilityRole="button" onPress={closeSearch} style={styles.clearSearchButton}>
                <Text style={styles.clearSearchText}>CLEAR SEARCH</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <View style={[styles.privateNote, compact && styles.privateNoteCompact]}>
        <View style={styles.privateNoteMark}><Text style={styles.privateNoteMarkText}>i</Text></View>
        <View style={styles.privateNoteCopy}>
          <Text style={styles.privateNoteTitle}>A private UI experiment</Text>
          <Text style={styles.privateNoteBody}>
            All titles and artwork on this screen are fictional demo content. My List stays in this browser. No account, provider API, or video stream is connected.
          </Text>
        </View>
        <Text style={styles.privateNoteTag}>PERSONAL USE</Text>
      </View>
      <Footer />

      <DetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onPlay={startPreview}
        onToggleSaved={toggleSaved}
        saved={selectedItem ? saved.has(selectedItem.id) : false}
      />
      <PlayerModal item={playingItem} onClose={() => setPlayingItem(null)} visible={Boolean(playingItem)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: INK },
  pageContent: { flexGrow: 1, minHeight: "100vh", backgroundColor: INK },
  heroStage: {
    position: "relative",
    width: "100%",
    height: 620,
    minHeight: 550,
    overflow: "hidden",
    backgroundColor: "#17191f",
  },
  heroStageCompact: { height: 560, minHeight: 520 },
  heroArtwork: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  heroAtmosphere: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0b0b0d", opacity: 0.12 },
  heroLeftShade: { position: "absolute", top: 0, left: 0, bottom: 0, width: "66%", backgroundColor: "#08090c", opacity: 0.2 },
  heroBottomShade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 185, backgroundColor: INK, opacity: 0.48 },
  header: {
    position: "absolute",
    zIndex: 10,
    top: 0,
    left: 0,
    right: 0,
    minHeight: 72,
    paddingHorizontal: 48,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(8,8,8,0.63)",
  },
  headerCompact: { minHeight: 64, paddingHorizontal: 18, paddingVertical: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 36, flex: 1 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 29, height: 29, alignItems: "center", justifyContent: "center", borderRadius: 5, backgroundColor: RED },
  brandMarkText: { color: "#ffffff", fontFamily: "Arial", fontSize: 20, fontWeight: "900", lineHeight: 22, transform: [{ skewX: "-8deg" }] },
  brandWord: { color: RED, fontFamily: "Arial", fontSize: 17, fontWeight: "900", letterSpacing: 1.6 },
  navItems: { flexDirection: "row", alignItems: "center", gap: 21 },
  navPressable: { minHeight: 32, justifyContent: "center" },
  navText: { color: "#e1ddda", fontFamily: "Arial", fontSize: 12, fontWeight: "500" },
  navTextActive: { color: "#ffffff", fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 18 },
  headerRightCompact: { gap: 8 },
  headerIconButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerIconButtonCompact: { width: 28 },
  searchIcon: { color: "#f5f2ef", fontFamily: "Arial", fontSize: 27, lineHeight: 30 },
  kidsLink: { color: "#f2efeb", fontFamily: "Arial", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  avatarButton: { width: 31, height: 31, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: "#714149" },
  avatarText: { color: "#fff", fontFamily: "Arial", fontSize: 13, fontWeight: "700" },
  searchBox: { width: 230, height: 36, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9, borderWidth: 1, borderColor: "#b5b1ad", backgroundColor: "rgba(8,8,8,0.9)" },
  searchBoxCompact: { width: 118, gap: 4, paddingHorizontal: 6 },
  searchGlyph: { color: "#f5f2ef", fontFamily: "Arial", fontSize: 23, lineHeight: 25 },
  searchInput: { flex: 1, minWidth: 0, color: "#fff", fontFamily: "Arial", fontSize: 12, paddingVertical: 4, outlineStyle: "none" },
  searchClear: { color: "#fff", fontFamily: "Arial", fontSize: 21 },
  mobileMenuButton: { minHeight: 32, justifyContent: "center", paddingHorizontal: 6 },
  mobileMenuText: { color: "#fff", fontFamily: "Arial", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  mobileMenu: { position: "absolute", top: 57, right: 18, zIndex: 20, minWidth: 170, paddingVertical: 8, backgroundColor: "rgba(15,15,16,0.98)", borderWidth: 1, borderColor: "#333" },
  mobileMenuItem: { minHeight: 42, justifyContent: "center", paddingHorizontal: 17 },
  mobileMenuItemText: { color: "#ddd", fontFamily: "Arial", fontSize: 13 },
  heroContent: { position: "absolute", zIndex: 2, left: 52, bottom: 88, width: 560, maxWidth: "55%" },
  heroContentCompact: { left: 21, right: 20, bottom: 58, width: "auto", maxWidth: 470 },
  spotlightLabel: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  spotlightMark: { width: 20, height: 23, alignItems: "center", justifyContent: "center", borderRadius: 3, backgroundColor: RED },
  spotlightMarkText: { color: "#fff", fontFamily: "Arial", fontSize: 14, fontWeight: "900" },
  spotlightText: { color: "#eee9e5", fontFamily: "Arial", fontSize: 10, fontWeight: "800", letterSpacing: 2.1 },
  heroTitle: { color: "#fff", fontFamily: "Arial", fontSize: 58, fontWeight: "900", lineHeight: 63, letterSpacing: -1.6, textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 7 },
  heroTitleCompact: { maxWidth: 400, fontSize: 41, lineHeight: 45, letterSpacing: -1.1 },
  heroMetadata: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 9, marginTop: 14 },
  matchText: { color: "#46d369", fontFamily: "Arial", fontSize: 11, fontWeight: "800" },
  metadataDot: { color: "#d0cbc7", fontFamily: "Arial", fontSize: 10 },
  heroMetaText: { color: "#e8e3df", fontFamily: "Arial", fontSize: 11 },
  heroSynopsis: { maxWidth: 520, marginTop: 13, color: "#f1eeeb", fontFamily: "Arial", fontSize: 14, lineHeight: 21, textShadowColor: "rgba(0,0,0,0.65)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  heroSynopsisCompact: { maxWidth: 430, fontSize: 12, lineHeight: 18 },
  heroActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 21 },
  solidButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 17, borderRadius: 4, backgroundColor: "#f5f2ef" },
  solidButtonQuiet: { backgroundColor: "rgba(109,108,109,0.82)" },
  solidButtonHover: { backgroundColor: "#dedad7" },
  solidButtonPressed: { opacity: 0.78 },
  solidButtonText: { color: "#111", fontFamily: "Arial", fontSize: 13, fontWeight: "800" },
  solidButtonTextQuiet: { color: "#fff" },
  solidButtonIcon: { color: "#111", fontFamily: "Arial", fontSize: 13 },
  quietIcon: { color: "#fff" },
  heroGenre: { marginTop: 15, color: "#d8d3cf", fontFamily: "Arial", fontSize: 10, letterSpacing: 0.2 },
  heroSideNote: { position: "absolute", zIndex: 3, right: 24, bottom: 111, flexDirection: "row", alignItems: "center", gap: 8, transform: [{ rotate: "-90deg" }], transformOrigin: "right bottom" },
  heroSideRule: { width: 28, height: 2, backgroundColor: RED },
  heroSideText: { color: "#ebe5df", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1.6 },
  heroAgeBadge: { position: "absolute", right: 0, bottom: 110, width: 52, minHeight: 39, justifyContent: "center", paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: RED, backgroundColor: "rgba(23,23,24,0.76)" },
  heroAgeText: { color: "#f6f2ee", fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
  catalogHeader: { position: "relative", height: 190, backgroundColor: "#141416" },
  catalogHeaderCompact: { height: 180 },
  catalogIntro: { position: "absolute", left: 52, bottom: 24 },
  catalogKicker: { color: "#d4cfcb", fontFamily: "Arial", fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  catalogTitle: { marginTop: 7, color: "#fff", fontFamily: "Arial", fontSize: 35, fontWeight: "800", letterSpacing: -0.6 },
  catalogTitleCompact: { fontSize: 29 },
  catalogSubcopy: { marginTop: 6, color: MUTED, fontFamily: "Arial", fontSize: 11 },
  rowsWrap: { position: "relative", zIndex: 3, marginTop: -61, paddingBottom: 15 },
  rowsWrapCompact: { marginTop: -40 },
  rowSection: { marginBottom: 29 },
  rowHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 48, marginBottom: 12 },
  rowTitleGroup: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 12 },
  rowTitle: { color: "#f4f1ed", fontFamily: "Arial", fontSize: 19, fontWeight: "800", letterSpacing: -0.2 },
  rowTitleCompact: { fontSize: 16 },
  rowNote: { color: "#9d9996", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1.1 },
  rowMore: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 10 },
  rowMoreText: { color: "#aaa5a1", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  rowMoreArrow: { color: "#aaa5a1", fontFamily: "Arial", fontSize: 18, lineHeight: 18 },
  rowScroller: { gap: 10, paddingHorizontal: 48, paddingTop: 2, paddingBottom: 7 },
  rowScrollerCompact: { gap: 8, paddingHorizontal: 20 },
  titleCard: { width: 232, borderRadius: 5, overflow: "hidden", backgroundColor: "#171719", transform: [{ scale: 1 }], zIndex: 1 },
  titleCardCompact: { width: 180 },
  titleCardHover: { transform: [{ scale: 1.045 }], zIndex: 5 },
  titleCardPressed: { transform: [{ scale: 0.985 }] },
  cardArtworkWrap: { position: "relative", width: "100%", height: 130, overflow: "hidden", backgroundColor: "#292934" },
  cardArtwork: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  cardArtworkShade: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.13)" },
  cardTopLine: { position: "absolute", top: 8, left: 9, right: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardType: { color: "#f4e5d8", fontFamily: "Arial", fontSize: 7, fontWeight: "800", letterSpacing: 1.1, textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  cardMatch: { color: "#4de278", fontFamily: "Arial", fontSize: 8, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  cardPlayDot: { position: "absolute", right: 9, bottom: 9, width: 27, height: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", borderRadius: 16, backgroundColor: "rgba(9,9,10,0.55)" },
  cardPlayIcon: { marginLeft: 2, color: "#fff", fontFamily: "Arial", fontSize: 9 },
  cardProgressTrack: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: "rgba(255,255,255,0.42)" },
  cardProgressFill: { height: 3, backgroundColor: RED },
  cardCopy: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 },
  cardTitle: { color: "#f4f1ed", fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
  cardSubline: { marginTop: 4, color: "#9d9996", fontFamily: "Arial", fontSize: 9 },
  emptyState: { minHeight: 250, alignItems: "center", justifyContent: "center", paddingHorizontal: 25, paddingVertical: 45 },
  emptyMark: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#57514e", borderRadius: 22 },
  emptyMarkText: { color: "#eee", fontFamily: "Arial", fontSize: 24 },
  emptyTitle: { marginTop: 16, color: "#fff", fontFamily: "Arial", fontSize: 20, fontWeight: "700" },
  emptyBody: { maxWidth: 380, marginTop: 8, color: MUTED, fontFamily: "Arial", fontSize: 12, lineHeight: 19, textAlign: "center" },
  emptyButton: { marginTop: 20, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 3, backgroundColor: RED },
  emptyButtonText: { color: "#fff", fontFamily: "Arial", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  noResults: { alignItems: "center", padding: 50 },
  noResultsTitle: { color: "#fff", fontFamily: "Arial", fontSize: 19, fontWeight: "700" },
  noResultsBody: { marginTop: 8, color: MUTED, fontFamily: "Arial", fontSize: 12 },
  clearSearchButton: { marginTop: 16, padding: 10 },
  clearSearchText: { color: "#fff", fontFamily: "Arial", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  privateNote: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 48, marginTop: 11, marginBottom: 49, paddingHorizontal: 17, paddingVertical: 14, borderWidth: 1, borderColor: "#2d2928", backgroundColor: "#101011" },
  privateNoteCompact: { marginHorizontal: 20, marginBottom: 33, paddingHorizontal: 12, flexWrap: "wrap" },
  privateNoteMark: { width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#353033" },
  privateNoteMarkText: { color: "#e7c9c5", fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
  privateNoteCopy: { flex: 1, minWidth: 180 },
  privateNoteTitle: { color: "#e7e1dd", fontFamily: "Arial", fontSize: 10, fontWeight: "700" },
  privateNoteBody: { marginTop: 4, color: "#938d89", fontFamily: "Arial", fontSize: 9, lineHeight: 14 },
  privateNoteTag: { color: "#aaa3a0", fontFamily: "Arial", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  footer: { paddingHorizontal: 48, paddingTop: 23, paddingBottom: 27, borderTopWidth: 1, borderTopColor: "#242121" },
  footerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLabel: { color: "#8c8581", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1.2 },
  footerText: { maxWidth: 740, marginTop: 16, color: "#79736f", fontFamily: "Arial", fontSize: 9, lineHeight: 15 },
  footerBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 21 },
  footerSmall: { color: "#6d6763", fontFamily: "Arial", fontSize: 8, letterSpacing: 0.7 },
  footerLink: { color: "#c9c2bd", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingVertical: 22, backgroundColor: "rgba(0,0,0,0.78)" },
  modalDismiss: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  detailSheet: { width: "100%", maxWidth: 680, maxHeight: "92%", overflow: "hidden", borderRadius: 8, backgroundColor: "#181819" },
  detailArtworkWrap: { position: "relative", width: "100%", height: 270, backgroundColor: "#23232c" },
  detailArtwork: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  detailArtworkFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 125, backgroundColor: "rgba(24,24,25,0.65)" },
  closeButton: { position: "absolute", top: 13, right: 13, width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(8,8,8,0.78)" },
  closeButtonText: { color: "#fff", fontFamily: "Arial", fontSize: 26, lineHeight: 29 },
  detailContent: { paddingHorizontal: 27, paddingTop: 7, paddingBottom: 26 },
  detailKicker: { color: "#a9a19c", fontFamily: "Arial", fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  detailTitle: { marginTop: 7, color: "#fff", fontFamily: "Arial", fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  detailMetadata: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 11 },
  detailMetaText: { color: "#ddd7d3", fontFamily: "Arial", fontSize: 10 },
  detailSynopsis: { maxWidth: 580, marginTop: 16, color: "#e7e2de", fontFamily: "Arial", fontSize: 12, lineHeight: 19 },
  detailGenres: { marginTop: 13, color: "#c3bcb7", fontFamily: "Arial", fontSize: 10 },
  detailGenreLabel: { color: "#8f8985" },
  detailActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 19 },
  listButton: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: "#797270", borderRadius: 4, backgroundColor: "#252526" },
  listButtonIcon: { color: "#fff", fontFamily: "Arial", fontSize: 20, lineHeight: 22 },
  listButtonText: { color: "#fff", fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
  detailDisclaimer: { marginTop: 19, color: "#77716d", fontFamily: "Arial", fontSize: 8, lineHeight: 13 },
  playerBackdrop: { flex: 1, position: "relative", alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#070708" },
  playerArtwork: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.45 },
  playerShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.66)" },
  closeButtonPlayer: { position: "absolute", top: 28, right: 28, width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "rgba(20,20,21,0.8)" },
  playerMessage: { zIndex: 1, alignItems: "center", paddingHorizontal: 22 },
  playerIconCircle: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.75)", borderRadius: 32 },
  playerIcon: { marginLeft: 3, color: "#fff", fontFamily: "Arial", fontSize: 18 },
  playerTitle: { marginTop: 18, color: "#fff", fontFamily: "Arial", fontSize: 25, fontWeight: "800", textAlign: "center" },
  playerBody: { maxWidth: 400, marginTop: 10, color: "#d4cfcb", fontFamily: "Arial", fontSize: 12, lineHeight: 19, textAlign: "center" },
  playerPrototypeLabel: { position: "absolute", bottom: 23, color: "#a8a19c", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1.5, textAlign: "center" },
});
