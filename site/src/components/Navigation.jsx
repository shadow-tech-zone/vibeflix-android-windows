import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Brand from "./Brand.jsx";
import { COLORS } from "../theme.js";

const TABS = ["Home", "TV Shows", "Movies", "New & Popular", "My List"];
const PROFILES = ["Sam", "Kids"];

export default function Navigation({
  activeTab,
  compact,
  scrolled,
  onTabChange,
  profile,
  onProfileChange,
  searchOpen,
  onSearchToggle,
  query,
  onQueryChange,
  onQuerySubmit,
}) {
  const { width } = useWindowDimensions();
  const navCompact = compact || width < 1040;
  const navNarrow = width < 390;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (searchOpen) {
      setMobileMenuOpen(false);
      setProfileMenuOpen(false);
    }
  }, [searchOpen]);

  const selectTab = (tab) => {
    setMobileMenuOpen(false);
    onTabChange(tab);
  };

  const selectProfile = (name) => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    onProfileChange(name);
  };

  return (
    <View
      nativeID="vibeflix-navigation"
      style={[
        styles.header,
        navCompact && styles.headerCompact,
        navNarrow && styles.headerNarrow,
        scrolled && styles.headerScrolled,
      ]}
    >
      <View style={styles.headerLeft}>
        <Brand compact={navCompact} />
        {!navCompact && (
          <View style={styles.navItems}>
            {TABS.map((tab) => {
              const selected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectTab(tab)}
                  style={({ hovered, pressed }) => [
                    styles.navPressable,
                    hovered && styles.navPressableHovered,
                    selected && styles.navPressableActive,
                    pressed && styles.navPressablePressed,
                  ]}
                >
                  <Text style={[styles.navText, selected && styles.navTextActive]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View
        style={[
          styles.headerRight,
          navCompact && styles.headerRightCompact,
          navNarrow && styles.headerRightNarrow,
        ]}
      >
        {searchOpen && (
          <View style={[styles.searchBox, navCompact && styles.searchBoxCompact]}>
            <Text style={styles.searchGlyph}>⌕</Text>
            <TextInput
              accessibilityLabel="Search titles and genres"
              autoCapitalize="none"
              autoFocus={searchOpen}
              autoCorrect={false}
              maxLength={120}
              onChangeText={onQueryChange}
              onSubmitEditing={onQuerySubmit}
              placeholder="Titles, people, genres"
              placeholderTextColor="#b3b3b3"
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                onPress={() => onQueryChange("")}
                style={styles.clearSearch}
              >
                <Text style={styles.clearSearchText}>×</Text>
              </Pressable>
            )}
          </View>
        )}
        <Pressable
          accessibilityLabel={searchOpen ? "Close search" : "Search"}
          accessibilityRole="button"
          onPress={() => {
            setProfileMenuOpen(false);
            onSearchToggle();
          }}
          style={[styles.iconButton, navCompact && styles.iconButtonCompact]}
        >
          <Text style={styles.searchIcon}>{searchOpen ? "×" : "⌕"}</Text>
        </Pressable>

        {navCompact ? (
          !searchOpen && (
            <>
              <Pressable
                accessibilityLabel="Open My List"
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab === "My List" }}
                onPress={() => selectTab("My List")}
                style={[
                  styles.quickListButton,
                  navNarrow && styles.quickListButtonNarrow,
                  activeTab === "My List" && styles.quickListButtonActive,
                ]}
              >
                <Text style={styles.quickListText}>MY LIST</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={mobileMenuOpen ? "Close browse menu" : "Open browse menu"}
                accessibilityRole="button"
                accessibilityState={{ expanded: mobileMenuOpen }}
                onPress={() => setMobileMenuOpen((open) => !open)}
                style={[styles.browseButton, navNarrow && styles.browseButtonNarrow]}
              >
                <Text style={styles.browseText}>{mobileMenuOpen ? "CLOSE" : "BROWSE"}</Text>
              </Pressable>
            </>
          )
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => selectProfile(profile === "Kids" ? "Sam" : "Kids")}
            style={styles.kidsLink}
          >
            <Text style={styles.kidsLinkText}>{profile === "Kids" ? "KIDS MODE" : "KIDS"}</Text>
          </Pressable>
        )}

        {(!navCompact || !searchOpen) && (
          <View style={styles.profileWrap}>
            <Pressable
              accessibilityLabel={`Profile: ${profile}`}
              accessibilityRole="button"
              onPress={() => {
                setMobileMenuOpen(false);
                setProfileMenuOpen((open) => !open);
              }}
              style={styles.avatarButton}
            >
              <Text style={styles.avatarText}>{profile === "Kids" ? "K" : "S"}</Text>
              <Text style={styles.avatarChevron}>{profileMenuOpen ? "⌃" : "⌄"}</Text>
            </Pressable>
            {profileMenuOpen && (
              <View style={styles.profileMenu}>
                {PROFILES.map((name) => (
                  <Pressable
                    key={name}
                    accessibilityLabel={`Switch to ${name} profile`}
                    accessibilityRole="button"
                    onPress={() => selectProfile(name)}
                    style={styles.profileMenuItem}
                  >
                    <View style={[styles.profileDot, name === "Kids" && styles.kidsDot]}>
                      <Text style={styles.profileDotText}>{name === "Kids" ? "K" : "S"}</Text>
                    </View>
                    <Text style={styles.profileMenuText}>{name}</Text>
                    {profile === name && <Text style={styles.profileCheck}>✓</Text>}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {navCompact && mobileMenuOpen && !searchOpen && (
        <View style={styles.mobileMenu}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === tab }}
              onPress={() => selectTab(tab)}
              style={[styles.mobileMenuItem, activeTab === tab && styles.mobileMenuItemActive]}
            >
              <Text style={[styles.mobileMenuItemText, activeTab === tab && styles.navTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
          <View style={styles.menuDivider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => selectProfile(profile === "Kids" ? "Sam" : "Kids")}
            style={styles.mobileMenuItem}
          >
            <Text style={styles.mobileMenuItemText}>{profile === "Kids" ? "Switch to Sam" : "Kids"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "fixed",
    zIndex: 20,
    top: 0,
    left: 0,
    right: 0,
    minHeight: 70,
    paddingHorizontal: "4.3%",
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(20,20,20,0.56)",
  },
  headerScrolled: {
    backgroundColor: "rgba(20,20,20,0.97)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerCompact: { minHeight: 61, paddingHorizontal: 17, paddingVertical: 10 },
  headerNarrow: { paddingHorizontal: 12 },
  headerLeft: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 35, flex: 1 },
  navItems: { flexDirection: "row", alignItems: "center", gap: 3 },
  navPressable: { minHeight: 33, justifyContent: "center", paddingHorizontal: 10, borderRadius: 18 },
  navPressableActive: { backgroundColor: "rgba(255,255,255,0.13)" },
  navPressableHovered: { backgroundColor: "rgba(255,255,255,0.09)" },
  navPressablePressed: { opacity: 0.72 },
  navText: { color: "#e5e5e5", fontFamily: "Arial", fontSize: 12, fontWeight: "500" },
  navTextActive: { color: COLORS.white, fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 17 },
  headerRightCompact: { gap: 7 },
  headerRightNarrow: { gap: 4 },
  iconButton: { width: 34, height: 36, alignItems: "center", justifyContent: "center" },
  iconButtonCompact: { width: 27 },
  searchIcon: { color: COLORS.white, fontFamily: "Arial", fontSize: 27, lineHeight: 31 },
  searchGlyph: { color: COLORS.white, fontFamily: "Arial", fontSize: 21, lineHeight: 24 },
  searchBox: {
    width: 235,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: "#b3b3b3",
    backgroundColor: "rgba(8,8,8,0.94)",
  },
  searchBoxCompact: { width: 119, gap: 4, paddingHorizontal: 6 },
  searchInput: { flex: 1, minWidth: 0, color: COLORS.white, fontFamily: "Arial", fontSize: 11, paddingVertical: 4, outlineStyle: "none" },
  clearSearch: { minWidth: 18, alignItems: "center", justifyContent: "center" },
  clearSearchText: { color: COLORS.white, fontFamily: "Arial", fontSize: 19, lineHeight: 21 },
  kidsLink: { minHeight: 32, justifyContent: "center", paddingHorizontal: 4 },
  kidsLinkText: { color: COLORS.white, fontFamily: "Arial", fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  quickListButton: { minHeight: 31, justifyContent: "center", paddingHorizontal: 8, borderRadius: 16 },
  quickListButtonNarrow: { paddingHorizontal: 4 },
  quickListButtonActive: { backgroundColor: "rgba(255,255,255,0.13)" },
  quickListText: { color: "#e5e5e5", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 0.35 },
  browseButton: { minHeight: 32, justifyContent: "center", paddingHorizontal: 4 },
  browseButtonNarrow: { paddingHorizontal: 2 },
  browseText: { color: COLORS.white, fontFamily: "Arial", fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  profileWrap: { position: "relative" },
  avatarButton: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 2 },
  avatarText: { width: 29, height: 29, paddingTop: 7, overflow: "hidden", borderRadius: 5, color: COLORS.white, backgroundColor: "#714149", fontFamily: "Arial", fontSize: 12, fontWeight: "800", textAlign: "center" },
  avatarChevron: { color: COLORS.white, fontFamily: "Arial", fontSize: 13 },
  profileMenu: { position: "absolute", top: 41, right: 0, zIndex: 30, width: 174, paddingVertical: 7, borderWidth: 1, borderColor: "#444", backgroundColor: "rgba(20,20,20,0.98)" },
  profileMenuItem: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 11 },
  profileDot: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 4, backgroundColor: "#714149" },
  kidsDot: { backgroundColor: "#38526d" },
  profileDotText: { color: COLORS.white, fontFamily: "Arial", fontSize: 10, fontWeight: "700" },
  profileMenuText: { flex: 1, color: COLORS.text, fontFamily: "Arial", fontSize: 11 },
  profileCheck: { color: COLORS.white, fontFamily: "Arial", fontSize: 14 },
  mobileMenu: { position: "absolute", top: 55, right: 17, zIndex: 30, minWidth: 180, paddingVertical: 7, borderWidth: 1, borderColor: "#444", backgroundColor: "rgba(20,20,20,0.98)" },
  mobileMenuItem: { minHeight: 42, justifyContent: "center", paddingHorizontal: 15 },
  mobileMenuItemActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  mobileMenuItemText: { color: COLORS.text, fontFamily: "Arial", fontSize: 12 },
  menuDivider: { height: 1, marginVertical: 5, backgroundColor: "#3a3a3a" },
});
