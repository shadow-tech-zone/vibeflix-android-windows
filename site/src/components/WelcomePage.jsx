import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Brand from "./Brand.jsx";
import Footer from "./Footer.jsx";
import { CATALOG } from "../data/catalog.js";
import { COLORS, PAGE_GUTTER } from "../theme.js";

const FEATURE_SECTIONS = [
  {
    id: "stories",
    eyebrow: "A FICTIONAL CATALOG",
    title: "A new story is always close.",
    copy: "Browse original VibeFlix titles, discover different genres, and open a full title page before you choose what to explore.",
    item: CATALOG.find((title) => title.id === "orbit-house"),
  },
  {
    id: "list",
    eyebrow: "YOUR LIST",
    title: "Keep the good ones together.",
    copy: "Save fictional titles to My List. Your list stays in this browser; there is no account or sync service behind it.",
    item: CATALOG.find((title) => title.id === "blue-hour"),
  },
  {
    id: "profiles",
    eyebrow: "PROFILES",
    title: "A more focused Kids view.",
    copy: "Switch profiles to filter the sample catalog by its maturity labels. It is a local interface demo, not parental-control software.",
    item: CATALOG.find((title) => title.id === "river-of-glass"),
  },
];

const FAQS = [
  {
    question: "What is VibeFlix?",
    answer: "VibeFlix is an independent interface prototype with fictional titles and original artwork. It is not affiliated with Netflix or a streaming provider.",
  },
  {
    question: "Can I stream a movie or show?",
    answer: "No stream source is connected. Play opens a preview-only screen so the interface can be explored without pretending to play licensed video.",
  },
  {
    question: "Do I need an account?",
    answer: "No. Browse opens the catalog directly. The sign-in and setup screens are visual prototypes only; no account service is connected.",
  },
  {
    question: "Where does My List go?",
    answer: "Saved titles are stored in this browser only. They are not synced to an account or another device.",
  },
];

function EntryButton({ children, onPress, tone = "red", compact = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.entryButton, tone === "quiet" && styles.entryButtonQuiet, compact && styles.entryButtonCompact]}
    >
      <Text style={[styles.entryButtonText, tone === "quiet" && styles.entryButtonTextQuiet, compact && styles.entryButtonTextCompact]}>
        {children}
      </Text>
      {tone === "red" && <Text style={styles.entryButtonArrow}>›</Text>}
    </Pressable>
  );
}

function FeatureSection({ feature, index, compact }) {
  const reverse = !compact && index % 2 === 1;
  return (
    <View style={styles.featureSection}>
      <View style={[styles.featureRow, compact && styles.featureRowCompact, reverse && styles.featureRowReverse]}>
        <View style={[styles.featureCopy, compact && styles.featureCopyCompact]}>
          <Text style={styles.featureEyebrow}>{feature.eyebrow}</Text>
          <Text accessibilityRole="header" style={[styles.featureTitle, compact && styles.featureTitleCompact]}>
            {feature.title}
          </Text>
          <Text style={[styles.featureDescription, compact && styles.featureDescriptionCompact]}>
            {feature.copy}
          </Text>
        </View>
        <View style={[styles.featureArtwork, compact && styles.featureArtworkCompact]}>
          <Image
            accessibilityLabel={`Original VibeFlix artwork for ${feature.item.title}`}
            resizeMode="cover"
            source={{ uri: feature.item.art }}
            style={styles.featureImage}
          />
          <View style={styles.artworkShade} />
          <View style={styles.artworkCaption}>
            <Text style={styles.artworkKicker}>VIBEFLIX ORIGINAL</Text>
            <Text style={styles.artworkTitle}>{feature.item.title}</Text>
            <Text style={styles.artworkMeta}>{feature.item.type.toUpperCase()}  ·  {feature.item.match}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function FAQItem({ item, open, onPress }) {
  return (
    <View style={styles.faqItem}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onPress}
        style={styles.faqQuestion}
      >
        <Text style={styles.faqQuestionText}>{item.question}</Text>
        <Text style={styles.faqIcon}>{open ? "×" : "+"}</Text>
      </Pressable>
      {open && <Text style={styles.faqAnswer}>{item.answer}</Text>}
    </View>
  );
}

export default function WelcomePage({ compact, onBrowse, onSignIn, onGetStarted }) {
  const [openFaq, setOpenFaq] = useState(-1);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <Image
          accessibilityLabel="Original illustrated VibeFlix spotlight artwork"
          resizeMode="cover"
          source={{ uri: "/art/spotlight-night.svg" }}
          style={styles.heroImage}
        />
        <View pointerEvents="none" style={styles.heroShade} />
        <View pointerEvents="none" style={styles.heroLeftShade} />
        <View pointerEvents="none" style={styles.heroBottomShade} />
        <View style={[styles.topBar, compact && styles.topBarCompact]}>
          <Brand />
          <View style={styles.topActions}>
            {!compact && (
              <Pressable accessibilityRole="button" onPress={onBrowse} style={styles.browseLink}>
                <Text style={styles.browseLinkText}>BROWSE</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={onSignIn} style={[styles.signInButton, compact && styles.signInButtonCompact]}>
              <Text style={styles.signInButtonText}>Sign In</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
          <Text style={styles.heroKicker}>A VIBEFLIX ORIGINAL EXPERIENCE</Text>
          <Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
            Find your next story.
          </Text>
          <Text style={[styles.heroDescription, compact && styles.heroDescriptionCompact]}>
            Explore a fictional catalog, original artwork, and a watchlist that stays in this browser.
          </Text>
          <View style={styles.heroActions}>
            <EntryButton onPress={onBrowse}>Explore the catalog</EntryButton>
            <EntryButton onPress={onGetStarted} tone="quiet">Get Started</EntryButton>
          </View>
          <Text style={styles.heroDisclaimer}>NO ACCOUNT · NO STREAMING PROVIDER · JUST THE FRONT-END DEMO</Text>
        </View>
        <View style={styles.heroRating}>
          <Text style={styles.heroRatingText}>VIBEFLIX  ·  FICTIONAL STORIES</Text>
        </View>
      </View>

      <View style={styles.featureList}>
        {FEATURE_SECTIONS.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} compact={compact} />
        ))}
      </View>

      <View style={[styles.faqSection, compact && styles.faqSectionCompact]}>
        <Text accessibilityRole="header" style={[styles.faqTitle, compact && styles.faqTitleCompact]}>
          Frequently Asked Questions
        </Text>
        <View style={styles.faqList}>
          {FAQS.map((item, index) => (
            <FAQItem
              key={item.question}
              item={item}
              open={openFaq === index}
              onPress={() => setOpenFaq((current) => current === index ? -1 : index)}
            />
          ))}
        </View>
        <Text style={styles.faqFootnote}>Ready to browse? No account or sign-up is required for the demo.</Text>
        <EntryButton onPress={onBrowse}>Browse VibeFlix</EntryButton>
      </View>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#080808" },
  pageContent: { flexGrow: 1, backgroundColor: "#080808" },
  hero: { position: "relative", width: "100%", height: 690, minHeight: 610, overflow: "hidden", backgroundColor: COLORS.background },
  heroCompact: { height: 610, minHeight: 590 },
  heroImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  heroShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.2)" },
  heroLeftShade: { position: "absolute", top: 0, left: 0, bottom: 0, width: "76%", backgroundColor: "rgba(0,0,0,0.44)" },
  heroBottomShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 260, backgroundColor: "rgba(8,8,8,0.64)" },
  topBar: { position: "absolute", zIndex: 3, top: 0, left: 0, right: 0, minHeight: 78, paddingHorizontal: PAGE_GUTTER, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topBarCompact: { minHeight: 66, paddingHorizontal: 20, paddingVertical: 15 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 23 },
  browseLink: { minHeight: 36, justifyContent: "center", paddingHorizontal: 5 },
  browseLinkText: { color: COLORS.white, fontFamily: "Arial", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  signInButton: { minWidth: 85, minHeight: 34, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderRadius: 3, backgroundColor: COLORS.red },
  signInButtonCompact: { minWidth: 70, minHeight: 31 },
  signInButtonText: { color: COLORS.white, fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
  heroCopy: { position: "absolute", zIndex: 2, left: PAGE_GUTTER, right: 24, bottom: 92, maxWidth: 660 },
  heroCopyCompact: { left: 20, right: 20, bottom: 70 },
  heroKicker: { marginBottom: 13, color: "#e5e5e5", fontFamily: "Arial", fontSize: 9, fontWeight: "800", letterSpacing: 2 },
  heroTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 56, lineHeight: 62, fontWeight: "900", letterSpacing: -1.5, textShadowColor: "rgba(0,0,0,0.65)", textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 8 },
  heroTitleCompact: { maxWidth: 440, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  heroDescription: { maxWidth: 570, marginTop: 13, color: "#f0f0f0", fontFamily: "Arial", fontSize: 14, lineHeight: 21, textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroDescriptionCompact: { maxWidth: 420, fontSize: 12, lineHeight: 18 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 20 },
  entryButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 17, borderRadius: 3, backgroundColor: COLORS.red },
  entryButtonQuiet: { borderWidth: 1, borderColor: "rgba(255,255,255,0.38)", backgroundColor: "rgba(30,30,30,0.76)" },
  entryButtonCompact: { minHeight: 43, paddingHorizontal: 13 },
  entryButtonText: { color: COLORS.white, fontFamily: "Arial", fontSize: 12, fontWeight: "800" },
  entryButtonTextQuiet: { color: COLORS.white },
  entryButtonTextCompact: { fontSize: 10 },
  entryButtonArrow: { marginTop: -1, color: COLORS.white, fontFamily: "Arial", fontSize: 21, lineHeight: 22 },
  heroDisclaimer: { marginTop: 15, color: "rgba(255,255,255,0.66)", fontFamily: "Arial", fontSize: 7, fontWeight: "700", letterSpacing: 1.1 },
  heroRating: { position: "absolute", right: 0, bottom: 104, minHeight: 37, justifyContent: "center", paddingHorizontal: 13, borderLeftWidth: 3, borderLeftColor: COLORS.white, backgroundColor: "rgba(30,30,30,0.72)" },
  heroRatingText: { color: COLORS.white, fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 0.4 },
  featureList: { backgroundColor: "#080808" },
  featureSection: { paddingHorizontal: PAGE_GUTTER, paddingVertical: 66, borderTopWidth: 8, borderTopColor: "#292929" },
  featureRow: { maxWidth: 1120, minHeight: 300, width: "100%", alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 45 },
  featureRowCompact: { minHeight: 0, flexDirection: "column", gap: 26 },
  featureRowReverse: { flexDirection: "row-reverse" },
  featureCopy: { flex: 1, maxWidth: 540 },
  featureCopyCompact: { width: "100%", alignItems: "center", textAlign: "center" },
  featureEyebrow: { marginBottom: 11, color: COLORS.red, fontFamily: "Arial", fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  featureTitle: { color: COLORS.white, fontFamily: "Arial", fontSize: 39, lineHeight: 45, fontWeight: "800", letterSpacing: -0.9 },
  featureTitleCompact: { fontSize: 28, lineHeight: 33, textAlign: "center" },
  featureDescription: { maxWidth: 490, marginTop: 14, color: "#d2d2d2", fontFamily: "Arial", fontSize: 16, lineHeight: 24 },
  featureDescriptionCompact: { fontSize: 12, lineHeight: 19, textAlign: "center" },
  featureArtwork: { position: "relative", width: 450, maxWidth: "48%", height: 245, overflow: "hidden", borderRadius: 4, backgroundColor: "#202020" },
  featureArtworkCompact: { width: "100%", maxWidth: 510, height: 205 },
  featureImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  artworkShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.18)" },
  artworkCaption: { position: "absolute", left: 14, right: 14, bottom: 13 },
  artworkKicker: { color: "#f0f0f0", fontFamily: "Arial", fontSize: 8, fontWeight: "800", letterSpacing: 1.3 },
  artworkTitle: { marginTop: 5, color: COLORS.white, fontFamily: "Arial", fontSize: 20, fontWeight: "800" },
  artworkMeta: { marginTop: 4, color: "#c5c5c5", fontFamily: "Arial", fontSize: 8, fontWeight: "700" },
  faqSection: { alignItems: "center", paddingHorizontal: PAGE_GUTTER, paddingTop: 70, paddingBottom: 74, borderTopWidth: 8, borderTopColor: "#292929", backgroundColor: "#080808" },
  faqSectionCompact: { paddingHorizontal: 18, paddingTop: 52, paddingBottom: 58 },
  faqTitle: { marginBottom: 30, color: COLORS.white, fontFamily: "Arial", fontSize: 39, fontWeight: "800", textAlign: "center", letterSpacing: -0.8 },
  faqTitleCompact: { marginBottom: 20, fontSize: 27 },
  faqList: { width: "100%", maxWidth: 850, gap: 7 },
  faqItem: { overflow: "hidden", backgroundColor: "#2d2d2d" },
  faqQuestion: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 24, paddingVertical: 15, backgroundColor: "#303030" },
  faqQuestionText: { flex: 1, color: COLORS.white, fontFamily: "Arial", fontSize: 17, lineHeight: 23, fontWeight: "600" },
  faqIcon: { color: COLORS.white, fontFamily: "Arial", fontSize: 34, lineHeight: 36, fontWeight: "300" },
  faqAnswer: { paddingHorizontal: 24, paddingTop: 19, paddingBottom: 22, color: "#f0f0f0", fontFamily: "Arial", fontSize: 14, lineHeight: 22 },
  faqFootnote: { marginTop: 24, marginBottom: 14, color: "#d2d2d2", fontFamily: "Arial", fontSize: 11, textAlign: "center" },
});
