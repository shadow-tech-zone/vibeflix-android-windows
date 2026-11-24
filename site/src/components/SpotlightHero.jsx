import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import ActionButton from "./ActionButton.jsx";
import Navigation from "./Navigation.jsx";
import { COLORS } from "../theme.js";

export default function SpotlightHero({ item, compact, navigationProps, onPlay, onMoreInfo }) {
  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      {item.art ? (
        <Image
          accessibilityLabel={item.isPublicCatalog ? `Poster for ${item.title}` : `Illustrated backdrop for ${item.title}`}
          resizeMode="cover"
          source={{ uri: item.art }}
          style={styles.artwork}
        />
      ) : (
        <View pointerEvents="none" style={styles.artworkFallback} />
      )}
      <View pointerEvents="none" style={styles.backdropShade} />
      <View pointerEvents="none" style={styles.leftShade} />
      <View pointerEvents="none" style={styles.bottomShade} />
      <Navigation {...navigationProps} compact={compact} />

      <View style={[styles.content, compact && styles.contentCompact]}>
        <Text style={styles.kicker}>{item.isPublicCatalog ? "VIBEFLIX SPOTLIGHT" : `VIBEFLIX ${item.type.toUpperCase()}`}</Text>
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
          {item.title}
        </Text>
        <View style={styles.metadata}>
          {item.isPublicCatalog ? (
            <>
              {item.year ? <Text style={styles.metaText}>{item.year}</Text> : null}
              {item.maturity ? <Text style={styles.metaText}>{item.maturity}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.match}>{item.match}</Text>
              <Text style={styles.metaText}>{item.year}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>{item.maturity}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>{item.length}</Text>
            </>
          )}
        </View>
        <Text style={[styles.synopsis, compact && styles.synopsisCompact]} numberOfLines={4}>
          {item.synopsis}
        </Text>
        <View style={styles.actions}>
          {item.isPublicCatalog ? (
            <ActionButton icon="ⓘ" onPress={() => onMoreInfo(item)} tone="quiet">
              More Info
            </ActionButton>
          ) : (
            <>
              <ActionButton icon="▶" onPress={() => onPlay(item)}>Play</ActionButton>
              <ActionButton icon="ⓘ" onPress={() => onMoreInfo(item)} tone="quiet">
                More Info
              </ActionButton>
            </>
          )}
        </View>
      </View>

      {item.maturity ? (
        <View style={styles.maturityBadge}>
          <Text style={styles.maturityText}>{item.maturity}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: "relative",
    width: "100%",
    height: 670,
    minHeight: 570,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
  heroCompact: { height: 570, minHeight: 530 },
  artwork: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  artworkFallback: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#292929" },
  backdropShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.08)" },
  leftShade: { position: "absolute", top: 0, left: 0, bottom: 0, width: "68%", backgroundColor: "rgba(0,0,0,0.35)" },
  bottomShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 240, backgroundColor: "rgba(20,20,20,0.54)" },
  content: { position: "absolute", zIndex: 2, left: "4.3%", bottom: 105, width: 550, maxWidth: "55%" },
  contentCompact: { left: 20, right: 18, bottom: 62, width: "auto", maxWidth: 470 },
  kicker: { marginBottom: 9, color: "#f5f5f1", fontFamily: "Arial", fontSize: 10, fontWeight: "700", letterSpacing: 1.7, textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  title: { color: COLORS.white, fontFamily: "Arial", fontSize: 58, fontWeight: "900", lineHeight: 64, letterSpacing: -1.7, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 8 },
  titleCompact: { maxWidth: 400, fontSize: 40, lineHeight: 44, letterSpacing: -0.9 },
  metadata: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 13 },
  match: { color: COLORS.match, fontFamily: "Arial", fontSize: 11, fontWeight: "800" },
  metaText: { color: "#e5e5e5", fontFamily: "Arial", fontSize: 11, fontWeight: "500" },
  dot: { color: "#e5e5e5", fontFamily: "Arial", fontSize: 10 },
  synopsis: { maxWidth: 525, marginTop: 12, color: "#f3f3f3", fontFamily: "Arial", fontSize: 14, lineHeight: 21, textShadowColor: "rgba(0,0,0,0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  synopsisCompact: { maxWidth: 430, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 20 },
  maturityBadge: { position: "absolute", right: 0, bottom: 112, minWidth: 55, minHeight: 39, justifyContent: "center", paddingHorizontal: 12, borderLeftWidth: 3, borderLeftColor: COLORS.white, backgroundColor: "rgba(51,51,51,0.72)" },
  maturityText: { color: COLORS.white, fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
});
