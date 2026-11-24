import React, { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, PAGE_GUTTER } from "../theme.js";

function MediaCard({ item, compact, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const catalogPoster = Boolean(item.isPublicCatalog);
  const badge = catalogPoster ? item.maturity : item.match;
  return (
    <Pressable
      testID="media-card"
      accessibilityLabel={`${item.title}, ${item.type}`}
      accessibilityHint={catalogPoster ? "Open title information" : "Open title details"}
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => onSelect(item)}
      style={({ hovered: platformHovered, pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        catalogPoster && styles.catalogCard,
        catalogPoster && compact && styles.catalogCardCompact,
        (hovered || platformHovered) && styles.cardHover,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[
        styles.imageWrap,
        compact && styles.imageWrapCompact,
        catalogPoster && styles.catalogImageWrap,
        catalogPoster && compact && styles.catalogImageWrapCompact,
      ]}>
        {item.cardArt && !imageFailed ? (
          <Image
            accessibilityLabel={`Poster for ${item.title}`}
            onError={() => setImageFailed(true)}
            resizeMode="cover"
            source={{ uri: item.cardArt }}
            style={styles.image}
          />
        ) : (
          <View pointerEvents="none" style={styles.posterFallback}>
            <Text numberOfLines={3} style={styles.posterFallbackText}>{item.title}</Text>
          </View>
        )}
        <View pointerEvents="none" style={styles.imageShade} />
        <View style={styles.cardTopLine}>
          <Text style={styles.typeTag}>{item.type.toUpperCase()}</Text>
          {badge ? <Text style={styles.matchTag}>{badge}</Text> : null}
        </View>
        {item.progress > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
          </View>
        )}
        {(hovered || platformHovered) && (
          <View pointerEvents="none" style={styles.hoverCaption}>
            <Text numberOfLines={1} style={styles.hoverTitle}>{item.title}</Text>
            <Text numberOfLines={1} style={styles.hoverInfo}>
              {[item.type, item.year, item.isPublicCatalog ? item.maturity : item.match]
                .filter(Boolean)
                .join("  ·  ")}
            </Text>
            <Text style={styles.hoverMeta}>MORE INFO  ›</Text>
          </View>
        )}
        <View pointerEvents="none" style={[styles.playDot, item.isPublicCatalog && styles.infoDot]}>
          <Text style={[styles.playIcon, item.isPublicCatalog && styles.infoIcon]}>{item.isPublicCatalog ? "i" : "▶"}</Text>
        </View>
      </View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.cardSubline}>
          {item.progress > 0 ? item.progressLabel : [item.year, item.genres[0]].filter(Boolean).join("  ·  ")}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MediaRail({ title, items, compact, onSelect }) {
  const railRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocusedArrow, setHasFocusedArrow] = useState(false);
  const controlsVisible = isHovered || hasFocusedArrow;
  const catalogRail = items.some((item) => item.isPublicCatalog);
  if (!items.length) return null;

  const scrollRail = (direction) => {
    const rail = railRef.current;
    const node = rail?.getScrollableNode?.() ?? rail;
    if (!rail || !node) return;

    const step = Math.max(node.clientWidth * 0.82, 300);
    rail.scrollTo({ x: Math.max(0, node.scrollLeft + direction * step), animated: true });
  };

  return (
    <View style={styles.section}>
      <View style={[styles.heading, compact && styles.headingCompact]}>
        <Text accessibilityRole="header" style={[styles.rowTitle, compact && styles.rowTitleCompact]}>
          {title}
        </Text>
        <Pressable
          accessibilityLabel={`Explore more: ${title}`}
          accessibilityRole="button"
          onPress={() => railRef.current?.scrollToEnd({ animated: true })}
          style={styles.exploreButton}
        >
          <Text style={styles.exploreText}>Explore All</Text>
          <Text style={styles.exploreArrow}>›</Text>
        </Pressable>
      </View>
      <View
        testID="media-rail-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={[
          styles.railContainer,
          compact && styles.railContainerCompact,
          catalogRail && styles.catalogRailContainer,
          catalogRail && compact && styles.catalogRailContainerCompact,
        ]}
      >
        <ScrollView
          ref={railRef}
          contentContainerStyle={[styles.railContent, compact && styles.railContentCompact]}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {items.map((item) => (
            <MediaCard key={item.id} item={item} compact={compact} onSelect={onSelect} />
          ))}
        </ScrollView>
        <View
          testID="media-rail-controls"
          pointerEvents={controlsVisible ? "box-none" : "none"}
          style={[
            styles.railControls,
            controlsVisible && styles.railControlsVisible,
            compact && styles.railControlsCompact,
          ]}
        >
          <Pressable
            accessibilityLabel={`Scroll ${title} left`}
            accessibilityRole="button"
            testID="media-rail-arrow"
            onFocus={() => setHasFocusedArrow(true)}
            onBlur={(event) => {
              const controls = event.currentTarget?.parentElement;
              if (!controls?.contains(event.relatedTarget)) setHasFocusedArrow(false);
            }}
            onPress={() => scrollRail(-1)}
            style={[styles.railControl, styles.railControlLeft]}
          >
            <Text style={styles.railControlText}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Scroll ${title} right`}
            accessibilityRole="button"
            testID="media-rail-arrow"
            onFocus={() => setHasFocusedArrow(true)}
            onBlur={(event) => {
              const controls = event.currentTarget?.parentElement;
              if (!controls?.contains(event.relatedTarget)) setHasFocusedArrow(false);
            }}
            onPress={() => scrollRail(1)}
            style={[styles.railControl, styles.railControlRight]}
          >
            <Text style={styles.railControlText}>›</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 34 },
  heading: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: PAGE_GUTTER, marginBottom: 8 },
  headingCompact: { paddingHorizontal: 20, marginBottom: 5 },
  rowTitle: { color: COLORS.text, fontFamily: "Arial", fontSize: 21, fontWeight: "700", letterSpacing: -0.3 },
  rowTitleCompact: { fontSize: 17 },
  exploreButton: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 },
  exploreText: { color: "#b3b3b3", fontFamily: "Arial", fontSize: 10, fontWeight: "700", letterSpacing: 0.35 },
  exploreArrow: { color: "#b3b3b3", fontFamily: "Arial", fontSize: 17, lineHeight: 20 },
  railContainer: { position: "relative", minHeight: 180 },
  railContainerCompact: { minHeight: 149 },
  catalogRailContainer: { minHeight: 320 },
  catalogRailContainerCompact: { minHeight: 260 },
  railControls: { position: "absolute", zIndex: 6, top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, opacity: 0 },
  railControlsVisible: { opacity: 1 },
  railControlsCompact: { display: "none" },
  railControl: { width: 38, height: 68, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderRadius: 3, backgroundColor: "rgba(20,20,20,0.86)" },
  railControlLeft: { marginLeft: 2 },
  railControlRight: { marginRight: 2 },
  railControlText: { color: COLORS.white, fontFamily: "Arial", fontSize: 34, fontWeight: "400", lineHeight: 40 },
  railContent: { gap: 10, paddingHorizontal: PAGE_GUTTER, paddingTop: 5, paddingBottom: 8 },
  railContentCompact: { gap: 8, paddingHorizontal: 20 },
  card: { width: 232, overflow: "hidden", borderRadius: 6, backgroundColor: COLORS.surface, transform: [{ scale: 1 }], zIndex: 1 },
  cardCompact: { width: 180 },
  catalogCard: { width: 176 },
  catalogCardCompact: { width: 136 },
  cardHover: { transform: [{ scale: 1.065 }], zIndex: 5 },
  cardPressed: { transform: [{ scale: 0.985 }] },
  imageWrap: { position: "relative", width: "100%", height: 132, overflow: "hidden", backgroundColor: "#292929" },
  imageWrapCompact: { height: 103 },
  catalogImageWrap: { height: 264 },
  catalogImageWrapCompact: { height: 204 },
  image: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  posterFallback: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#242424" },
  posterFallbackText: { color: "#8c8c8c", fontFamily: "Arial", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  imageShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.15)" },
  cardTopLine: { position: "absolute", top: 8, left: 9, right: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeTag: { color: COLORS.white, fontFamily: "Arial", fontSize: 7, fontWeight: "800", letterSpacing: 0.8, textShadowColor: "rgba(0,0,0,0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  matchTag: { color: COLORS.match, fontFamily: "Arial", fontSize: 8, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  progressTrack: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: "rgba(255,255,255,0.48)" },
  progressFill: { height: 3, backgroundColor: COLORS.red },
  hoverCaption: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 82, justifyContent: "flex-end", paddingHorizontal: 11, paddingTop: 15, paddingBottom: 10, backgroundColor: "rgba(0,0,0,0.82)" },
  hoverTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
  hoverInfo: { marginTop: 4, color: "#d0d0d0", fontFamily: "Arial", fontSize: 8 },
  hoverMeta: { marginTop: 5, color: "#b3b3b3", fontFamily: "Arial", fontSize: 7, fontWeight: "700", letterSpacing: 0.6 },
  playDot: { position: "absolute", right: 8, bottom: 8, width: 27, height: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.82)", borderRadius: 16, backgroundColor: "rgba(8,8,8,0.6)" },
  infoDot: { borderColor: "rgba(255,255,255,0.82)" },
  playIcon: { marginLeft: 2, color: COLORS.white, fontFamily: "Arial", fontSize: 9 },
  infoIcon: { marginLeft: 0, fontSize: 13, fontWeight: "800" },
  cardCopy: { paddingHorizontal: 9, paddingTop: 8, paddingBottom: 9 },
  cardTitle: { color: "#f5f5f5", fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
  cardSubline: { marginTop: 4, color: "#969696", fontFamily: "Arial", fontSize: 9 },
});
