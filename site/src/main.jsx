import React, { Component } from "react";
import { AppRegistry, Pressable, StyleSheet, Text, View } from "react-native-web";
import App from "./App.jsx";
import "./styles.css";

class RenderErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("VibeFlix render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.brand}>VIBEFLIX</Text>
          <Text style={styles.title}>We couldn’t load this page.</Text>
          <Text style={styles.copy}>Try refreshing. Your saved list remains in this browser.</Text>
          <Pressable accessibilityRole="button" onPress={() => window.location.reload()} style={styles.button}>
            <Text style={styles.buttonText}>Reload VibeFlix</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function Root() {
  return (
    <RenderErrorBoundary>
      <App />
    </RenderErrorBoundary>
  );
}

AppRegistry.registerComponent("VibeFlixPrototype", () => Root);
AppRegistry.runApplication("VibeFlixPrototype", {
  rootTag: document.getElementById("root"),
});

const styles = StyleSheet.create({
  fallback: { flex: 1, minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#141414" },
  brand: { color: "#e50914", fontFamily: "Arial", fontSize: 18, fontWeight: "900", letterSpacing: 1.8 },
  title: { marginTop: 20, color: "#fff", fontFamily: "Arial", fontSize: 22, fontWeight: "700", textAlign: "center" },
  copy: { maxWidth: 380, marginTop: 8, color: "#b3b3b3", fontFamily: "Arial", fontSize: 12, textAlign: "center" },
  button: { marginTop: 18, paddingHorizontal: 17, paddingVertical: 11, borderRadius: 3, backgroundColor: "#e50914" },
  buttonText: { color: "#fff", fontFamily: "Arial", fontSize: 11, fontWeight: "700" },
});
