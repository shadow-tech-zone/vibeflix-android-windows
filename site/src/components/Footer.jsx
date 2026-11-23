import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Brand from "./Brand.jsx";
import { COLORS, PAGE_GUTTER } from "../theme.js";

const SOURCE_URL = "https://github.com/shadow-tech-zone/vibeflix-android-windows";

function openSource() {
  if (typeof window !== "undefined") window.open(SOURCE_URL, "_blank", "noopener,noreferrer");
}

export default function Footer({ onOpenWelcome }) {
  return (
    <View style={styles.footer}>
      <View style={styles.topLine}>
        <Brand compact />
        <Text style={styles.privateLabel}>PRIVATE PERSONAL PROJECT</Text>
      </View>
      <Text style={styles.disclaimer}>
        VibeFlix is an independent UI experiment and is not affiliated with Netflix or any content provider. Titles and artwork are fictional and original. No accounts, licensed streams, or provider APIs are connected.
      </Text>
      <View style={[styles.bottomLine, styles.bottomLineResponsive]}>
        <Text style={styles.copyright}>© 2026 VIBEFLIX · PERSONAL USE</Text>
        <View style={styles.footerActions}>
          {onOpenWelcome && (
            <Pressable accessibilityRole="button" onPress={onOpenWelcome}>
              <Text style={styles.sourceLink}>ABOUT THIS DEMO</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="link" onPress={openSource}>
            <Text style={styles.sourceLink}>PROJECT SOURCE ↗</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: PAGE_GUTTER, paddingTop: 24, paddingBottom: 28, borderTopWidth: 1, borderTopColor: "#292929" },
  topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  privateLabel: { color: "#898989", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1.1 },
  disclaimer: { maxWidth: 780, marginTop: 16, color: "#7f7f7f", fontFamily: "Arial", fontSize: 9, lineHeight: 15 },
  bottomLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 },
  bottomLineResponsive: { flexWrap: "wrap", gap: 12 },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  copyright: { color: "#6f6f6f", fontFamily: "Arial", fontSize: 8, letterSpacing: 0.5 },
  sourceLink: { color: "#b0b0b0", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 0.8 },
});
