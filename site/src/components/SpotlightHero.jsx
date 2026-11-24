import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import ActionButton from "./ActionButton.jsx";
import Navigation from "./Navigation.jsx";
import { COLORS } from "../theme.js";

export default function SpotlightHero({ item, compact, navigationProps, onPlay, onMoreInfo }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item.id, item.art]);

  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      {item.isPublicCatalog && item.art && !imageFailed ? (
        <Image
          accessible={false}
          nativeID="spotlight-catalog-backdrop"
          onError={() => setImageFailed(true)}
          resizeMode="cover"
          source={{ uri: item.art }}
          style={styles.catalogBackdrop}
        />
      ) : null}
      {item.art && !imageFailed ? (
        <Image
          accessibilityLabel={item.isPublicCatalog ? `Poster for ${item.title}` : `Illustrated backdrop for ${item.title}`}
          nativeID={item.isPublicCatalog ? "spotlight-catalog-poster" : undefined}
          onError={() => setImageFailed(true)}
          resizeMode={item.isPublicCatalog ? "contain" : "cover"}
          source={{ uri: item.art }}
          style={[
            item.isPublicCatalog ? styles.catalogArtwork : styles.artwork,
            compact && item.isPublicCatalog && styles.catalogArtworkCompact,
          ]}
        />
      ) : item.isPublicCatalog ? (
        <View
          pointerEvents="none"
          style={[styles.catalogArtworkFallback, compact && styles.catalogArtworkFallbackCompact]}
        >
          <Text numberOfLines={3} style={styles.catalogArtworkFallbackText}>{item.title}</Text>
        </View>
      ) : (
        <View pointerEvents="none" style={styles.artworkFallback} />
      )}
      <View pointerEvents="none" nativeID="spotlight-backdrop-shade" style={styles.backdropShade} />
      <View pointerEvents="none" nativeID="spotlight-left-shade" style={styles.leftShade} />
      <View pointerEvents="none" nativeID="spotlight-bottom-shade" style={styles.bottomShade} />
      <Navigation {...navigationProps} compact={compact} />

      <View
        style={[
          styles.content,
          compact && styles.contentCompact,
          compact && item.isPublicCatalog && styles.contentCatalogCompact,
        ]}
      >
        <Text style={styles.kicker}>{item.isPublicCatalog ? "VIBEFLIX SPOTLIGHT" : `VIBEFLIX ${item.type.toUpperCase()}`}</Text>
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
          {item.title}
        </Text>
        <View style={styles.metadata}>
          {item.isPublicCatalog ? (
            [item.type, item.year, item.maturity].filter(Boolean).map((value, index) => (
              <React.Fragment key={`${value}-${index}`}>
                {index > 0 ? <Text style={styles.dot}>•</Text> : null}
                <Text style={styles.metaText}>{value}</Text>
              </React.Fragment>
            ))
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
        {item.synopsis ? (
          <Text style={[styles.synopsis, compact && styles.synopsisCompact]} numberOfLines={4}>
            {item.synopsis}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <ActionButton icon="▶" onPress={() => onPlay(item)}>Play</ActionButton>
          <ActionButton icon="ⓘ" onPress={() => onMoreInfo(item)} tone="quiet">
            More Info
          </ActionButton>
        </View>
      </View>

      {item.maturity && !item.isPublicCatalog ? (
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
    height: "76vh",
    minHeight: 610,
    maxHeight: 790,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
  heroCompact: { height: "74vh", minHeight: 540, maxHeight: 640 },
  artwork: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  artworkFallback: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#292929" },
  catalogBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.85 },
  catalogArtwork: { position: "absolute", top: "9%", right: "8%", width: "34%", height: "80%", borderRadius: 6, backgroundColor: "#252525" },
  catalogArtworkCompact: { top: "7%", right: "5%", width: "38%", height: "46%", borderRadius: 5 },
  catalogArtworkFallback: { position: "absolute", top: "9%", right: "8%", width: "34%", height: "80%", alignItems: "center", justifyContent: "center", padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 6, backgroundColor: "#252525" },
  catalogArtworkFallbackCompact: { top: "7%", right: "5%", width: "38%", height: "46%", padding: 9 },
  catalogArtworkFallbackText: { color: "#999", fontFamily: "Arial", fontSize: 12, fontWeight: "700", textAlign: "center" },
  backdropShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.16)" },
  leftShade: { position: "absolute", top: 0, left: 0, bottom: 0, width: "70%", backgroundColor: "rgba(0,0,0,0.4)" },
  bottomShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 280, backgroundColor: "rgba(20,20,20,0.74)" },
  content: { position: "absolute", zIndex: 2, left: "4.3%", bottom: 112, width: 620, maxWidth: "54%" },
  contentCompact: { left: 20, right: 18, bottom: 54, width: "auto", maxWidth: 470 },
  contentCatalogCompact: { right: "auto", bottom: 44, width: "57%", maxWidth: 470 },
  kicker: { marginBottom: 9, color: "#f5f5f1", fontFamily: "Arial", fontSize: 10, fontWeight: "700", letterSpacing: 1.7, textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  title: { color: COLORS.white, fontFamily: "Arial", fontSize: 62, fontWeight: "900", lineHeight: 68, letterSpacing: -1.9, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 8 },
  titleCompact: { maxWidth: 400, fontSize: 38, lineHeight: 42, letterSpacing: -0.9 },
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
