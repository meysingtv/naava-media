import ActivityKit
import Foundation

// Diese beiden Typen stehen genauso in modules/live-aktivitaet/ios/Attribute.swift.
// ActivityKit ordnet eine Live-Aktivität über den Typnamen der Erweiterung zu –
// Namen und Felder müssen deshalb in beiden Dateien gleich bleiben.

/// Prüfungssimulation: aktuelle Frage und Fortschritt, nach dem Abgeben das Ergebnis.
@available(iOS 16.1, *)
struct SimulationAttribute: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var frage: Int
    var beantwortet: Int
    var fertig: Bool
    var fehlerpunkte: Int
    var bestanden: Bool
    var richtig: Int
    var ende: Date?
  }

  var gesamt: Int
  var start: Date
}

/// Prüfungstag: Countdown bis zum Termin der Theorieprüfung.
@available(iOS 16.1, *)
struct PruefungstagAttribute: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var hinweis: String
  }

  var termin: Date
}
