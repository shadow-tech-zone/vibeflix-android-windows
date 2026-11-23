import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import EmptyState from "./components/EmptyState.jsx";
import Footer from "./components/Footer.jsx";
import GetStartedFlow from "./components/GetStartedFlow.jsx";
import MediaRail from "./components/MediaRail.jsx";
import Navigation from "./components/Navigation.jsx";
import PlaybackOverlay from "./components/PlaybackOverlay.jsx";
import SignInPage from "./components/SignInPage.jsx";
import SpotlightHero from "./components/SpotlightHero.jsx";
import WelcomePage from "./components/WelcomePage.jsx";
import TitleDetailsModal from "./components/TitleDetailsModal.jsx";
import {
  buildHomeRows,
  buildPopularRows,
  buildTypeRows,
  CATALOG,
  FEATURED_TITLE_ID,
} from "./data/catalog.js";
import { useMyList } from "./hooks/useMyList.js";
import { COLORS, PAGE_GUTTER } from "./theme.js";

function NoSearchResults({ query, onClear }) {
  return (
    <View style={styles.noResults}>
      <Text accessibilityRole="header" style={styles.noResultsTitle}>No titles found</Text>
      <Text style={styles.noResultsText}>Try a different title, person, or genre.</Text>
      <Pressable accessibilityRole="button" onPress={onClear} style={styles.clearButton}>
        <Text style={styles.clearButtonText}>Clear Search</Text>
      </Pressable>
    </View>
  );
}

function CatalogHeading({ title, compact }) {
  return (
    <View style={[styles.catalogHeading, compact && styles.catalogHeadingCompact]}>
      <Text accessibilityRole="header" style={[styles.catalogTitle, compact && styles.catalogTitleCompact]}>
        {title}
      </Text>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const pageScrollRef = useRef(null);
  const [screen, setScreen] = useState("welcome");
  const [activeTab, setActiveTab] = useState("Home");
  const [profile, setProfile] = useState("Sam");
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [playingItem, setPlayingItem] = useState(null);
  const { savedSet, toggleSaved } = useMyList();

  const scrollPageToTop = () => {
    const pageScroll = pageScrollRef.current;
    const node = pageScroll?.getScrollableNode?.() ?? pageScroll;
    if (node?.scrollTop > 0) pageScroll.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedItem(null);
        setPlayingItem(null);
        setSearchOpen(false);
        setQuery("");
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        scrollPageToTop();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const profileCatalog = useMemo(
    () => CATALOG.filter((item) => profile !== "Kids" || item.age <= 13),
    [profile],
  );

  const visibleItems = useMemo(() => {
    let items = profileCatalog;
    if (activeTab === "TV Shows") items = items.filter((item) => item.type === "Series");
    if (activeTab === "Movies") items = items.filter((item) => item.type === "Film");
    if (activeTab === "My List") items = items.filter((item) => savedSet.has(item.id));

    const term = query.trim().toLowerCase();
    if (term) {
      items = items.filter((item) =>
        [item.title, item.synopsis, item.type, item.year, ...item.genres]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    return items;
  }, [activeTab, profileCatalog, query, savedSet]);

  const isHome = activeTab === "Home" && query.trim().length === 0;
  const featuredItem = profileCatalog.find((item) => item.id === FEATURED_TITLE_ID) || profileCatalog[0];

  const rows = useMemo(() => {
    if (query.trim()) {
      return [{ id: "search-results", title: `Search results for “${query.trim()}”`, items: visibleItems }];
    }
    if (activeTab === "My List") {
      return [{ id: "my-list", title: "My List", items: visibleItems }];
    }
    if (activeTab === "TV Shows") return buildTypeRows(profileCatalog, "Series");
    if (activeTab === "Movies") return buildTypeRows(profileCatalog, "Film");
    if (activeTab === "New & Popular") return buildPopularRows(profileCatalog);
    if (activeTab !== "Home") {
      return [{ id: activeTab.toLowerCase(), title: activeTab, items: visibleItems }];
    }
    return buildHomeRows(profileCatalog, profile);
  }, [activeTab, profile, profileCatalog, query, visibleItems]);

  const handlePageScroll = (event) => {
    const scrollY =
      event?.nativeEvent?.contentOffset?.y ??
      event?.target?.scrollTop ??
      event?.currentTarget?.scrollTop ??
      0;
    const nextScrolled = scrollY > 36;
    setScrolled((current) => (current === nextScrolled ? current : nextScrolled));
  };

  const handleTabChange = (tab) => {
    scrollPageToTop();
    setActiveTab(tab);
    setSearchOpen(false);
    setQuery("");
  };

  const handleProfileChange = (name) => {
    scrollPageToTop();
    setProfile(name);
    setActiveTab("Home");
    setSearchOpen(false);
    setQuery("");
  };

  const handleSearchToggle = () => {
    if (searchOpen) {
      setSearchOpen(false);
      setQuery("");
    } else {
      scrollPageToTop();
      setSearchOpen(true);
    }
  };

  const handlePlay = (item) => {
    setSelectedItem(null);
    setPlayingItem(item);
  };

  const navigationProps = {
    activeTab,
    scrolled,
    onTabChange: handleTabChange,
    profile,
    onProfileChange: handleProfileChange,
    searchOpen,
    onSearchToggle: handleSearchToggle,
    query,
    onQueryChange: setQuery,
  };

  const pageTitle = query.trim()
    ? "Search"
    : activeTab === "My List"
      ? "My List"
      : activeTab === "Home"
        ? "Browse"
        : activeTab;

  const enterBrowse = (selectedProfile = profile) => {
    setProfile(selectedProfile);
    setActiveTab("Home");
    setSearchOpen(false);
    setQuery("");
    setScreen("browse");
  };

  if (screen === "welcome") {
    return (
      <WelcomePage
        compact={compact}
        onBrowse={() => enterBrowse()}
        onSignIn={() => setScreen("sign-in")}
        onGetStarted={() => setScreen("get-started")}
      />
    );
  }

  if (screen === "sign-in") {
    return (
      <SignInPage
        compact={compact}
        onBack={() => setScreen("welcome")}
        onBrowse={() => enterBrowse()}
        onGetStarted={() => setScreen("get-started")}
      />
    );
  }

  if (screen === "get-started") {
    return (
      <GetStartedFlow
        compact={compact}
        onBack={() => setScreen("welcome")}
        onSignIn={() => setScreen("sign-in")}
        onComplete={enterBrowse}
      />
    );
  }

  return (
    <ScrollView
      ref={pageScrollRef}
      style={styles.appRoot}
      contentContainerStyle={styles.pageContent}
      onScroll={handlePageScroll}
      scrollEventThrottle={64}
      showsVerticalScrollIndicator={false}
    >
      {isHome ? (
        <SpotlightHero
          item={featuredItem}
          compact={compact}
          navigationProps={navigationProps}
          onPlay={handlePlay}
          onMoreInfo={setSelectedItem}
        />
      ) : (
        <View style={[styles.catalogHeader, compact && styles.catalogHeaderCompact]}>
          <Navigation {...navigationProps} compact={compact} />
          <CatalogHeading title={pageTitle} compact={compact} />
        </View>
      )}

      {activeTab === "My List" && visibleItems.length === 0 && !query.trim() ? (
        <EmptyState onBrowse={() => handleTabChange("Home")} />
      ) : (
        <View style={[styles.railsWrap, isHome && styles.homeRailsWrap, compact && isHome && styles.homeRailsWrapCompact]}>
          {rows.map((row) => (
            <MediaRail
              key={row.id}
              title={row.title}
              items={row.items}
              compact={compact}
              onSelect={setSelectedItem}
            />
          ))}
          {query.trim() && visibleItems.length === 0 && (
            <NoSearchResults query={query} onClear={() => setQuery("")} />
          )}
        </View>
      )}

      <Footer onOpenWelcome={() => setScreen("welcome")} />
      <TitleDetailsModal
        item={selectedItem}
        saved={selectedItem ? savedSet.has(selectedItem.id) : false}
        onClose={() => setSelectedItem(null)}
        onPlay={handlePlay}
        onToggleSaved={toggleSaved}
      />
      <PlaybackOverlay item={playingItem} onClose={() => setPlayingItem(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: COLORS.background },
  pageContent: { flexGrow: 1, minHeight: "100vh", backgroundColor: COLORS.background },
  catalogHeader: { position: "relative", height: 198, backgroundColor: COLORS.background },
  catalogHeaderCompact: { height: 180 },
  catalogHeading: { position: "absolute", left: PAGE_GUTTER, bottom: 22 },
  catalogHeadingCompact: { left: 20, bottom: 21 },
  catalogTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  catalogTitleCompact: { fontSize: 28 },
  railsWrap: { paddingTop: 21, paddingBottom: 19 },
  homeRailsWrap: { position: "relative", zIndex: 3, marginTop: -76, paddingTop: 0 },
  homeRailsWrapCompact: { marginTop: -48 },
  noResults: { minHeight: 230, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, paddingVertical: 42 },
  noResultsTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 20, fontWeight: "700", textAlign: "center" },
  noResultsText: { marginTop: 8, color: COLORS.muted, fontFamily: "Arial", fontSize: 12, textAlign: "center" },
  clearButton: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 3, backgroundColor: COLORS.white },
  clearButtonText: { color: COLORS.black, fontFamily: "Arial", fontSize: 10, fontWeight: "800" },
});
