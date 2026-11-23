import React from "react";
import { AppRegistry } from "react-native-web";
import App from "./App.jsx";
import "./styles.css";

AppRegistry.registerComponent("VibeFlixOverview", () => App);
AppRegistry.runApplication("VibeFlixOverview", {
  rootTag: document.getElementById("root"),
});
