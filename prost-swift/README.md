# PROST – native SwiftUI-App 🍎

Komplett neu in **SwiftUI** (nativ). Cleaner Blau-Gradient mit echten
**Radial-Glows**, sauber freigestellte Cover/Avatare, Onboarding, Profil,
Karten-Grid, Spiel-Karten, Bombe, iOS-Settings und Premium-Screen.

## 🚀 In Xcode einrichten (einmalig, ~3 Min)

**1. Neues Projekt anlegen**
- Xcode → **File › New › Project… › iOS › App**
- Product Name: **PROST** · Interface: **SwiftUI** · Language: **Swift**
- Speichern (z. B. auf dem Schreibtisch)

**2. Code einfügen**
- Im Projekt-Navigator die automatisch erzeugten **`PROSTApp.swift`** und
  **`ContentView.swift`** löschen (Move to Trash).
- Die **3 Dateien aus `prost-swift/Sources/`** (`PROSTApp.swift`,
  `ContentView.swift`, `Screens.swift`) per Drag-and-drop ins Projekt ziehen
  → „**Copy items if needed**" ankreuzen.

**3. Bilder einfügen**
- Links **`Assets.xcassets`** öffnen.
- Alle **25 PNGs aus `prost-swift/Images/`** markieren und in die
  Assets-Fläche ziehen. Xcode legt automatisch die Bild-Sets an
  (Namen bleiben: `cover_tod`, `ava1`, `ic_flame` …).

**4. Starten**
- Oben ein iPhone-Simulator wählen → **▶︎ (Cmd + R)**.

## Aufbau
- `PROSTApp.swift` – App-Einstieg
- `ContentView.swift` – Theme, Hintergrund (Glows), Daten, Root-Steuerung
- `Screens.swift` – alle Screens (Onboarding, Profil, Home, Spiel, Settings, Paywall)

## Hinweis
Zielsystem iOS 15+ (nutzt `RadialGradient(colors:)`). Neue Xcode-Projekte
sind standardmäßig höher – passt also. Nur für Erwachsene, bitte
verantwortungsvoll trinken.
