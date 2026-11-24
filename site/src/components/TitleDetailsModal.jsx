import React from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ActionButton from "./ActionButton.jsx";
import { COLORS } from "../theme.js";

function openPublicTitle(item) {
  const value = item.canonicalUrl || item.detailUrl;
  if (typeof window === "undefined" || !value) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && ["play4u.org", "www.play4u.org"].includes(url.hostname)) {
      window.open(url.href, "_blank", "noopener,noreferrer");
    }
  } catch {
    // Ignore malformed or non-public title URLs.
  }
}

export default function TitleDetailsModal({ item, saved, onClose, onPlay, onToggleSaved }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(item)}>
      {item ? (
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="Close details" onPress={onClose} style={styles.dismiss} />
          <View style={styles.sheet}>
            <View style={styles.artWrap}>
              {item.art ? (
                <Image
                  accessibilityLabel={item.isPublicCatalog ? `Public poster for ${item.title}` : `Original illustration for ${item.title}`}
                  resizeMode="cover"
                  source={{ uri: item.art }}
                  style={styles.art}
                />
              ) : (
                <Text style={styles.artFallback}>{item.isPublicCatalog ? "PLAY4U" : item.title}</Text>
              )}
              <View pointerEvents="none" style={styles.artFade} />
              <Pressable accessibilityLabel="Close details" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
              <Text accessibilityRole="header" style={styles.title}>{item.title}</Text>
              <View style={styles.metadata}>
                <Text style={styles.match}>{item.match}</Text>
                <Text style={styles.metaText}>{item.year}</Text>
                <Text style={styles.metaText}>{item.maturity}</Text>
                <Text style={styles.metaText}>{item.length}</Text>
              </View>
              <Text style={styles.synopsis}>{item.synopsis}</Text>
              {item.isPublicCatalog && (item.detailLoading || item.detailError) && (
                <Text accessibilityRole="status" style={[styles.detailStatus, item.detailError && styles.detailError]}>
                  {item.detailLoading ? "Loading public title details…" : item.detailError}
                </Text>
              )}
              <View style={styles.infoBlock}>
                <Text style={styles.infoLine}><Text style={styles.infoLabel}>Genres: </Text>{item.genres.join(", ")}</Text>
                <Text style={styles.infoLine}><Text style={styles.infoLabel}>Format: </Text>{item.type}</Text>
              </View>
              {item.isPublicCatalog ? (
                <View style={styles.actions}>
                  {(item.canonicalUrl || item.detailUrl) ? (
                    <Pressable accessibilityRole="link" onPress={() => openPublicTitle(item)} style={styles.publicLinkButton}>
                      <Text style={styles.publicLinkText}>Open Play4u title page ↗</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.detailStatus}>No public title-page link is available.</Text>
                  )}
                </View>
              ) : (
                <View style={styles.actions}>
                  <ActionButton icon="▶" onPress={() => onPlay(item)}>Play</ActionButton>
                  <Pressable
                    accessibilityLabel={saved ? "Remove from My List" : "Add to My List"}
                    accessibilityRole="button"
                    onPress={() => onToggleSaved(item.id)}
                    style={styles.listButton}
                  >
                    <Text style={styles.listIcon}>{saved ? "✓" : "+"}</Text>
                    <Text style={styles.listText}>{saved ? "In My List" : "My List"}</Text>
                  </Pressable>
                </View>
              )}
              <Text style={styles.disclaimer}>
                {item.isPublicCatalog
                  ? "Public title metadata · No playback or stream sources accessed"
                  : "Fictional demo title · Original VibeFlix artwork · No stream source connected"}
              </Text>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingVertical: 20, backgroundColor: "rgba(0,0,0,0.78)" },
  dismiss: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { width: "100%", maxWidth: 700, maxHeight: "92%", overflow: "hidden", borderRadius: 7, backgroundColor: "#181818" },
  artWrap: { position: "relative", width: "100%", height: 275, backgroundColor: "#252525" },
  art: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  artFallback: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingTop: 125, color: "#999", backgroundColor: "#252525", fontFamily: "Arial", fontSize: 12, fontWeight: "800", letterSpacing: 1, textAlign: "center" },
  artFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 120, backgroundColor: "rgba(24,24,24,0.72)" },
  closeButton: { position: "absolute", top: 13, right: 13, width: 35, height: 35, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(20,20,20,0.82)" },
  closeText: { color: COLORS.white, fontFamily: "Arial", fontSize: 26, lineHeight: 29 },
  content: { paddingHorizontal: 27, paddingTop: 2, paddingBottom: 26 },
  title: { color: COLORS.white, fontFamily: "Arial", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  metadata: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 11 },
  match: { color: COLORS.match, fontFamily: "Arial", fontSize: 11, fontWeight: "800" },
  metaText: { color: "#d2d2d2", fontFamily: "Arial", fontSize: 10 },
  synopsis: { maxWidth: 590, marginTop: 16, color: "#e5e5e5", fontFamily: "Arial", fontSize: 12, lineHeight: 19 },
  infoBlock: { gap: 5, marginTop: 14 },
  infoLine: { color: "#c9c9c9", fontFamily: "Arial", fontSize: 10, lineHeight: 15 },
  infoLabel: { color: "#8c8c8c" },
  actions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 20 },
  listButton: { minHeight: 43, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 15, borderWidth: 1, borderColor: "#777", borderRadius: 4, backgroundColor: "#232323" },
  listIcon: { color: COLORS.white, fontFamily: "Arial", fontSize: 18, lineHeight: 20 },
  listText: { color: COLORS.white, fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
  detailStatus: { marginTop: 8, color: "#aaa", fontFamily: "Arial", fontSize: 10, lineHeight: 15 },
  detailError: { color: "#f0a1a5" },
  publicLinkButton: { minHeight: 43, justifyContent: "center", paddingHorizontal: 15, borderRadius: 4, backgroundColor: COLORS.red },
  publicLinkText: { color: COLORS.white, fontFamily: "Arial", fontSize: 11, fontWeight: "800" },
  disclaimer: { marginTop: 18, color: "#767676", fontFamily: "Arial", fontSize: 8, lineHeight: 13 },
});
