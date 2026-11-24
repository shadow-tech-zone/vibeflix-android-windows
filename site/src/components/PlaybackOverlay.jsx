import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme.js";

const HTML_VIDEO_STYLE = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  backgroundColor: "#000",
};

export default function PlaybackOverlay({ item, onClose }) {
  const videoRef = useRef(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStreamUrl("");
    setPlayerError("");
    if (!item) {
      setLoading(false);
      setError("");
      return undefined;
    }
    if (!item.isPublicCatalog) {
      setLoading(false);
      setError("This fictional demo title has no video source connected.");
      return undefined;
    }

    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ kind: item.kind, id: item.id });
    fetch(`/api/play4u-playback?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        let result;
        try { result = await response.json(); } catch { throw new Error("Playback returned an unreadable response."); }
        if (!response.ok || !result?.ok || typeof result.data?.url !== "string") {
          throw new Error(result?.error || "Could not prepare this title for playback.");
        }
        const url = new URL(result.data.url);
        if (url.protocol !== "https:") throw new Error("This title has an unsupported stream address.");
        if (current) setStreamUrl(url.href);
      })
      .catch((requestError) => {
        if (current && requestError?.name !== "AbortError") {
          setError(requestError instanceof Error ? requestError.message : "Could not prepare playback.");
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [item?.id, item?.kind, item?.isPublicCatalog, attempt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!streamUrl || !video) return undefined;
    setPlayerError("");

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.load();
      video.play().catch(() => {});
      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    let cancelled = false;
    let hls;
    import("hls.js/light")
      .then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setPlayerError("This browser does not support HLS playback.");
          return;
        }
        hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setPlayerError("The stream could not be played in this browser. Try again or use another browser.");
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      })
      .catch(() => {
        if (!cancelled) setPlayerError("The browser player could not be loaded.");
      });
    return () => {
      cancelled = true;
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [streamUrl]);

  const playerMessage = error || playerError;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(item)}>
      {item ? (
        <View style={styles.player}>
          {streamUrl ? (
            <video
              ref={videoRef}
              id="vibeflix-playback-video"
              aria-label={`Now playing ${item.title}`}
              controls
              playsInline
              autoPlay
              preload="auto"
              style={HTML_VIDEO_STYLE}
              onError={() => setPlayerError("The stream could not be played in this browser.")}
            />
          ) : null}
          <View pointerEvents="none" style={styles.topShade} />
          <View style={styles.topBar}>
            <View style={styles.titleBlock}>
              <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.isPublicCatalog ? "VIBEFLIX PLAYER" : "VIBEFLIX PREVIEW"}</Text>
            </View>
            <Pressable accessibilityLabel="Close player" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          {(loading || playerMessage || (!item.isPublicCatalog && error)) ? (
            <View style={styles.message}>
              {loading ? <View style={styles.spinner} /> : null}
              <Text accessibilityRole="status" style={styles.messageText}>
                {loading ? "Preparing video…" : playerMessage}
              </Text>
              {playerMessage && item.isPublicCatalog ? (
                <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, position: "relative", alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#050505" },
  topShade: { position: "absolute", zIndex: 1, top: 0, left: 0, right: 0, height: 110, backgroundColor: "rgba(0,0,0,0.5)" },
  topBar: { position: "absolute", zIndex: 2, top: 0, left: 0, right: 0, minHeight: 70, flexDirection: "row", alignItems: "center", paddingLeft: 22, paddingRight: 18 },
  titleBlock: { flex: 1, paddingRight: 12 },
  title: { color: COLORS.white, fontFamily: "Arial", fontSize: 17, fontWeight: "700" },
  subtitle: { marginTop: 4, color: "#c8c8c8", fontFamily: "Arial", fontSize: 8, fontWeight: "700", letterSpacing: 1.3 },
  closeButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "rgba(20,20,20,0.84)" },
  closeText: { color: COLORS.white, fontFamily: "Arial", fontSize: 27, lineHeight: 30 },
  message: { zIndex: 2, alignItems: "center", maxWidth: 470, paddingHorizontal: 24 },
  spinner: { width: 30, height: 30, marginBottom: 14, borderWidth: 3, borderColor: "rgba(255,255,255,0.25)", borderTopColor: COLORS.red, borderRadius: 18 },
  messageText: { color: "#e5e5e5", fontFamily: "Arial", fontSize: 13, lineHeight: 20, textAlign: "center" },
  retryButton: { minHeight: 38, justifyContent: "center", marginTop: 15, paddingHorizontal: 18, borderRadius: 4, backgroundColor: COLORS.white },
  retryText: { color: COLORS.black, fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
});
