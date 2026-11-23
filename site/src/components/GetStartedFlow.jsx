import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Brand from "./Brand.jsx";
import { CATALOG } from "../data/catalog.js";
import { COLORS } from "../theme.js";

const PROFILE_OPTIONS = [
  { id: "Sam", name: "Sam", description: "Full fictional catalog", initial: "S", color: "#714149" },
  { id: "Kids", name: "Kids", description: "Titles rated up to 13+", initial: "K", color: "#38526d" },
];

function StepProgress({ step }) {
  return (
    <View style={styles.progress}>
      {[1, 2, 3].map((number) => (
        <View key={number} style={[styles.progressSegment, number <= step && styles.progressSegmentActive]} />
      ))}
    </View>
  );
}

function DemoArtwork() {
  return (
    <View style={styles.artworkRow}>
      {CATALOG.slice(0, 3).map((item, index) => (
        <View key={item.id} style={[styles.poster, index === 1 && styles.posterRaised]}>
          <Image
            accessibilityLabel={`Original VibeFlix artwork for ${item.title}`}
            resizeMode="cover"
            source={{ uri: item.art }}
            style={styles.posterImage}
          />
          <View style={styles.posterShade} />
          <Text numberOfLines={1} style={styles.posterTitle}>{item.title}</Text>
        </View>
      ))}
    </View>
  );
}

export default function GetStartedFlow({ compact, onBack, onSignIn, onComplete }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState("Sam");

  const moveNext = () => setStep((current) => Math.min(current + 1, 3));
  const moveBack = () => setStep((current) => Math.max(current - 1, 1));

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Pressable accessibilityLabel="Back to VibeFlix welcome" accessibilityRole="button" onPress={onBack}>
          <Brand />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.signInLink}>
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
      </View>

      <View style={[styles.content, compact && styles.contentCompact]}>
        <StepProgress step={step} />
        <Text style={styles.stepLabel}>STEP {step} OF 3</Text>

        {step === 1 && (
          <View style={styles.stepPanel}>
            <DemoArtwork />
            <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
              A few clicks, then you’re exploring.
            </Text>
            <Text style={styles.description}>
              This prototype has original fictional titles, a browser-local My List, and preview-only playback. No membership or account is created.
            </Text>
            <View style={styles.notice}>
              <Text style={styles.noticeMark}>i</Text>
              <Text style={styles.noticeText}>No email, password, payment, or personal details are needed for this demo.</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepPanel}>
            <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
              Choose a profile for this demo.
            </Text>
            <Text style={styles.description}>
              You can switch profiles at any time. The Kids profile only shows sample titles rated up to 13+.
            </Text>
            <View style={[styles.profileOptions, compact && styles.profileOptionsCompact]}>
              {PROFILE_OPTIONS.map((option) => {
                const selected = profile === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setProfile(option.id)}
                    style={[styles.profileOption, compact && styles.profileOptionCompact, selected && styles.profileOptionSelected]}
                  >
                    <View style={[styles.profileAvatar, { backgroundColor: option.color }]}>
                      <Text style={styles.profileInitial}>{option.initial}</Text>
                    </View>
                    <Text style={styles.profileName}>{option.name}</Text>
                    <Text style={styles.profileDescription}>{option.description}</Text>
                    <Text style={[styles.profileCheck, !selected && styles.profileCheckHidden]}>{selected ? "✓" : "○"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepPanel}>
            <View style={styles.readyMark}><Text style={styles.readyCheck}>✓</Text></View>
            <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
              Your VibeFlix demo is ready.
            </Text>
            <Text style={styles.description}>
              Continue as {profile}. This selection lasts for this browsing session; nothing is sent to a service.
            </Text>
            <View style={styles.checkList}>
              {[
                "Browse original fictional titles and genre rails",
                "Save and remove titles from this browser’s My List",
                "Open the preview shell—no video stream is connected",
              ].map((line) => (
                <View key={line} style={styles.checkLine}>
                  <Text style={styles.checkBullet}>✓</Text>
                  <Text style={styles.checkText}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.actions, compact && styles.actionsCompact]}>
          {step > 1 && (
            <Pressable accessibilityRole="button" onPress={moveBack} style={styles.backButton}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          )}
          {step < 3 ? (
            <Pressable accessibilityRole="button" onPress={moveNext} style={styles.nextButton}>
              <Text style={styles.nextText}>Next</Text>
              <Text style={styles.nextArrow}>›</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => onComplete(profile)} style={styles.nextButton}>
              <Text style={styles.nextText}>Start Browsing</Text>
              <Text style={styles.nextArrow}>›</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text style={styles.footerNote}>VIBEFLIX  ·  FRONT-END DEMO ONLY</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, minHeight: "100vh", backgroundColor: "#fff" },
  header: { minHeight: 76, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: "4.3%", borderBottomWidth: 1, borderBottomColor: "#d4d4d4", backgroundColor: COLORS.white },
  headerCompact: { minHeight: 66, paddingHorizontal: 20 },
  signInLink: { minHeight: 38, justifyContent: "center", paddingHorizontal: 9 },
  signInText: { color: "#333", fontFamily: "Arial", fontSize: 12, fontWeight: "800" },
  content: { width: "100%", maxWidth: 500, alignSelf: "center", paddingHorizontal: 28, paddingTop: 44, paddingBottom: 35 },
  contentCompact: { paddingHorizontal: 23, paddingTop: 30 },
  progress: { flexDirection: "row", gap: 4, marginBottom: 19 },
  progressSegment: { flex: 1, height: 3, backgroundColor: "#d5d5d5" },
  progressSegmentActive: { backgroundColor: COLORS.red },
  stepLabel: { color: "#333", fontFamily: "Arial", fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  stepPanel: { alignItems: "center", paddingTop: 19 },
  artworkRow: { width: "100%", height: 144, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 23 },
  poster: { position: "relative", width: 100, height: 112, overflow: "hidden", borderRadius: 3, backgroundColor: "#222", transform: [{ rotate: "-4deg" }] },
  posterRaised: { width: 110, height: 130, transform: [{ rotate: "0deg" }] },
  posterImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  posterShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.42)" },
  posterTitle: { position: "absolute", left: 7, right: 7, bottom: 8, color: COLORS.white, fontFamily: "Arial", fontSize: 8, fontWeight: "700" },
  title: { marginTop: 13, color: "#111", fontFamily: "Arial", fontSize: 29, lineHeight: 35, fontWeight: "800", textAlign: "center", letterSpacing: -0.6 },
  titleCompact: { fontSize: 25, lineHeight: 30 },
  description: { maxWidth: 420, marginTop: 12, color: "#3f3f3f", fontFamily: "Arial", fontSize: 12, lineHeight: 19, textAlign: "center" },
  notice: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, padding: 13, borderWidth: 1, borderColor: "#e2e2e2", borderRadius: 3, backgroundColor: "#fafafa" },
  noticeMark: { width: 20, height: 20, paddingTop: 2, borderRadius: 12, color: COLORS.white, backgroundColor: COLORS.red, fontFamily: "Arial", fontSize: 12, fontWeight: "800", textAlign: "center" },
  noticeText: { flex: 1, color: "#555", fontFamily: "Arial", fontSize: 10, lineHeight: 15 },
  profileOptions: { width: "100%", flexDirection: "row", gap: 12, marginTop: 24 },
  profileOptionsCompact: { flexDirection: "column" },
  profileOption: { flex: 1, minHeight: 156, alignItems: "center", justifyContent: "center", paddingHorizontal: 9, borderWidth: 1, borderColor: "#d3d3d3", borderRadius: 4, backgroundColor: "#fff" },
  profileOptionCompact: { minHeight: 112, flexDirection: "row", justifyContent: "flex-start", gap: 12, paddingHorizontal: 14 },
  profileOptionSelected: { borderWidth: 2, borderColor: COLORS.red, backgroundColor: "#fffafa" },
  profileAvatar: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 5 },
  profileInitial: { color: COLORS.white, fontFamily: "Arial", fontSize: 18, fontWeight: "800" },
  profileName: { marginTop: 10, color: "#111", fontFamily: "Arial", fontSize: 11, fontWeight: "800" },
  profileDescription: { marginTop: 5, color: "#666", fontFamily: "Arial", fontSize: 8, textAlign: "center" },
  profileCheck: { position: "absolute", top: 9, right: 10, color: COLORS.red, fontFamily: "Arial", fontSize: 15, fontWeight: "800" },
  profileCheckHidden: { color: "#b6b6b6" },
  readyMark: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.red, borderRadius: 30 },
  readyCheck: { color: COLORS.red, fontFamily: "Arial", fontSize: 29, fontWeight: "700" },
  checkList: { alignSelf: "stretch", gap: 12, marginTop: 23 },
  checkLine: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  checkBullet: { color: COLORS.red, fontFamily: "Arial", fontSize: 15, fontWeight: "900" },
  checkText: { flex: 1, color: "#363636", fontFamily: "Arial", fontSize: 11, lineHeight: 17 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 27 },
  actionsCompact: { justifyContent: "space-between" },
  backButton: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: "#aaa", borderRadius: 3 },
  backText: { color: "#333", fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
  nextButton: { minWidth: 150, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16, borderRadius: 3, backgroundColor: COLORS.red },
  nextText: { color: COLORS.white, fontFamily: "Arial", fontSize: 12, fontWeight: "800" },
  nextArrow: { marginTop: -1, color: COLORS.white, fontFamily: "Arial", fontSize: 21, lineHeight: 22 },
  footerNote: { alignSelf: "center", marginTop: "auto", paddingTop: 20, paddingBottom: 24, color: "#909090", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1.2, textAlign: "center" },
});
