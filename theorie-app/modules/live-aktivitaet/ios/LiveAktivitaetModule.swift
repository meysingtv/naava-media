import ActivityKit
import ExpoModulesCore
import Foundation

/// Brücke zu ActivityKit: Live-Aktivitäten für die Prüfungssimulation und den Prüfungstag.
/// Unter iOS 16.2 (oder wenn Live-Aktivitäten ausgeschaltet sind) passiert nichts.
public class LiveAktivitaetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveAktivitaet")

    Function("verfuegbar") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    Function("simulationStarten") { (gesamt: Int, startMs: Double) -> Bool in
      if #available(iOS 16.2, *) {
        return SimulationSteuerung.starten(gesamt: gesamt, start: Date(timeIntervalSince1970: startMs / 1000))
      }
      return false
    }

    Function("simulationAktualisieren") { (frage: Int, beantwortet: Int) in
      if #available(iOS 16.2, *) {
        SimulationSteuerung.aktualisieren(frage: frage, beantwortet: beantwortet)
      }
    }

    Function("simulationAbgeben") { (fehlerpunkte: Int, bestanden: Bool, richtig: Int, beantwortet: Int, endeMs: Double) in
      if #available(iOS 16.2, *) {
        SimulationSteuerung.abgeben(
          fehlerpunkte: fehlerpunkte,
          bestanden: bestanden,
          richtig: richtig,
          beantwortet: beantwortet,
          ende: Date(timeIntervalSince1970: endeMs / 1000)
        )
      }
    }

    Function("simulationBeenden") { () in
      if #available(iOS 16.2, *) {
        SimulationSteuerung.beenden()
      }
    }

    Function("pruefungstagStarten") { (terminMs: Double, hinweis: String) -> Bool in
      if #available(iOS 16.2, *) {
        return PruefungstagSteuerung.starten(termin: Date(timeIntervalSince1970: terminMs / 1000), hinweis: hinweis)
      }
      return false
    }

    Function("pruefungstagLaeuft") { (terminMs: Double) -> Bool in
      if #available(iOS 16.2, *) {
        return PruefungstagSteuerung.laeuft(termin: Date(timeIntervalSince1970: terminMs / 1000))
      }
      return false
    }

    Function("pruefungstagBeenden") { () in
      if #available(iOS 16.2, *) {
        PruefungstagSteuerung.beenden()
      }
    }
  }
}

// MARK: - Prüfungssimulation

@available(iOS 16.2, *)
enum SimulationSteuerung {
  /// Neue Live-Aktivität für eine Simulation; alte Simulationen verschwinden vorher.
  static func starten(gesamt: Int, start: Date) -> Bool {
    let alte = Activity<SimulationAttribute>.activities
    Task {
      for aktivitaet in alte {
        await aktivitaet.end(nil, dismissalPolicy: .immediate)
      }
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
    let zustand = SimulationAttribute.ContentState(
      frage: 1, beantwortet: 0, fertig: false, fehlerpunkte: 0, bestanden: false, richtig: 0, ende: nil
    )
    do {
      _ = try Activity.request(
        attributes: SimulationAttribute(gesamt: gesamt, start: start),
        content: ActivityContent(state: zustand, staleDate: nil),
        pushType: nil
      )
      return true
    } catch {
      return false
    }
  }

  static func aktualisieren(frage: Int, beantwortet: Int) {
    let zustand = SimulationAttribute.ContentState(
      frage: frage, beantwortet: beantwortet, fertig: false, fehlerpunkte: 0, bestanden: false, richtig: 0, ende: nil
    )
    let aktivitaeten = Activity<SimulationAttribute>.activities
    Task {
      for aktivitaet in aktivitaeten {
        await aktivitaet.update(ActivityContent(state: zustand, staleDate: nil))
      }
    }
  }

  /// Ergebnis zeigen und die Aktivität beenden; sie bleibt noch 15 Minuten auf dem Sperrbildschirm.
  static func abgeben(fehlerpunkte: Int, bestanden: Bool, richtig: Int, beantwortet: Int, ende: Date) {
    let zustand = SimulationAttribute.ContentState(
      frage: beantwortet, beantwortet: beantwortet, fertig: true, fehlerpunkte: fehlerpunkte, bestanden: bestanden, richtig: richtig, ende: ende
    )
    let aktivitaeten = Activity<SimulationAttribute>.activities
    Task {
      for aktivitaet in aktivitaeten {
        await aktivitaet.end(
          ActivityContent(state: zustand, staleDate: nil),
          dismissalPolicy: .after(Date().addingTimeInterval(15 * 60))
        )
      }
    }
  }

  /// Simulation abgebrochen: sofort weg.
  static func beenden() {
    let aktivitaeten = Activity<SimulationAttribute>.activities
    Task {
      for aktivitaet in aktivitaeten {
        await aktivitaet.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}

// MARK: - Prüfungstag

@available(iOS 16.2, *)
enum PruefungstagSteuerung {
  private static func passt(_ aktivitaet: Activity<PruefungstagAttribute>, _ termin: Date) -> Bool {
    let offen = aktivitaet.activityState == .active || aktivitaet.activityState == .stale
    return offen && abs(aktivitaet.attributes.termin.timeIntervalSince(termin)) < 1
  }

  /// Countdown bis zum Termin starten. Läuft schon einer für diesen Termin, wird nur der Hinweis erneuert.
  /// Ab dem Termin gilt die Aktivität als „stale“ – dann zeigt sie „Viel Erfolg“ statt des Countdowns.
  static func starten(termin: Date, hinweis: String) -> Bool {
    let zustand = PruefungstagAttribute.ContentState(hinweis: hinweis)
    let vorhandene = Activity<PruefungstagAttribute>.activities
    if let laufende = vorhandene.first(where: { passt($0, termin) }) {
      Task {
        await laufende.update(ActivityContent(state: zustand, staleDate: termin))
      }
      return true
    }
    Task {
      for aktivitaet in vorhandene {
        await aktivitaet.end(nil, dismissalPolicy: .immediate)
      }
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
    do {
      _ = try Activity.request(
        attributes: PruefungstagAttribute(termin: termin),
        content: ActivityContent(state: zustand, staleDate: termin),
        pushType: nil
      )
      return true
    } catch {
      return false
    }
  }

  static func laeuft(termin: Date) -> Bool {
    Activity<PruefungstagAttribute>.activities.contains { passt($0, termin) }
  }

  static func beenden() {
    let aktivitaeten = Activity<PruefungstagAttribute>.activities
    Task {
      for aktivitaet in aktivitaeten {
        await aktivitaet.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}
