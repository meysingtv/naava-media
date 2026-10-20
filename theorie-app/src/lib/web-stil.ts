import { Platform } from "react-native";

// Kleinigkeiten fürs Web-Panel im Browser: kein blauer Fokusrahmen um
// Eingabefelder (die Felder haben einen eigenen Rahmen), schmale Scrollbalken
// und ein Seitentitel im Browser-Tab.

const istBrowser = Platform.OS === "web" && typeof document !== "undefined";

if (istBrowser) {
  const stil = document.createElement("style");
  stil.textContent = `
    input, textarea, select { outline: none !important; }
    body { overscroll-behavior: none; }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.35); border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.55); background-clip: content-box; }
  `;
  document.head.appendChild(stil);
}

const TITEL: Record<string, string> = {
  heute: "Home",
  lernen: "Lernen",
  clips: "Clips",
  pruefen: "Prüfung",
  profil: "Profil",
  einstellungen: "Einstellungen",
  manager: "Manager",
  statistik: "Statistik",
  training: "Training",
  pruefung: "Prüfungssimulation",
  anmelden: "Anmelden",
  registrieren: "Registrieren",
};

/** Titel im Browser-Tab passend zur Seite. */
export function seitenTitelSetzen(pfad: string) {
  if (!istBrowser) return;
  const teil = TITEL[pfad.replace(/^\//, "").split("/")[0]];
  document.title = teil ? `${teil} · Fahrschul Pro` : "Fahrschul Pro";
}
