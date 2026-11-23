import React from "react";
import { AppRegistry } from "react-native-web";
import App from "./App.jsx";
import "./styles.css";

AppRegistry.registerComponent("VibeFlixPrototype", () => App);
AppRegistry.runApplication("VibeFlixPrototype", {
  rootTag: document.getElementById("root"),
});
