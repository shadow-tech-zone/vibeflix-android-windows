import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const REPOSITORY_URL =
  "https://github.com/shadow-tech-zone/vibeflix-android-windows";

const palette = {
  ink: "#080808",
  surface: "#111112",
  surfaceRaised: "#181819",
  paper: "#f4f1ed",
  muted: "#a6a2a0",
  faint: "#6e6a68",
  red: "#e50914",
  redDark: "#9f1018",
  line: "#292728",
};

function jumpTo(id) {
  if (typeof document !== "undefined") {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }
}

function openRepository() {
  if (typeof window !== "undefined") {
    window.open(REPOSITORY_URL, "_blank", "noopener,noreferrer");
  }
}

function Brand({ compact = false }) {
  return (
    <View style={styles.brand} accessibilityRole="header">
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>V</Text>
      </View>
      <Text style={[styles.brandName, compact && styles.brandNameCompact]}>
        VIBEFLIX
      </Text>
    </View>
  );
}

function NavAction({ children, target, quiet = false }) {
  const onPress = target === "source" ? openRepository : () => jumpTo(target);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={[styles.navAction, quiet && styles.navActionQuiet]}
    >
      <Text style={[styles.navActionText, quiet && styles.navActionTextQuiet]}>
        {children}
      </Text>
    </Pressable>
  );
}

function ActionButton({ children, target, secondary = false }) {
  const onPress = target === "source" ? openRepository : () => jumpTo(target);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={[styles.actionButton, secondary && styles.actionButtonSecondary]}
    >
      <Text
        style={[
          styles.actionButtonText,
          secondary && styles.actionButtonTextSecondary,
        ]}
      >
        {children}
      </Text>
      <Text
        style={[
          styles.actionArrow,
          secondary && styles.actionArrowSecondary,
        ]}
      >
        {secondary ? "↗" : "→"}
      </Text>
    </Pressable>
  );
}

function ArtCard({ title, index, style }) {
  const variants = [
    {
      backgroundColor: "#26212a",
      glow: "#c44857",
      sky: "#f07c5c",
      ridge: "#483445",
      foreground: "#1b1a25",
    },
    {
      backgroundColor: "#10232a",
      glow: "#bd5e49",
      sky: "#e8a267",
      ridge: "#28434a",
      foreground: "#111a21",
    },
    {
      backgroundColor: "#252025",
      glow: "#b7423c",
      sky: "#e4a45f",
      ridge: "#4e3538",
      foreground: "#1a191e",
    },
    {
      backgroundColor: "#171f2b",
      glow: "#72677e",
      sky: "#dd8270",
      ridge: "#33404c",
      foreground: "#111821",
    },
  ];
  const color = variants[index % variants.length];

  return (
    <View style={[styles.artCard, { backgroundColor: color.backgroundColor }, style]}>
      <View
        style={[
          styles.artGlow,
          { backgroundColor: color.glow, shadowColor: color.glow },
        ]}
      />
      <View style={[styles.artSun, { backgroundColor: color.sky }]} />
      <View style={[styles.artRidgeBack, { backgroundColor: color.ridge }]} />
      <View style={[styles.artRidgeFront, { backgroundColor: color.foreground }]} />
      <View style={styles.artCardCopy}>
        <Text style={styles.artEyebrow}>A STORY IN YOUR LIST</Text>
        <Text style={styles.artTitle}>{title}</Text>
      </View>
      <View style={styles.artIndex}>
        <Text style={styles.artIndexText}>{String(index + 1).padStart(2, "0")}</Text>
      </View>
    </View>
  );
}

function PhonePreview({ compact }) {
  return (
    <View style={[styles.previewWrap, compact && styles.previewWrapCompact]}>
      <View style={styles.previewHalo} />
      <View style={styles.deviceFrame}>
        <View style={styles.deviceTop}>
          <View style={styles.deviceNotch} />
          <View style={styles.deviceStatus}>
            <Text style={styles.deviceTime}>9:41</Text>
            <Text style={styles.deviceSignal}>●  ◖  ▰</Text>
          </View>
        </View>

        <View style={styles.appHeader}>
          <Brand compact />
          <View style={styles.profileDot}>
            <Text style={styles.profileDotText}>S</Text>
          </View>
        </View>

        <View style={styles.continueCard}>
          <ArtCard title="THE QUIET HOUR" index={0} style={styles.previewArt} />
          <View style={styles.continueScrim} />
          <View style={styles.continueCopy}>
            <Text style={styles.continueEyebrow}>CONTINUE WATCHING</Text>
            <Text style={styles.continueTitle}>The Quiet Hour</Text>
            <Text style={styles.continueMeta}>Season 02 · Episode 04</Text>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.continueTime}>18 min left</Text>
          </View>
          <View style={styles.playButton}>
            <Text style={styles.playGlyph}>▶</Text>
          </View>
        </View>

        <View style={styles.previewShelfHeader}>
          <Text style={styles.previewShelfTitle}>Your list</Text>
          <Text style={styles.previewShelfMore}>SEE ALL</Text>
        </View>
        <View style={styles.previewShelf}>
          <ArtCard title="Afterglow" index={1} style={styles.shelfArt} />
          <ArtCard title="Low Tide" index={2} style={styles.shelfArt} />
          <ArtCard title="Northbound" index={3} style={styles.shelfArt} />
        </View>
        <View style={styles.previewTabBar}>
          <View style={styles.tabItem}>
            <View style={[styles.tabGlyph, styles.tabGlyphActive]} />
            <Text style={styles.tabLabelActive}>Home</Text>
          </View>
          <View style={styles.tabItem}>
            <View style={styles.tabGlyph} />
            <Text style={styles.tabLabel}>Search</Text>
          </View>
          <View style={styles.tabItem}>
            <View style={styles.tabGlyph} />
            <Text style={styles.tabLabel}>My list</Text>
          </View>
        </View>
      </View>
      <View style={styles.previewCaption}>
        <View style={styles.captionRule} />
        <Text style={styles.captionText}>A glimpse of the mobile experience</Text>
      </View>
    </View>
  );
}

function FeatureItem({ number, title, body, compact }) {
  return (
    <View style={[styles.featureItem, compact && styles.featureItemCompact]}>
      <Text style={styles.featureNumber}>{number}</Text>
      <View style={[styles.featureCopy, compact && styles.featureCopyCompact]}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

function SourcePill({ children, active = false }) {
  return (
    <View style={[styles.sourcePill, active && styles.sourcePillActive]}>
      <View style={[styles.sourceDot, active && styles.sourceDotActive]} />
      <Text style={[styles.sourcePillText, active && styles.sourcePillTextActive]}>
        {children}
      </Text>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const narrow = width < 520;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topGlow} />
      <View style={[styles.nav, compact && styles.navCompact]}>
        <Brand />
        <View style={styles.navRight}>
          {!narrow && <NavAction target="features">THE APP</NavAction>}
          {!narrow && <NavAction target="privacy" quiet>YOUR LIBRARY</NavAction>}
          <NavAction target="source" quiet>VIEW SOURCE ↗</NavAction>
        </View>
      </View>

      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow}>MADE FOR YOUR MOBILE LIBRARY</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
            Your stories.
            <Text style={styles.heroTitleAccent}> Your space.</Text>
          </Text>
          <Text style={[styles.heroBody, compact && styles.heroBodyCompact]}>
            A personal media library for the things you watch, the shows you save,
            and the exact moment you paused.
          </Text>
          <View style={styles.heroActions}>
            <ActionButton target="features">TAKE A LOOK</ActionButton>
            <ActionButton target="source" secondary>VIEW THE SOURCE</ActionButton>
          </View>
          <View style={styles.heroFootnote}>
            <Text style={styles.heroFootnoteMark}>01</Text>
            <Text style={styles.heroFootnoteText}>
              AN ANDROID APP · BUILT AROUND YOUR QUEUE
            </Text>
          </View>
        </View>
        <PhonePreview compact={compact} />
      </View>

      <View style={styles.signalBar}>
        <View style={[styles.signalInner, compact && styles.signalInnerCompact]}>
          <View style={styles.signalIntro}>
            <Text style={styles.signalLabel}>THE VIBEFLIX IDEA</Text>
            <Text style={styles.signalStatement}>
              Less hunting. More picking up where you left off.
            </Text>
          </View>
          <View style={styles.signalDivider} />
          <View style={styles.signalStat}>
            <Text style={styles.signalStatValue}>3</Text>
            <Text style={styles.signalStatLabel}>ways to browse</Text>
          </View>
          <View style={styles.signalStat}>
            <Text style={styles.signalStatValue}>1</Text>
            <Text style={styles.signalStatLabel}>place for your list</Text>
          </View>
        </View>
      </View>

      <View id="features" style={[styles.section, compact && styles.sectionCompact]}>
        <View style={[styles.sectionHeading, compact && styles.sectionHeadingCompact]}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionKicker}>SMALL DETAILS. BETTER FLOW.</Text>
            <Text accessibilityRole="header" style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>
              A library that remembers the little things.
            </Text>
          </View>
          <Text style={[styles.sectionAside, compact && styles.sectionAsideCompact]}>
            Built for the phone in your hand—not a big-screen account dashboard.
          </Text>
        </View>

        <View style={[styles.featureGrid, compact && styles.featureGridCompact]}>
          <FeatureItem
            number="01"
            title="Pick up right there"
            body="Keep your place in a film or episode, then jump back in without searching through the whole title again."
            compact={compact}
          />
          <FeatureItem
            number="02"
            title="Your list stays yours"
            body="Save titles to My List and keep a simple watch history. Your local library still works while signed out."
            compact={compact}
          />
          <FeatureItem
            number="03"
            title="Built for the next episode"
            body="Browse seasons, open the current episode list, and move on when you’re ready for what’s next."
            compact={compact}
          />
        </View>
      </View>

      <View style={[styles.collectionSection, compact && styles.collectionSectionCompact]}>
        <View style={[styles.collectionCopy, compact && styles.collectionCopyCompact]}>
          <Text style={styles.sectionKicker}>YOUR SHELVES, NOT A FEED</Text>
          <Text accessibilityRole="header" style={[styles.collectionTitle, compact && styles.collectionTitleCompact]}>
            Keep the queue. Lose the clutter.
          </Text>
          <Text style={styles.collectionBody}>
            My List, Continue Watching, and History each have a clear job. No
            social feed, no public profile, no pressure to keep up.
          </Text>
          <View style={styles.collectionRule} />
          <View style={styles.collectionNote}>
            <Text style={styles.collectionNoteMark}>↳</Text>
            <Text style={styles.collectionNoteText}>
              Resume is tracked per title—and per episode for series.
            </Text>
          </View>
        </View>
        <View style={[styles.collectionArt, compact && styles.collectionArtCompact]}>
          <View style={styles.collectionArtHeader}>
            <Text style={styles.collectionArtLabel}>A LITTLE ORDER</Text>
            <Text style={styles.collectionArtCount}>01 — 04</Text>
          </View>
          <View style={[styles.artRow, narrow && styles.artRowNarrow]}>
            <ArtCard title="Afterglow" index={0} style={styles.collectionPoster} />
            <ArtCard title="Low Tide" index={1} style={styles.collectionPoster} />
            {!narrow && <ArtCard title="Northbound" index={2} style={styles.collectionPoster} />}
            {!narrow && <ArtCard title="Slow Orbit" index={3} style={styles.collectionPoster} />}
          </View>
          <View style={styles.collectionArtFooter}>
            <View style={styles.collectionArtFooterLine} />
            <Text style={styles.collectionArtFooterText}>ILLUSTRATIVE UI · FICTIONAL TITLES</Text>
          </View>
        </View>
      </View>

      <View id="privacy" style={[styles.privacySection, compact && styles.privacySectionCompact]}>
        <View style={styles.privacyMark}>
          <View style={styles.privacyMarkOuter} />
          <View style={styles.privacyMarkInner} />
          <View style={styles.privacyMarkCore} />
        </View>
        <View style={[styles.privacyCopy, compact && styles.privacyCopyCompact]}>
          <Text style={styles.sectionKicker}>LOCAL FIRST, BY DEFAULT</Text>
          <Text accessibilityRole="header" style={[styles.privacyTitle, compact && styles.privacyTitleCompact]}>
            Your watch history is personal. It should stay that way.
          </Text>
          <Text style={styles.privacyBody}>
            Library sync is optional and requires your consent. The app keeps
            working locally; synced library data does not include playback links
            or provider credentials.
          </Text>
          <View style={styles.privacyFoot}>
            <View style={styles.privacyCheck}>
              <Text style={styles.privacyCheckText}>✓</Text>
            </View>
            <Text style={styles.privacyFootText}>YOU CHOOSE IF YOUR LIBRARY SYNCS</Text>
          </View>
        </View>
      </View>

      <View style={[styles.browseSection, compact && styles.browseSectionCompact]}>
        <View style={[styles.browseIntro, compact && styles.browseIntroCompact]}>
          <Text style={styles.sectionKicker}>A CHOICE, NOT A SETTINGS MAZE</Text>
          <Text accessibilityRole="header" style={[styles.browseTitle, compact && styles.browseTitleCompact]}>
            One shelf. Three ways to browse.
          </Text>
          <Text style={styles.browseBody}>
            Switch between either source or view them together. The source names
            stay simple, so the choice stays yours.
          </Text>
        </View>
        <View style={styles.sourceOptions}>
          <SourcePill>Server 1</SourcePill>
          <SourcePill active>Both Servers</SourcePill>
          <SourcePill>Server 2</SourcePill>
        </View>
      </View>

      <View style={[styles.finalCta, compact && styles.finalCtaCompact]}>
        <View style={styles.finalRule} />
        <Text style={styles.finalEyebrow}>VIBEFLIX · ANDROID</Text>
        <Text accessibilityRole="header" style={[styles.finalTitle, compact && styles.finalTitleCompact]}>
          Your space. Your pace.
        </Text>
        <Text style={styles.finalBody}>
          A personal app for keeping your place—and your library—close at hand.
        </Text>
        <View style={styles.finalAction}>
          <ActionButton target="source" secondary>EXPLORE THE PROJECT</ActionButton>
        </View>
      </View>

      <View style={[styles.footer, compact && styles.footerCompact]}>
        <Brand compact />
        <Text style={[styles.footerNote, compact && styles.footerNoteCompact]}>
          An independent personal project. Not affiliated with Netflix or any content provider.
          Use only services and content you are authorized to access.
        </Text>
        <Pressable accessibilityRole="link" onPress={openRepository}>
          <Text style={styles.footerLink}>GITHUB ↗</Text>
        </Pressable>
        <Text style={styles.footerCopyright}>© 2026 VIBEFLIX</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  page: {
    flexGrow: 1,
    backgroundColor: palette.ink,
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    top: -280,
    right: -160,
    width: 760,
    height: 600,
    borderRadius: 400,
    backgroundColor: "#321418",
    opacity: 0.2,
  },
  nav: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    paddingHorizontal: 56,
    paddingTop: 24,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#232121",
    zIndex: 2,
  },
  navCompact: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: "#ffffff",
    fontFamily: "Arial",
    fontSize: 17,
    lineHeight: 19,
    fontWeight: "900",
    transform: [{ skewX: "-8deg" }],
  },
  brandName: {
    color: palette.paper,
    fontFamily: "Arial",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  brandNameCompact: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },
  navAction: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  navActionQuiet: {
    borderBottomWidth: 1,
    borderBottomColor: "#4b4544",
  },
  navActionText: {
    color: palette.paper,
    fontFamily: "Arial",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  navActionTextQuiet: {
    color: "#d0cbc7",
  },
  hero: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    paddingHorizontal: 56,
    paddingTop: 58,
    paddingBottom: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 36,
  },
  heroCompact: {
    paddingHorizontal: 22,
    paddingTop: 44,
    paddingBottom: 52,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 28,
  },
  heroCopy: {
    flex: 1,
    maxWidth: 620,
    paddingBottom: 14,
  },
  heroCopyCompact: {
    maxWidth: 720,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: palette.red,
  },
  eyebrow: {
    color: "#c9c2bd",
    fontFamily: "Arial",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  heroTitle: {
    maxWidth: 620,
    color: palette.paper,
    fontFamily: "Arial",
    fontSize: 68,
    fontWeight: "800",
    lineHeight: 73,
    letterSpacing: -2.8,
  },
  heroTitleCompact: {
    fontSize: 50,
    lineHeight: 54,
    letterSpacing: -2,
  },
  heroTitleAccent: {
    color: "#d7d0cb",
  },
  heroBody: {
    maxWidth: 505,
    marginTop: 20,
    color: palette.muted,
    fontFamily: "Arial",
    fontSize: 17,
    lineHeight: 27,
  },
  heroBodyCompact: {
    maxWidth: 570,
    marginTop: 16,
    fontSize: 15,
    lineHeight: 24,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 28,
  },
  actionButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 18,
    backgroundColor: palette.red,
    borderRadius: 3,
  },
  actionButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#494342",
  },
  actionButtonText: {
    color: "#fff",
    fontFamily: "Arial",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  actionButtonTextSecondary: {
    color: "#eee9e5",
  },
  actionArrow: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 20,
  },
  actionArrowSecondary: {
    color: "#e7e0db",
  },
  heroFootnote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 42,
  },
  heroFootnoteMark: {
    color: palette.red,
    fontFamily: "Arial",
    fontSize: 11,
    fontWeight: "700",
  },
  heroFootnoteText: {
    color: palette.faint,
    fontFamily: "Arial",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  previewWrap: {
    width: 400,
    maxWidth: "100%",
    alignSelf: "center",
    alignItems: "center",
    position: "relative",
    paddingVertical: 14,
  },
  previewWrapCompact: {
    width: 360,
  },
  previewHalo: {
    position: "absolute",
    top: 20,
    left: 32,
    right: 32,
    bottom: 24,
    borderRadius: 220,
    backgroundColor: "#43161c",
    opacity: 0.48,
  },
  deviceFrame: {
    width: 305,
    maxWidth: "100%",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#4d4847",
    paddingHorizontal: 12,
    paddingBottom: 11,
    backgroundColor: "#111112",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.56,
    shadowRadius: 28,
    elevation: 18,
  },
  deviceTop: {
    position: "relative",
    height: 22,
    justifyContent: "center",
  },
  deviceNotch: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 80,
    height: 13,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#070708",
  },
  deviceStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 7,
  },
  deviceTime: {
    color: "#e3dedb",
    fontFamily: "Arial",
    fontSize: 7,
    fontWeight: "700",
  },
  deviceSignal: {
    color: "#e3dedb",
    fontFamily: "Arial",
    fontSize: 7,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  profileDot: {
    width: 23,
    height: 23,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: "#413a39",
  },
  profileDotText: {
    color: "#f4f1ed",
    fontFamily: "Arial",
    fontSize: 9,
    fontWeight: "700",
  },
  continueCard: {
    position: "relative",
    height: 236,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#252028",
  },
  previewArt: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  continueScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#080808",
    opacity: 0.26,
  },
  continueCopy: {
    position: "absolute",
    left: 14,
    bottom: 14,
    right: 52,
  },
  continueEyebrow: {
    color: "#e3d9d2",
    fontFamily: "Arial",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  continueTitle: {
    marginTop: 4,
    color: "#fff",
    fontFamily: "Arial",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  continueMeta: {
    marginTop: 4,
    color: "#ddd5d0",
    fontFamily: "Arial",
    fontSize: 8,
  },
  progressTrack: {
    height: 3,
    overflow: "hidden",
    marginTop: 11,
    borderRadius: 2,
    backgroundColor: "#77716e",
  },
  progressFill: {
    width: "61%",
    height: "100%",
    backgroundColor: palette.red,
  },
  continueTime: {
    marginTop: 5,
    color: "#c2b9b2",
    fontFamily: "Arial",
    fontSize: 7,
  },
  playButton: {
    position: "absolute",
    right: 13,
    bottom: 30,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "rgba(8,8,8,0.32)",
  },
  playGlyph: {
    marginLeft: 2,
    color: "#ffffff",
    fontFamily: "Arial",
    fontSize: 9,
  },
  previewShelfHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 9,
  },
  previewShelfTitle: {
    color: "#f4f1ed",
    fontFamily: "Arial",
    fontSize: 11,
    fontWeight: "700",
  },
  previewShelfMore: {
    color: "#9c9692",
    fontFamily: "Arial",
    fontSize: 6,
    fontWeight: "700",
    letterSpacing: 1,
  },
  previewShelf: {
    flexDirection: "row",
    gap: 7,
  },
  shelfArt: {
    flex: 1,
    height: 88,
    borderRadius: 5,
  },
  previewTabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 13,
    paddingBottom: 3,
  },
  tabItem: {
    alignItems: "center",
    gap: 5,
  },
  tabGlyph: {
    width: 13,
    height: 9,
    borderWidth: 1,
    borderColor: "#88817d",
    borderRadius: 2,
  },
  tabGlyphActive: {
    borderColor: palette.red,
    backgroundColor: palette.red,
  },
  tabLabel: {
    color: "#8c8581",
    fontFamily: "Arial",
    fontSize: 6,
  },
  tabLabelActive: {
    color: "#f4f1ed",
    fontFamily: "Arial",
    fontSize: 6,
  },
  previewCaption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 15,
  },
  captionRule: {
    width: 21,
    height: 1,
    backgroundColor: palette.red,
  },
  captionText: {
    color: "#8f8884",
    fontFamily: "Arial",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  artCard: {
    position: "relative",
    flex: 1,
    minHeight: 170,
    overflow: "hidden",
    borderRadius: 7,
  },
  artGlow: {
    position: "absolute",
    top: "12%",
    right: "10%",
    width: "43%",
    aspectRatio: 1,
    borderRadius: 999,
    opacity: 0.32,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 36,
  },
  artSun: {
    position: "absolute",
    top: "24%",
    right: "20%",
    width: "25%",
    aspectRatio: 1,
    borderRadius: 999,
    opacity: 0.82,
  },
  artRidgeBack: {
    position: "absolute",
    left: "-20%",
    bottom: "-5%",
    width: "145%",
    height: "48%",
    borderTopLeftRadius: 180,
    borderTopRightRadius: 220,
    transform: [{ rotate: "-12deg" }],
    opacity: 0.88,
  },
  artRidgeFront: {
    position: "absolute",
    left: "-24%",
    bottom: "-28%",
    width: "155%",
    height: "53%",
    borderTopLeftRadius: 170,
    borderTopRightRadius: 160,
    transform: [{ rotate: "8deg" }],
  },
  artCardCopy: {
    position: "absolute",
    left: 12,
    right: 10,
    bottom: 12,
  },
  artEyebrow: {
    color: "#e9dcd5",
    fontFamily: "Arial",
    fontSize: 6,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  artTitle: {
    marginTop: 3,
    color: "#ffffff",
    fontFamily: "Arial",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  artIndex: {
    position: "absolute",
    top: 9,
    left: 10,
  },
  artIndexText: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Arial",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
  },
  signalBar: {
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#272424",
    backgroundColor: "#0d0d0e",
  },
  signalInner: {
    width: "100%",
    maxWidth: 1268,
    alignSelf: "center",
    paddingHorizontal: 56,
    paddingVertical: 23,
    flexDirection: "row",
    alignItems: "center",
    gap: 35,
  },
  signalInnerCompact: {
    paddingHorizontal: 22,
    flexWrap: "wrap",
    gap: 18,
  },
  signalIntro: {
    flex: 1,
    minWidth: 200,
  },
  signalLabel: {
    color: palette.red,
    fontFamily: "Arial",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  signalStatement: {
    marginTop: 5,
    color: "#e8e3df",
    fontFamily: "Arial",
    fontSize: 15,
    fontWeight: "600",
  },
  signalDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#393433",
  },
  signalStat: {
    minWidth: 100,
  },
  signalStatValue: {
    color: "#f6f2ee",
    fontFamily: "Arial",
    fontSize: 23,
    fontWeight: "800",
  },
  signalStatLabel: {
    marginTop: 2,
    color: palette.muted,
    fontFamily: "Arial",
    fontSize: 9,
  },
  section: {
    width: "100%",
    maxWidth: 1268,
    alignSelf: "center",
    paddingHorizontal: 56,
    paddingTop: 100,
    paddingBottom: 99,
  },
  sectionCompact: {
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 70,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 32,
  },
  sectionHeadingCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 16,
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  sectionKicker: {
    color: palette.red,
    fontFamily: "Arial",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  sectionTitle: {
    maxWidth: 690,
    marginTop: 12,
    color: palette.paper,
    fontFamily: "Arial",
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -1.3,
  },
  sectionTitleCompact: {
    fontSize: 31,
    lineHeight: 36,
    letterSpacing: -0.9,
  },
  sectionAside: {
    maxWidth: 270,
    paddingBottom: 4,
    color: palette.muted,
    fontFamily: "Arial",
    fontSize: 12,
    lineHeight: 19,
  },
  sectionAsideCompact: {
    maxWidth: 400,
  },
  featureGrid: {
    marginTop: 46,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  featureGridCompact: {
    flexDirection: "column",
    marginTop: 30,
  },
  featureItem: {
    flex: 1,
    minHeight: 190,
    flexDirection: "column",
    paddingTop: 20,
    paddingRight: 25,
    paddingLeft: 21,
    borderRightWidth: 1,
    borderRightColor: palette.line,
  },
  featureItemCompact: {
    minHeight: 0,
    flexDirection: "row",
    paddingTop: 21,
    paddingRight: 0,
    paddingBottom: 21,
    paddingLeft: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    gap: 20,
  },
  featureNumber: {
    color: palette.red,
    fontFamily: "Arial",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  featureCopy: {
    marginTop: 26,
  },
  featureCopyCompact: {
    flex: 1,
    marginTop: 0,
  },
  featureTitle: {
    color: "#f3efeb",
    fontFamily: "Arial",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  featureBody: {
    maxWidth: 310,
    marginTop: 11,
    color: palette.muted,
    fontFamily: "Arial",
    fontSize: 12,
    lineHeight: 20,
  },
  collectionSection: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    paddingHorizontal: 56,
    paddingTop: 75,
    paddingBottom: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 50,
    backgroundColor: "#101011",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#272424",
  },
  collectionSectionCompact: {
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 58,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 34,
  },
  collectionCopy: {
    width: 360,
    maxWidth: "100%",
  },
  collectionCopyCompact: {
    width: "100%",
  },
  collectionTitle: {
    marginTop: 12,
    color: palette.paper,
    fontFamily: "Arial",
    fontSize: 37,
    fontWeight: "800",
    lineHeight: 43,
    letterSpacing: -1.2,
  },
  collectionTitleCompact: {
    maxWidth: 520,
    fontSize: 31,
    lineHeight: 36,
  },
  collectionBody: {
    marginTop: 16,
    color: palette.muted,
    fontFamily: "Arial",
    fontSize: 13,
    lineHeight: 21,
  },
  collectionRule: {
    width: 42,
    height: 1,
    marginTop: 25,
    backgroundColor: palette.red,
  },
  collectionNote: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  collectionNoteMark: {
    color: palette.red,
    fontFamily: "Arial",
    fontSize: 16,
  },
  collectionNoteText: {
    flex: 1,
    color: "#d5cfca",
    fontFamily: "Arial",
    fontSize: 11,
    lineHeight: 17,
  },
  collectionArt: {
    flex: 1,
    minWidth: 0,
    padding: 18,
    borderWidth: 1,
    borderColor: "#373131",
    borderRadius: 8,
    backgroundColor: "#151516",
  },
  collectionArtCompact: {
    padding: 12,
  },
  collectionArtHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  collectionArtLabel: {
    color: "#dad3ce",
    fontFamily: "Arial",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  collectionArtCount: {
    color: palette.faint,
    fontFamily: "Arial",
    fontSize: 8,
    letterSpacing: 1,
  },
  artRow: {
    flexDirection: "row",
    gap: 10,
  },
  artRowNarrow: {
    gap: 8,
  },
  collectionPoster: {
    height: 218,
    minHeight: 120,
  },
  collectionArtFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 14,
  },
  collectionArtFooterLine: {
    width: 20,
    height: 1,
    backgroundColor: palette.red,
  },
  collectionArtFooterText: {
    color: palette.faint,
    fontFamily: "Arial",
    fontSize: 7,
    letterSpacing: 1.1,
  },
  privacySection: {
    width: "100%",
    maxWidth: 1268,
    alignSelf: "center",
    paddingHorizontal: 56,
    paddingTop: 96,
    paddingBottom: 98,
    flexDirection: "row",
    alignItems: "center",
    gap: 70,
  },
  privacySectionCompact: {
    paddingHorizontal: 22,
    paddingTop: 68,
    paddingBottom: 68,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 32,
  },
  privacyMark: {
    position: "relative",
    width: 126,
    height: 126,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyMarkOuter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: "#5c292e",
    borderRadius: 70,
  },
  privacyMarkInner: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8c3339",
    borderRadius: 40,
    backgroundColor: "#1a1011",
  },
  privacyMarkCore: {
    width: 22,
    height: 22,
    borderRadius: 20,
    backgroundColor: palette.red,
    shadowColor: palette.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
  },
  privacyCopy: {
    flex: 1,
    maxWidth: 690,
  },
  privacyCopyCompact: {
    flex: 0,
    maxWidth: 600,
  },
  privacyTitle: {
    maxWidth: 650,
    marginTop: 12,
    color: palette.paper,
    fontFamily: "Arial",
    fontSize: 35,
    fontWeight: "800",
    lineHeight: 41,
    letterSpacing: -1,
  },
  privacyTitleCompact: {
    fontSize: 30,
    lineHeight: 35,
  },
  privacyBody: {
    maxWidth: 610,
    marginTop: 14,
    color: palette.muted,
    fontFamily: "Arial",
    fontSize: 13,
    lineHeight: 21,
  },
  privacyFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 22,
  },
  privacyCheck: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#322022",
  },
  privacyCheckText: {
    color: "#f0b7b3",
    fontFamily: "Arial",
    fontSize: 11,
    fontWeight: "700",
  },
  privacyFootText: {
    color: "#c7c0bb",
    fontFamily: "Arial",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  browseSection: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    paddingHorizontal: 56,
    paddingTop: 58,
    paddingBottom: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#292525",
    backgroundColor: "#101011",
  },
  browseSectionCompact: {
    paddingHorizontal: 22,
    paddingTop: 46,
    paddingBottom: 46,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 26,
  },
  browseIntro: {
    flex: 1,
    maxWidth: 540,
  },
  browseIntroCompact: {
    maxWidth: 640,
  },
  browseTitle: {
    marginTop: 10,
    color: palette.paper,
    fontFamily: "Arial",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  browseTitleCompact: {
    fontSize: 25,
  },
  browseBody: {
    maxWidth: 510,
    marginTop: 10,
    color: palette.muted,
    fontFamily: "Arial",
    fontSize: 12,
    lineHeight: 20,
  },
  sourceOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  sourcePill: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#3a3433",
    borderRadius: 30,
    backgroundColor: "#151516",
  },
  sourcePillActive: {
    borderColor: "#7b282e",
    backgroundColor: "#251315",
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: "#7f7773",
  },
  sourceDotActive: {
    backgroundColor: palette.red,
  },
  sourcePillText: {
    color: "#d4ceca",
    fontFamily: "Arial",
    fontSize: 9,
    fontWeight: "600",
  },
  sourcePillTextActive: {
    color: "#fff2ee",
  },
  finalCta: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 92,
    paddingBottom: 92,
  },
  finalCtaCompact: {
    paddingHorizontal: 22,
    paddingTop: 68,
    paddingBottom: 70,
  },
  finalRule: {
    width: 38,
    height: 2,
    marginBottom: 20,
    backgroundColor: palette.red,
  },
  finalEyebrow: {
    color: "#c7bfba",
    fontFamily: "Arial",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  finalTitle: {
    marginTop: 12,
    color: palette.paper,
    fontFamily: "Arial",
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -1.8,
    textAlign: "center",
  },
  finalTitleCompact: {
    fontSize: 36,
    letterSpacing: -1.2,
  },
  finalBody: {
    maxWidth: 450,
    marginTop: 13,
    color: palette.muted,
    fontFamily: "Arial",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
  finalAction: {
    marginTop: 24,
  },
  footer: {
    width: "100%",
    maxWidth: 1380,
    alignSelf: "center",
    paddingHorizontal: 56,
    paddingTop: 24,
    paddingBottom: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    borderTopWidth: 1,
    borderTopColor: "#272424",
  },
  footerCompact: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 25,
    flexWrap: "wrap",
    gap: 15,
  },
  footerNote: {
    flex: 1,
    maxWidth: 550,
    color: palette.faint,
    fontFamily: "Arial",
    fontSize: 9,
    lineHeight: 15,
  },
  footerNoteCompact: {
    flexBasis: "100%",
    maxWidth: 560,
  },
  footerLink: {
    color: "#d9d2cd",
    fontFamily: "Arial",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  footerCopyright: {
    color: palette.faint,
    fontFamily: "Arial",
    fontSize: 8,
    letterSpacing: 1,
  },
});
