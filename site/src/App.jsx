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
import Play4uFilterBar from "./components/Play4uFilterBar.jsx";
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

function CatalogFeedback({ title, message, actionLabel, onAction, compact }) {
  return (
    <View style={[styles.catalogFeedback, compact && styles.catalogFeedbackCompact]}>
      <Text accessibilityRole="header" style={styles.catalogFeedbackTitle}>{title}</Text>
      <Text style={styles.catalogFeedbackText}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.catalogFeedbackButton}>
          <Text style={styles.catalogFeedbackButtonText}>{actionLabel}</Text>
        </Pressable>
      )}
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

const DEFAULT_PLAY4U_FILTERS = { category: "", industry: "", language: "", genre: "" };

function publicImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, "https://play4u.org");
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function toPlay4uItem(item) {
  const kind = item.kind === "series" ? "series" : "movie";
  const type = kind === "series" ? "Series" : "Film";
  const poster = publicImageUrl(item.poster || item.lazyPoster);
  const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled";
  const year = typeof item.year === "string" || typeof item.year === "number" ? String(item.year) : "";
  const rating = typeof item.rating === "string" && item.rating.trim() && item.rating !== "Unrated" ? item.rating.trim() : "";
  const cardText = typeof item.cardText === "string" ? item.cardText.trim() : "";
  const synopsis = cardText
    .replace(/\b(?:TV-[A-Z0-9]+|NC\s?16|UA\s?\d{1,2}\+?|PG-13|PG|NR|R|G)\b/gi, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    id: item.id,
    kind,
    type,
    title,
    year,
    maturity: rating,
    age: 18,
    length: "",
    genres: [],
    art: poster,
    cardArt: poster,
    progress: 0,
    progressLabel: "",
    match: "",
    synopsis,
    isPublicCatalog: true,
  };
}

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const pageScrollRef = useRef(null);
  const initialCatalogRef = useRef(null);
  if (initialCatalogRef.current === null) {
    initialCatalogRef.current = typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("catalog") || "";
  }
  const startAtWelcome = initialCatalogRef.current === "welcome";
  const startInLocalDemo = initialCatalogRef.current === "demo";
  const startInPlay4u = !startAtWelcome && !startInLocalDemo;
  const [screen, setScreen] = useState(startAtWelcome ? "welcome" : "browse");
  const [play4uMode, setPlay4uMode] = useState(startInPlay4u);
  const [activeTab, setActiveTab] = useState("Home");
  const [profile, setProfile] = useState("Sam");
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [play4uSearchText, setPlay4uSearchText] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [playingItem, setPlayingItem] = useState(null);
  const [play4uItems, setPlay4uItems] = useState([]);
  const [play4uPage, setPlay4uPage] = useState(1);
  const [play4uFilters, setPlay4uFilters] = useState(DEFAULT_PLAY4U_FILTERS);
  const [play4uHasMore, setPlay4uHasMore] = useState(false);
  const [play4uLoaded, setPlay4uLoaded] = useState(false);
  const [play4uLoading, setPlay4uLoading] = useState(false);
  const [play4uError, setPlay4uError] = useState("");
  const play4uRequestRef = useRef(0);
  const titleRequestRef = useRef(0);
  const { savedSet, toggleSaved } = useMyList();

  const scrollPageToTop = () => {
    const pageScroll = pageScrollRef.current;
    const node = pageScroll?.getScrollableNode?.() ?? pageScroll;
    if (node?.scrollTop > 0) pageScroll.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        titleRequestRef.current += 1;
        setSelectedItem(null);
        setPlayingItem(null);
        setSearchOpen(false);
        if (!play4uMode) setQuery("");
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        scrollPageToTop();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, play4uMode]);

  const loadPlay4u = async (page = 1, searchText = query, filters = play4uFilters) => {
    const requestId = ++play4uRequestRef.current;
    const committedSearch = searchText.trim();
    const params = new URLSearchParams({ operation: "browseTitles", page: String(page) });
    if (committedSearch) params.set("query", committedSearch);
    for (const [name, value] of Object.entries(filters)) if (value) params.set(name, value);

    setPlay4uLoading(true);
    setPlay4uSearchText(committedSearch);
    setPlay4uError("");
    setPlay4uItems([]);
    setPlay4uPage(page);
    setPlay4uHasMore(false);
    try {
      const response = await fetch(`/api/play4u?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      let result;
      try { result = await response.json(); } catch { throw new Error(`The catalog returned an unreadable response (${response.status}).`); }
      if (!response.ok || !result?.ok) throw new Error(result?.reason || result?.error || `Catalog request failed (${response.status}).`);
      if (requestId !== play4uRequestRef.current) return;
      const items = Array.isArray(result.data)
        ? result.data.filter((item) => item && typeof item === "object" && typeof item.id === "string" && /^tt[0-9]+$/.test(item.id))
        : [];
      setPlay4uItems(items.map(toPlay4uItem));
      setPlay4uHasMore(items.length >= 30 && page < 100);
    } catch (error) {
      if (requestId !== play4uRequestRef.current) return;
      setPlay4uError(error instanceof Error ? error.message : "Could not load the catalog.");
    } finally {
      if (requestId === play4uRequestRef.current) {
        setPlay4uLoading(false);
        setPlay4uLoaded(true);
      }
    }
  };

  useEffect(() => {
    if (play4uMode) loadPlay4u(1, "", play4uFilters);
  }, [play4uMode]);

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

  const isLocalHome = !play4uMode && activeTab === "Home" && query.trim().length === 0;
  const isPlay4uHome = play4uMode
    && activeTab === "Home"
    && !play4uSearchText
    && play4uItems.length > 0;
  const isHome = isLocalHome || isPlay4uHome;
  const featuredItem = isPlay4uHome
    ? play4uItems[0]
    : profileCatalog.find((item) => item.id === FEATURED_TITLE_ID) || profileCatalog[0];

  const rows = useMemo(() => {
    if (play4uMode && activeTab !== "My List") {
      const items = activeTab === "Movies"
        ? play4uItems.filter((item) => item.kind === "movie")
        : activeTab === "TV Shows"
          ? play4uItems.filter((item) => item.kind === "series")
          : play4uItems;
      if (play4uSearchText) {
        return [{ id: "catalog-search-results", title: `Search results for “${play4uSearchText}”`, items }];
      }
      if (activeTab === "Movies") return [{ id: "catalog-movies", title: "Movies", items }];
      if (activeTab === "TV Shows") return [{ id: "catalog-series", title: "TV Shows", items }];
      if (activeTab === "New & Popular") return [{ id: "catalog-new-popular", title: "New & Popular", items }];

      const results = [{ id: "catalog-all", title: "Explore All Titles", items: play4uItems }];
      if (play4uItems.length) {
        const movies = play4uItems.filter((item) => item.kind === "movie");
        const series = play4uItems.filter((item) => item.kind === "series");
        if (movies.length) results.push({ id: "catalog-movies", title: "Explore Movies", items: movies });
        if (series.length) results.push({ id: "catalog-series", title: "Explore TV Shows", items: series });
      }
      return results;
    }
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
  }, [activeTab, play4uMode, profile, profileCatalog, query, visibleItems, play4uItems, play4uSearchText]);
  const hasPlay4uCriteria = Boolean(play4uSearchText || Object.values(play4uFilters).some(Boolean));
  const hasPlay4uVisibleItems = rows.some((row) => row.items.length > 0);
  const play4uCategoryLabel = activeTab === "Movies" ? "movies" : activeTab === "TV Shows" ? "series" : "titles";

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
    const alreadyOnPlay4uView = tab === activeTab && play4uMode;
    const clearRemoteSearch = play4uMode && tab !== activeTab && Boolean(play4uSearchText);
    setActiveTab(tab);
    setSearchOpen(false);
    setQuery("");
    if (alreadyOnPlay4uView || clearRemoteSearch) loadPlay4u(1, "", play4uFilters);
  };

  const handleProfileChange = (name) => {
    scrollPageToTop();
    setProfile(name);
    setActiveTab("Home");
    setSearchOpen(false);
    setQuery("");
    if (play4uMode && play4uSearchText) loadPlay4u(1, "", play4uFilters);
  };

  const handleSearchToggle = () => {
    if (searchOpen) {
      setSearchOpen(false);
      if (!play4uMode) setQuery("");
    } else {
      scrollPageToTop();
      setSearchOpen(true);
    }
  };

  const handleQuerySubmit = () => {
    if (play4uMode && activeTab !== "My List") loadPlay4u(1, query, play4uFilters);
  };

  const handleQueryChange = (value) => {
    setQuery(value);
    if (play4uMode && activeTab !== "My List" && !value.trim() && play4uSearchText) {
      loadPlay4u(1, "", play4uFilters);
    }
  };

  const handlePlay4uFilterChange = (name, value) => {
    setPlay4uFilters((current) => ({ ...current, [name]: value }));
  };

  const handleClearPlay4u = () => {
    setPlay4uFilters(DEFAULT_PLAY4U_FILTERS);
    setQuery("");
    loadPlay4u(1, "", DEFAULT_PLAY4U_FILTERS);
  };

  const handleCloseDetails = () => {
    titleRequestRef.current += 1;
    setSelectedItem(null);
  };

  const handleSelectItem = async (item) => {
    if (!item.isPublicCatalog) {
      setSelectedItem(item);
      return;
    }

    const requestId = ++titleRequestRef.current;
    setSelectedItem({ ...item, detailLoading: true, detailError: "", synopsis: "Loading title details…" });
    const params = new URLSearchParams({ operation: "getTitle", kind: item.kind, id: item.id });
    try {
      const response = await fetch(`/api/play4u?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      let result;
      try { result = await response.json(); } catch { throw new Error(`Title details returned an unreadable response (${response.status}).`); }
      if (!response.ok || !result?.ok) throw new Error(result?.reason || result?.error || `Title details failed (${response.status}).`);
      if (requestId !== titleRequestRef.current) return;
      const detail = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!detail || typeof detail !== "object") throw new Error("No title details were returned.");
      setSelectedItem((current) => current?.id === item.id ? {
        ...current,
        title: detail.title || detail.pageTitle || current.title,
        art: publicImageUrl(detail.poster) || current.art,
        synopsis: detail.description || detail.metaDescription || "No description is available.",
        length: detail.contentType || current.length,
        detailLoading: false,
        detailError: "",
      } : current);
    } catch (error) {
      if (requestId !== titleRequestRef.current) return;
      setSelectedItem((current) => current?.id === item.id ? {
        ...current,
        detailLoading: false,
        detailError: error instanceof Error ? error.message : "Could not load title details.",
        synopsis: "Title details could not be loaded right now.",
      } : current);
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
    onQueryChange: handleQueryChange,
    onQuerySubmit: handleQuerySubmit,
  };

  const pageTitle = play4uMode && activeTab !== "My List"
    ? (play4uSearchText
      ? "Search results"
      : activeTab === "Home"
        ? "Browse"
        : activeTab)
    : query.trim()
      ? "Search"
      : activeTab === "My List"
        ? "My List"
        : activeTab === "Home"
          ? "Browse"
          : activeTab;

  const enterBrowse = (selectedProfile = profile) => {
    setPlay4uMode(true);
    setProfile(selectedProfile);
    setActiveTab("Home");
    setSearchOpen(false);
    setQuery("");
    setScreen("browse");
  };

  const enterDemoBrowse = (selectedProfile = profile) => {
    setPlay4uMode(false);
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
        onComplete={enterDemoBrowse}
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
          onMoreInfo={handleSelectItem}
        />
      ) : (
        <View style={[styles.catalogHeader, compact && styles.catalogHeaderCompact]}>
          <Navigation {...navigationProps} compact={compact} />
          <CatalogHeading title={pageTitle} compact={compact} />
        </View>
      )}

      {play4uMode && activeTab !== "My List" ? (
        <>
          <Play4uFilterBar
            filters={play4uFilters}
            onChange={handlePlay4uFilterChange}
            onApply={() => loadPlay4u(1, query, play4uFilters)}
            onClear={handleClearPlay4u}
            loading={play4uLoading}
            compact={compact}
          />
          <View style={[styles.railsWrap, styles.play4uRailsWrap]}>
            {play4uLoading || !play4uLoaded ? (
              <CatalogFeedback
                title="Loading titles…"
                message="Loading the latest movie and series picks."
                compact={compact}
              />
            ) : play4uError ? (
              <CatalogFeedback
                title="We couldn't load the catalog"
                message={play4uError}
                actionLabel="Try again"
                onAction={() => loadPlay4u(play4uPage, play4uSearchText, play4uFilters)}
                compact={compact}
              />
            ) : hasPlay4uVisibleItems ? (
              rows.map((row) => (
                <MediaRail
                  key={row.id}
                  title={row.title}
                  items={row.items}
                  compact={compact}
                  onSelect={handleSelectItem}
                />
              ))
            ) : (
              <CatalogFeedback
                title={play4uItems.length ? `No ${play4uCategoryLabel} found on this page` : "No titles found"}
                message={hasPlay4uCriteria
                  ? "Try another search or reset one of the filters."
                  : play4uItems.length
                    ? `There are no ${play4uCategoryLabel} to show on this catalog page.`
                    : "There are no titles to show on this page."}
                actionLabel={hasPlay4uCriteria ? "Reset search and filters" : undefined}
                onAction={hasPlay4uCriteria ? handleClearPlay4u : undefined}
                compact={compact}
              />
            )}
            {!play4uLoading && !play4uError && (play4uPage > 1 || play4uHasMore) && (
              <View style={[styles.pagination, compact && styles.paginationCompact]}>
                <Pressable
                  accessibilityLabel="Previous catalog page"
                  accessibilityRole="button"
                  disabled={play4uLoading || play4uPage <= 1}
                  onPress={() => loadPlay4u(play4uPage - 1, play4uSearchText, play4uFilters)}
                  style={[styles.pageButton, (play4uLoading || play4uPage <= 1) && styles.pageButtonDisabled]}
                >
                  <Text style={styles.pageButtonText}>Previous</Text>
                </Pressable>
                <Text style={styles.pageNumber}>Page {play4uPage}</Text>
                <Pressable
                  accessibilityLabel="Next catalog page"
                  accessibilityRole="button"
                  disabled={play4uLoading || !play4uHasMore}
                  onPress={() => loadPlay4u(play4uPage + 1, play4uSearchText, play4uFilters)}
                  style={[styles.pageButton, (play4uLoading || !play4uHasMore) && styles.pageButtonDisabled]}
                >
                  <Text style={styles.pageButtonText}>Next</Text>
                </Pressable>
              </View>
            )}
          </View>
        </>
      ) : play4uMode && activeTab === "My List" ? (
        <CatalogFeedback
          title="My List is for demo titles"
          message="Titles in this browse view aren't saved to the local demo list."
          actionLabel="Browse titles"
          onAction={() => handleTabChange("Home")}
          compact={compact}
        />
      ) : activeTab === "My List" && visibleItems.length === 0 && !query.trim() ? (
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

      <Footer onOpenWelcome={() => setScreen("welcome")} catalogMode={play4uMode} />
      <TitleDetailsModal
        item={selectedItem}
        saved={selectedItem && !selectedItem.isPublicCatalog ? savedSet.has(selectedItem.id) : false}
        onClose={handleCloseDetails}
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
  play4uRailsWrap: { paddingTop: 6 },
  homeRailsWrap: { position: "relative", zIndex: 3, marginTop: -76, paddingTop: 0 },
  homeRailsWrapCompact: { marginTop: -48 },
  noResults: { minHeight: 230, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, paddingVertical: 42 },
  noResultsTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 20, fontWeight: "700", textAlign: "center" },
  noResultsText: { marginTop: 8, color: COLORS.muted, fontFamily: "Arial", fontSize: 12, textAlign: "center" },
  clearButton: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 3, backgroundColor: COLORS.white },
  clearButtonText: { color: COLORS.black, fontFamily: "Arial", fontSize: 10, fontWeight: "800" },
  catalogFeedback: { minHeight: 205, alignItems: "center", justifyContent: "center", marginHorizontal: PAGE_GUTTER, paddingHorizontal: 24, paddingVertical: 38, borderWidth: 1, borderColor: "#333", borderRadius: 4, backgroundColor: "#181818" },
  catalogFeedbackCompact: { minHeight: 180, marginHorizontal: 20, paddingHorizontal: 20 },
  catalogFeedbackTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 18, fontWeight: "700", textAlign: "center" },
  catalogFeedbackText: { maxWidth: 560, marginTop: 9, color: COLORS.muted, fontFamily: "Arial", fontSize: 11, lineHeight: 17, textAlign: "center" },
  catalogFeedbackButton: { minHeight: 36, justifyContent: "center", marginTop: 17, paddingHorizontal: 15, borderRadius: 3, backgroundColor: COLORS.red },
  catalogFeedbackButtonText: { color: COLORS.white, fontFamily: "Arial", fontSize: 10, fontWeight: "800" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 17, marginTop: 3, marginBottom: 28 },
  paginationCompact: { gap: 11, marginHorizontal: 20 },
  pageButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderColor: "#5b5b5b", borderRadius: 3, backgroundColor: "#232323" },
  pageButtonText: { color: COLORS.white, fontFamily: "Arial", fontSize: 10, fontWeight: "700" },
  pageButtonDisabled: { opacity: 0.4 },
  pageNumber: { minWidth: 48, color: COLORS.muted, fontFamily: "Arial", fontSize: 10, textAlign: "center" },
});
