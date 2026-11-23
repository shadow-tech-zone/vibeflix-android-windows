import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Brand from "./Brand.jsx";
import { COLORS } from "../theme.js";

export default function SignInPage({ compact, onBack, onBrowse, onGetStarted }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    setEmail("");
    setPassword("");
    setMessage("Sign-in is not connected. Nothing was sent or saved—use Browse Demo to continue.");
  };

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Image
        accessibilityLabel="Original VibeFlix background artwork"
        resizeMode="cover"
        source={{ uri: "/art/spotlight-night.svg" }}
        style={styles.backgroundArt}
      />
      <View pointerEvents="none" style={styles.scrim} />
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Pressable accessibilityLabel="Back to VibeFlix welcome" accessibilityRole="button" onPress={onBack}>
          <Brand />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onBrowse} style={styles.browseButton}>
          <Text style={styles.browseButtonText}>Browse Demo</Text>
        </Pressable>
      </View>
      <View style={[styles.cardWrap, compact && styles.cardWrapCompact]}>
        <View style={[styles.card, compact && styles.cardCompact]}>
          <Text accessibilityRole="header" style={styles.title}>Sign In</Text>
          <Text style={styles.safetyNote}>
            Visual demo only. Don’t enter a password you use elsewhere; no account service is connected.
          </Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            onChangeText={setEmail}
            onSubmitEditing={handleSubmit}
            placeholder="Email or phone number"
            placeholderTextColor="#8c8c8c"
            returnKeyType="next"
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel="Password"
            autoComplete="off"
            onChangeText={setPassword}
            onSubmitEditing={handleSubmit}
            placeholder="Password"
            placeholderTextColor="#8c8c8c"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <Pressable accessibilityRole="button" onPress={handleSubmit} style={styles.submitButton}>
            <Text style={styles.submitText}>Sign In</Text>
          </Pressable>
          {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
          <View style={styles.helpRow}>
            <Text style={styles.helpText}>New to VibeFlix?</Text>
            <Pressable accessibilityRole="button" onPress={onGetStarted}>
              <Text style={styles.linkText}>Get started</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={onBrowse} style={styles.guestButton}>
            <Text style={styles.guestButtonText}>Continue as a guest</Text>
          </Pressable>
          <Text style={styles.footnote}>
            VibeFlix is a fictional-catalog interface prototype. Account creation, billing, and streaming are not connected.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, minHeight: "100vh", justifyContent: "center", backgroundColor: "#080808" },
  backgroundArt: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.32 },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.57)" },
  header: { position: "absolute", zIndex: 2, top: 0, left: 0, right: 0, minHeight: 76, paddingHorizontal: "4.3%", paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCompact: { paddingHorizontal: 20, minHeight: 65 },
  browseButton: { minHeight: 34, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", borderRadius: 3, backgroundColor: "rgba(20,20,20,0.68)" },
  browseButtonText: { color: COLORS.white, fontFamily: "Arial", fontSize: 10, fontWeight: "700" },
  cardWrap: { zIndex: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingTop: 83, paddingBottom: 40 },
  cardWrapCompact: { paddingTop: 85, paddingHorizontal: 16 },
  card: { width: 430, maxWidth: "100%", paddingHorizontal: 48, paddingTop: 42, paddingBottom: 38, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.82)" },
  cardCompact: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28 },
  title: { marginBottom: 11, color: COLORS.white, fontFamily: "Arial", fontSize: 31, fontWeight: "800" },
  safetyNote: { marginBottom: 18, color: "#b3b3b3", fontFamily: "Arial", fontSize: 10, lineHeight: 16 },
  input: { minHeight: 48, marginBottom: 13, paddingHorizontal: 12, borderRadius: 3, color: COLORS.white, backgroundColor: "#333333", fontFamily: "Arial", fontSize: 12, outlineStyle: "none" },
  submitButton: { minHeight: 45, alignItems: "center", justifyContent: "center", marginTop: 6, borderRadius: 3, backgroundColor: COLORS.red },
  submitText: { color: COLORS.white, fontFamily: "Arial", fontSize: 12, fontWeight: "800" },
  message: { marginTop: 12, color: "#f2c46d", fontFamily: "Arial", fontSize: 10, lineHeight: 15 },
  helpRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 27 },
  helpText: { color: "#8c8c8c", fontFamily: "Arial", fontSize: 11 },
  linkText: { color: COLORS.white, fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
  guestButton: { minHeight: 38, alignItems: "center", justifyContent: "center", marginTop: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", borderRadius: 3 },
  guestButtonText: { color: "#e5e5e5", fontFamily: "Arial", fontSize: 10, fontWeight: "700" },
  footnote: { marginTop: 18, color: "#737373", fontFamily: "Arial", fontSize: 8, lineHeight: 13 },
});
