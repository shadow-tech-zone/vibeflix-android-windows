import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, PAGE_GUTTER } from "../theme.js";

const FILTERS = [
  { key: "category", label: "Release", options: [["", "All"], ["latest", "Latest"]] },
  { key: "industry", label: "Region", options: [["", "All"], ["hollywood", "Hollywood"], ["bollywood", "Bollywood"], ["kollywood", "Kollywood"]] },
  { key: "language", label: "Language", options: [["", "All"], ["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"]] },
  { key: "genre", label: "Genre", options: [["", "All"], ["drama", "Drama"], ["action", "Action"], ["thriller", "Thriller"], ["crime", "Crime"]] },
];

export default function Play4uFilterBar({ filters, onChange, onApply, onClear, loading, compact }) {
  const [expanded, setExpanded] = useState(false);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const activeFilterSummary = FILTERS.map((filter) => {
    const value = filters[filter.key] ?? "";
    return filter.options.find(([optionValue]) => optionValue && optionValue === value)?.[1];
  }).filter(Boolean).join(" · ");

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Pressable
        accessibilityLabel={expanded ? "Hide filters" : "Show filters"}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ hovered, pressed }) => [
          styles.toggle,
          expanded && styles.toggleExpanded,
          hovered && styles.toggleHovered,
          pressed && styles.togglePressed,
        ]}
      >
        <Text style={styles.toggleTitle}>Filters</Text>
        {activeFilterCount > 0 && (
          <Text numberOfLines={1} style={[styles.activeCount, compact && styles.activeCountCompact]}>
            {activeFilterCount} active · {activeFilterSummary}
          </Text>
        )}
        <Text style={styles.chevron}>{expanded ? "⌃" : "⌄"}</Text>
      </Pressable>

      {expanded && (
        <View style={[styles.panel, compact && styles.panelCompact]}>
          <Text style={styles.helper}>Refine your picks by release, region, language, or genre.</Text>
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
                        accessibilityLabel={`${filter.label}: ${label}`}
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
              <Text style={styles.applyText}>{loading ? "Loading…" : "Apply"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClear}
              disabled={loading}
              style={({ pressed }) => [styles.clearButton, loading && styles.buttonDisabled, pressed && !loading && styles.buttonPressed]}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: PAGE_GUTTER, marginTop: 5, marginBottom: 10 },
  containerCompact: { marginHorizontal: 20, marginBottom: 7 },
  toggle: { minHeight: 35, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: "#464646", borderRadius: 4, backgroundColor: "rgba(20,20,20,0.92)" },
  toggleExpanded: { borderBottomColor: "#333" },
  toggleHovered: { borderColor: "#777", backgroundColor: "#222" },
  togglePressed: { opacity: 0.78 },
  toggleTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  activeCount: { maxWidth: 290, marginLeft: 2, color: "#aaa", fontFamily: "Arial", fontSize: 9 },
  activeCountCompact: { maxWidth: 145 },
  chevron: { marginLeft: 2, color: "#ccc", fontFamily: "Arial", fontSize: 14, lineHeight: 18 },
  panel: { marginTop: 8, padding: 14, borderWidth: 1, borderColor: "#303030", borderRadius: 4, backgroundColor: "rgba(24,24,24,0.97)" },
  panelCompact: { padding: 11 },
  helper: { marginBottom: 9, color: "#969696", fontFamily: "Arial", fontSize: 9, lineHeight: 14 },
  filters: { gap: 7 },
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
