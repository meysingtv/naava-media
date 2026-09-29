// Widget-Erweiterung nur für Live-Aktivitäten (Sperrbildschirm + Dynamic Island):
// Prüfungssimulation und Countdown am Prüfungstag. Wird bei `expo prebuild` erzeugt.
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",
  name: "PruefungLive",
  displayName: "Fahrschule Pro",
  bundleIdentifier: ".pruefunglive",
  // Live-Aktivitäten mit ActivityContent und „stale“-Zustand gibt es ab iOS 16.2.
  deploymentTarget: "16.2",
  frameworks: ["SwiftUI", "WidgetKit", "ActivityKit"],
  colors: {
    $accent: "#FC5B0E",
  },
};
