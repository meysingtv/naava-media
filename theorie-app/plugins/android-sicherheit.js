const { withAndroidManifest } = require("expo/config-plugins");

// Bibliotheken melden manche Android-Seiten als „von außen aufrufbar“ an,
// obwohl die App sie nicht braucht. Die schließen wir: Andere Apps sollen
// keine Seite dieser App direkt starten können (außer dem normalen Start
// und den Anmelde-Links).
const SCHLIESSEN = ["com.canhub.cropper.CropImageActivity"];

module.exports = function androidSicherheit(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = { ...manifest.$, "xmlns:tools": "http://schemas.android.com/tools" };
    const app = manifest.application[0];
    // Kein Backup der App-Daten – auch wenn eine Bibliothek es erlauben will.
    const ersetzen = new Set(String(app.$["tools:replace"] ?? "").split(",").filter(Boolean));
    ersetzen.add("android:allowBackup");
    app.$["tools:replace"] = [...ersetzen].join(",");
    app.activity = app.activity ?? [];
    for (const name of SCHLIESSEN) {
      if (!app.activity.some((a) => a.$["android:name"] === name)) {
        app.activity.push({ $: { "android:name": name, "android:exported": "false", "tools:replace": "android:exported" } });
      }
    }
    return cfg;
  });
};
