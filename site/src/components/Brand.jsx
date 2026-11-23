import React from "react";
import { Text, View } from "react-native";
import { COLORS } from "../theme.js";

export default function Brand({ compact = false }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: compact ? 6 : 8 }}>
      <View
        style={{
          width: compact ? 25 : 29,
          height: compact ? 25 : 29,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 3,
          backgroundColor: COLORS.red,
        }}
      >
        <Text style={{ color: COLORS.white, fontFamily: "Arial", fontSize: compact ? 17 : 20, fontWeight: "900" }}>V</Text>
      </View>
      <Text
        style={{
          color: COLORS.red,
          fontFamily: "Arial",
          fontSize: compact ? 14 : 17,
          fontWeight: "900",
          letterSpacing: compact ? 1.2 : 1.7,
        }}
      >
        VIBEFLIX
      </Text>
    </View>
  );
}
