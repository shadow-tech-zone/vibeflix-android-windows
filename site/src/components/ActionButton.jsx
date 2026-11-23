import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../theme.js";

export default function ActionButton({ children, icon, onPress, tone = "light" }) {
  const quiet = tone === "quiet";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.button,
        quiet ? styles.quietButton : styles.lightButton,
        hovered && (quiet ? styles.quietHover : styles.lightHover),
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Text style={[styles.icon, quiet && styles.quietText]}>{icon}</Text> : null}
      <Text style={[styles.label, quiet && styles.quietText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 19,
    borderRadius: 4,
  },
  lightButton: { backgroundColor: COLORS.white },
  quietButton: { backgroundColor: "rgba(109,109,110,0.76)" },
  lightHover: { backgroundColor: "rgba(255,255,255,0.78)" },
  quietHover: { backgroundColor: "rgba(109,109,110,0.52)" },
  pressed: { opacity: 0.78 },
  icon: { color: COLORS.black, fontFamily: "Arial", fontSize: 14 },
  label: { color: COLORS.black, fontFamily: "Arial", fontSize: 14, fontWeight: "700" },
  quietText: { color: COLORS.white },
});
