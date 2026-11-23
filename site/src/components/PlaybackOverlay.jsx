import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme.js";

export default function PlaybackOverlay({ item, onClose }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(item)}>
      {item ? (
        <View style={styles.player}>
          <Image
            accessibilityLabel={`Preview artwork for ${item.title}`}
            resizeMode="cover"
            source={{ uri: item.art }}
            style={styles.art}
          />
          <View pointerEvents="none" style={styles.shade} />
          <Pressable accessibilityLabel="Close preview" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <View style={styles.message}>
            <View style={styles.playCircle}><Text style={styles.playIcon}>▶</Text></View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.messageText}>
              This private UI demo has no licensed video source connected. Playback will be added only when a supported source is configured.
            </Text>
          </View>
          <View style={styles.bottomLine}>
            <View style={styles.timeline}><View style={styles.timelineProgress} /></View>
            <Text style={styles.previewLabel}>PREVIEW · NO STREAM CONNECTED</Text>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, position: "relative", alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#050505" },
  art: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.35 },
  shade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)" },
  closeButton: { position: "absolute", zIndex: 2, top: 25, right: 25, width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "rgba(20,20,20,0.84)" },
  closeText: { color: COLORS.white, fontFamily: "Arial", fontSize: 27, lineHeight: 30 },
  message: { zIndex: 1, alignItems: "center", paddingHorizontal: 24 },
  playCircle: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.78)", borderRadius: 30 },
  playIcon: { marginLeft: 3, color: COLORS.white, fontFamily: "Arial", fontSize: 17 },
  title: { marginTop: 18, color: COLORS.white, fontFamily: "Arial", fontSize: 25, fontWeight: "800", textAlign: "center" },
  messageText: { maxWidth: 410, marginTop: 10, color: "#d2d2d2", fontFamily: "Arial", fontSize: 12, lineHeight: 19, textAlign: "center" },
  bottomLine: { position: "absolute", left: 26, right: 26, bottom: 24, gap: 9 },
  timeline: { height: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  timelineProgress: { width: "18%", height: 3, backgroundColor: COLORS.red },
  previewLabel: { color: "#b3b3b3", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1.1, textAlign: "center" },
});
