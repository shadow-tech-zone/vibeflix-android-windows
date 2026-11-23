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
  return (
    <Pressable
      accessibilityLabel={`${item.title}, ${item.type}, ${item.match}`}
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => onSelect(item)}
      style={({ hovered: platformHovered, pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        (hovered || platformHovered) && styles.cardHover,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.imageWrap, compact && styles.imageWrapCompact]}>
        <Image
          accessibilityLabel={`Original fictional artwork for ${item.title}`}
          resizeMode="cover"
          source={{ uri: item.cardArt }}
          style={styles.image}
        />
        <View pointerEvents="none" style={styles.imageShade} />
        <View style={styles.cardTopLine}>
          <Text style={styles.typeTag}>{item.type.toUpperCase()}</Text>
          <Text style={styles.matchTag}>{item.match}</Text>
        </View>
        {item.progress > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
          </View>
        )}
        {hovered && (
          <View pointerEvents="none" style={styles.hoverCaption}>
            <Text numberOfLines={1} style={styles.hoverTitle}>{item.title}</Text>
            <Text style={styles.hoverMeta}>MORE INFO  ›</Text>
          </View>
        )}
        <View pointerEvents="none" style={styles.playDot}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.cardSubline}>
          {item.progress > 0 ? item.progressLabel : `${item.year}  ·  ${item.genres[0]}`}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MediaRail({ title, items, compact, onSelect }) {
  const railRef = useRef(null);
  if (!items.length) return null;

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
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 30 },
  heading: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: PAGE_GUTTER, marginBottom: 8 },
  headingCompact: { paddingHorizontal: 20, marginBottom: 5 },
  rowTitle: { color: COLORS.text, fontFamily: "Arial", fontSize: 19, fontWeight: "700", letterSpacing: -0.2 },
  rowTitleCompact: { fontSize: 16 },
  exploreButton: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 },
  exploreText: { color: "#b3b3b3", fontFamily: "Arial", fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  exploreArrow: { color: "#b3b3b3", fontFamily: "Arial", fontSize: 17, lineHeight: 20 },
  railContent: { gap: 10, paddingHorizontal: PAGE_GUTTER, paddingTop: 5, paddingBottom: 8 },
  railContentCompact: { gap: 8, paddingHorizontal: 20 },
  card: { width: 232, overflow: "hidden", borderRadius: 4, backgroundColor: COLORS.surface, transform: [{ scale: 1 }], zIndex: 1 },
  cardCompact: { width: 180 },
  cardHover: { transform: [{ scale: 1.045 }], zIndex: 5 },
  cardPressed: { transform: [{ scale: 0.985 }] },
  imageWrap: { position: "relative", width: "100%", height: 132, overflow: "hidden", backgroundColor: "#292929" },
  imageWrapCompact: { height: 103 },
  image: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  imageShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.15)" },
  cardTopLine: { position: "absolute", top: 8, left: 9, right: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeTag: { color: COLORS.white, fontFamily: "Arial", fontSize: 7, fontWeight: "800", letterSpacing: 0.8, textShadowColor: "rgba(0,0,0,0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  matchTag: { color: COLORS.match, fontFamily: "Arial", fontSize: 8, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  progressTrack: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: "rgba(255,255,255,0.48)" },
  progressFill: { height: 3, backgroundColor: COLORS.red },
  hoverCaption: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 52, justifyContent: "flex-end", paddingHorizontal: 10, paddingBottom: 8, backgroundColor: "rgba(0,0,0,0.72)" },
  hoverTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
  hoverMeta: { marginTop: 3, color: "#b3b3b3", fontFamily: "Arial", fontSize: 7, fontWeight: "700", letterSpacing: 0.6 },
  playDot: { position: "absolute", right: 8, bottom: 8, width: 27, height: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.82)", borderRadius: 16, backgroundColor: "rgba(8,8,8,0.6)" },
  playIcon: { marginLeft: 2, color: COLORS.white, fontFamily: "Arial", fontSize: 9 },
  cardCopy: { paddingHorizontal: 9, paddingTop: 8, paddingBottom: 9 },
  cardTitle: { color: "#f5f5f5", fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
  cardSubline: { marginTop: 4, color: "#969696", fontFamily: "Arial", fontSize: 8 },
});
