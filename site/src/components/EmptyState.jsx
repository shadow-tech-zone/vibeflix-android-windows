import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme.js";

export default function EmptyState({ onBrowse }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your list is empty.</Text>
      <Text style={styles.description}>
        Add titles to My List and they’ll be waiting here when you’re ready.
      </Text>
      <Pressable accessibilityRole="button" onPress={onBrowse} style={styles.button}>
        <Text style={styles.buttonText}>Browse titles</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 260, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },
  title: { color: COLORS.white, fontFamily: "Arial", fontSize: 21, fontWeight: "700", textAlign: "center" },
  description: { maxWidth: 390, marginTop: 10, color: COLORS.muted, fontFamily: "Arial", fontSize: 12, lineHeight: 18, textAlign: "center" },
  button: { marginTop: 20, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 3, backgroundColor: COLORS.white },
  buttonText: { color: COLORS.black, fontFamily: "Arial", fontSize: 11, fontWeight: "800" },
});
