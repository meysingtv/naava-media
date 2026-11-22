const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

// Xcode startet die App sonst im Debug-Modus mit dem Expo-Entwicklerbildschirm
// (expo-dev-launcher). Der stürzt unter iOS 27 beim Start ab („Cannot find the
// keyWindow“). Deshalb stellt dieses Plugin nach jedem Prebuild beim Starten
// mit Cmd + R (Run) und beim Profilieren auf „Release“ um.
module.exports = function iosReleaseStart(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const ios = cfg.modRequest.platformProjectRoot;
      const projekte = fs.readdirSync(ios).filter((n) => n.endsWith(".xcodeproj"));
      for (const p of projekte) {
        const ordner = path.join(ios, p, "xcshareddata", "xcschemes");
        if (!fs.existsSync(ordner)) continue;
        for (const datei of fs.readdirSync(ordner).filter((n) => n.endsWith(".xcscheme"))) {
          const pfad = path.join(ordner, datei);
          const alt = fs.readFileSync(pfad, "utf8");
          const neu = alt.replace(/(<LaunchAction[^>]*?buildConfiguration\s*=\s*")Debug(")/, "$1Release$2");
          if (neu !== alt) fs.writeFileSync(pfad, neu);
        }
      }
      return cfg;
    },
  ]);
};
