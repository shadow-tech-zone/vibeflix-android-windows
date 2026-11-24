import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, PAGE_GUTTER } from "../theme.js";

const FILTERS = [
  { key: "category", label: "Category", options: [["", "All"], ["latest", "Latest"]] },
  { key: "industry", label: "Industry", options: [["", "All"], ["hollywood", "Hollywood"], ["bollywood", "Bollywood"], ["kollywood", "Kollywood"]] },
  { key: "language", label: "Language", options: [["", "All"], ["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"]] },
  { key: "genre", label: "Genre", options: [["", "All"], ["drama", "Drama"], ["action", "Action"], ["thriller", "Thriller"], ["crime", "Crime"]] },
];

export default function Play4uFilterBar({ filters, onChange, onApply, onClear, loading, compact }) {
  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.heading}>Play4u public catalog</Text>
          <Text style={styles.helper}>Search from the top bar, choose filters, then apply.</Text>
        </View>
        <Text style={styles.scope}>METADATA ONLY</Text>
      </View>
      <View style={styles.filters}>
        {FILTERS.map((filter) => (
          <View key={filter.key} style={styles.filterRow}>
            <Text style={styles.filterLabel}>{filter.label}</Text>
            <ScrollView style={styles.filterScroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {filter.options.map(([value, label]) => {
                const selected = (filters[filter.key] ?? "") === value;
                return (
                  <Pressable
                    key={`${filter.key}-${value || "all"}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onChange(filter.key, value)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onApply}
          disabled={loading}
          style={({ pressed }) => [styles.applyButton, loading && styles.buttonDisabled, pressed && !loading && styles.buttonPressed]}
        >
          <Text style={styles.applyText}>{loading ? "Loading…" : "Apply Filters"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onClear}
          disabled={loading}
          style={({ pressed }) => [styles.clearButton, loading && styles.buttonDisabled, pressed && !loading && styles.buttonPressed]}
        >
          <Text style={styles.clearText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: PAGE_GUTTER, marginTop: 2, marginBottom: 20, padding: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 5, backgroundColor: "rgba(26,26,26,0.94)" },
  panelCompact: { marginHorizontal: 20, padding: 13, marginBottom: 17 },
  headingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  headingCopy: { flex: 1, minWidth: 0 },
  heading: { color: COLORS.white, fontFamily: "Arial", fontSize: 13, fontWeight: "800" },
  helper: { marginTop: 4, color: "#969696", fontFamily: "Arial", fontSize: 9, lineHeight: 14 },
  scope: { marginTop: 1, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 2, backgroundColor: "rgba(229,9,20,0.18)", color: "#f2a5a9", fontFamily: "Arial", fontSize: 7, fontWeight: "800", letterSpacing: 0.8 },
  filters: { gap: 8 },
  filterRow: { flexDirection: "row", alignItems: "center", minHeight: 32, gap: 10 },
  filterLabel: { width: 57, color: "#9c9c9c", fontFamily: "Arial", fontSize: 9, fontWeight: "700" },
  filterScroller: { flex: 1, minWidth: 0 },
  chips: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2, paddingRight: 4 },
  chip: { minHeight: 25, justifyContent: "center", paddingHorizontal: 9, borderWidth: 1, borderColor: "#444", borderRadius: 14, backgroundColor: "#222" },
  chipSelected: { borderColor: COLORS.red, backgroundColor: COLORS.red },
  chipText: { color: "#ccc", fontFamily: "Arial", fontSize: 8, fontWeight: "700" },
  chipTextSelected: { color: COLORS.white },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  applyButton: { minHeight: 33, justifyContent: "center", paddingHorizontal: 13, borderRadius: 3, backgroundColor: COLORS.red },
  applyText: { color: COLORS.white, fontFamily: "Arial", fontSize: 9, fontWeight: "800" },
  clearButton: { minHeight: 33, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: "#555", borderRadius: 3, backgroundColor: "#252525" },
  clearText: { color: "#ddd", fontFamily: "Arial", fontSize: 9, fontWeight: "700" },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.75 },
});
