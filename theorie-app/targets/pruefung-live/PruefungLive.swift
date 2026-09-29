import ActivityKit
import SwiftUI
import WidgetKit

// Live-Aktivitäten von Fahrschule Pro: Sperrbildschirm und Dynamic Island.
// Gestartet und aktualisiert werden sie aus der App (modules/live-aktivitaet).

@main
struct PruefungLiveBundle: WidgetBundle {
  var body: some Widget {
    SimulationLive()
    PruefungstagLive()
  }
}

// MARK: - Gemeinsames

/// Farben wie in der App (src/lib/theme.ts).
enum Farbe {
  static let orange = Color(red: 252 / 255, green: 91 / 255, blue: 14 / 255)
  static let gruen = Color(red: 78 / 255, green: 208 / 255, blue: 83 / 255)
  static let rot = Color(red: 1, green: 74 / 255, blue: 61 / 255)
  static let grund = Color(red: 13 / 255, green: 19 / 255, blue: 23 / 255)
  static let text2 = Color.white.opacity(0.62)
}

/// „12:05“ – Dauer einer abgegebenen Simulation.
func dauerText(von start: Date, bis ende: Date) -> String {
  let sekunden = max(0, Int(ende.timeIntervalSince(start)))
  return String(format: "%d:%02d", sekunden / 60, sekunden % 60)
}

/// Zeitspanne für einen Countdown; die untere Grenze darf nie hinter dem Termin liegen.
func countdownBereich(bis termin: Date) -> ClosedRange<Date> {
  let jetzt = Date()
  return min(jetzt, termin)...termin
}

/// Läuft bis zum Termin herunter und bleibt dann bei 0:00 stehen.
struct Countdown: View {
  let bis: Date
  var ausrichtung: TextAlignment = .trailing

  var body: some View {
    Text(timerInterval: countdownBereich(bis: bis), countsDown: true)
      .monospacedDigit()
      .multilineTextAlignment(ausrichtung)
  }
}

// MARK: - Prüfungssimulation

/// Frist verstrichen, aber noch nicht abgegeben (die App war zu dem Zeitpunkt nicht offen).
func istAbgelaufen(_ context: ActivityViewContext<SimulationAttribute>) -> Bool {
  context.isStale && !context.state.fertig
}

struct SimulationLive: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: SimulationAttribute.self) { context in
      SimulationSperrbildschirm(attribute: context.attributes, zustand: context.state, abgelaufen: istAbgelaufen(context))
        .activityBackgroundTint(Farbe.grund)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          SimulationLinks(attribute: context.attributes, zustand: context.state)
            .padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 2) {
            Text(context.state.fertig ? "Zeit" : "Restzeit")
              .font(.caption2)
              .foregroundStyle(Farbe.text2)
            SimulationZeit(attribute: context.attributes, zustand: context.state, abgelaufen: istAbgelaufen(context))
              .font(.title2.weight(.bold))
              .foregroundStyle(.white)
              .frame(width: 88, alignment: .trailing)
          }
          .padding(.trailing, 6)
        }
        DynamicIslandExpandedRegion(.center) {
          Text("Prüfungssimulation")
            .font(.caption.weight(.semibold))
            .foregroundStyle(Farbe.orange)
        }
        DynamicIslandExpandedRegion(.bottom) {
          SimulationFortschritt(attribute: context.attributes, zustand: context.state, abgelaufen: istAbgelaufen(context))
            .padding(.horizontal, 6)
            .padding(.top, 4)
        }
      } compactLeading: {
        SimulationKompaktLinks(attribute: context.attributes, zustand: context.state)
      } compactTrailing: {
        SimulationKompaktRechts(attribute: context.attributes, zustand: context.state, abgelaufen: istAbgelaufen(context))
      } minimal: {
        SimulationSymbol(zustand: context.state)
      }
      .keylineTint(Farbe.orange)
    }
  }
}

struct SimulationSperrbildschirm: View {
  let attribute: SimulationAttribute
  let zustand: SimulationAttribute.ContentState
  let abgelaufen: Bool

  private var ergebnisFarbe: Color { zustand.bestanden ? Farbe.gruen : Farbe.rot }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 6) {
        Image(systemName: "checklist")
        Text("PRÜFUNGSSIMULATION")
          .font(.caption2.weight(.bold))
          .tracking(0.8)
        Spacer(minLength: 8)
        SimulationZeit(attribute: attribute, zustand: zustand, abgelaufen: abgelaufen)
          .font(.caption.weight(.semibold))
          .foregroundStyle(Farbe.text2)
          .frame(width: 70, alignment: .trailing)
      }
      .foregroundStyle(Farbe.orange)

      if zustand.fertig {
        HStack(alignment: .center, spacing: 12) {
          Image(systemName: zustand.bestanden ? "checkmark.seal.fill" : "xmark.seal.fill")
            .font(.system(size: 30))
            .foregroundStyle(ergebnisFarbe)
          VStack(alignment: .leading, spacing: 2) {
            Text(zustand.bestanden ? "BESTANDEN" : "NICHT BESTANDEN")
              .font(.system(size: 20, weight: .heavy))
              .foregroundStyle(ergebnisFarbe)
            Text("\(zustand.richtig) von \(attribute.gesamt) richtig")
              .font(.subheadline)
              .foregroundStyle(Farbe.text2)
          }
          Spacer(minLength: 0)
          VStack(alignment: .trailing, spacing: 0) {
            Text("\(zustand.fehlerpunkte)")
              .font(.system(size: 30, weight: .bold))
              .monospacedDigit()
              .foregroundStyle(.white)
            Text("Fehlerpunkte")
              .font(.caption2)
              .foregroundStyle(Farbe.text2)
          }
        }
      } else if abgelaufen {
        VStack(alignment: .leading, spacing: 2) {
          Text("Zeit abgelaufen")
            .font(.system(size: 22, weight: .bold))
            .foregroundStyle(Farbe.rot)
          Text("Öffne die App – dann wird abgegeben und du siehst dein Ergebnis.")
            .font(.subheadline)
            .foregroundStyle(Farbe.text2)
        }
      } else {
        HStack(alignment: .firstTextBaseline, spacing: 5) {
          Text("Frage \(zustand.frage)")
            .font(.system(size: 24, weight: .bold))
            .monospacedDigit()
            .foregroundStyle(.white)
          Text("von \(attribute.gesamt)")
            .font(.subheadline)
            .foregroundStyle(Farbe.text2)
          Spacer(minLength: 0)
          Text("\(max(0, attribute.gesamt - zustand.beantwortet)) offen")
            .font(.subheadline.weight(.semibold))
            .monospacedDigit()
            .foregroundStyle(Farbe.orange)
        }
        ProgressView(value: Double(zustand.beantwortet), total: Double(max(attribute.gesamt, 1)))
          .tint(Farbe.orange)
      }
    }
    .padding(16)
  }
}

/// Restzeit bis zur Frist (läuft von selbst herunter); nach dem Abgeben die gebrauchte Zeit.
struct SimulationZeit: View {
  let attribute: SimulationAttribute
  let zustand: SimulationAttribute.ContentState
  let abgelaufen: Bool

  var body: some View {
    if zustand.fertig, let ende = zustand.ende {
      Text(dauerText(von: attribute.start, bis: ende))
        .monospacedDigit()
    } else if abgelaufen {
      Text("0:00")
        .monospacedDigit()
        .foregroundStyle(Farbe.rot)
    } else {
      Countdown(bis: attribute.frist)
    }
  }
}

struct SimulationLinks: View {
  let attribute: SimulationAttribute
  let zustand: SimulationAttribute.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(zustand.fertig ? "Fehlerpunkte" : "Frage")
        .font(.caption2)
        .foregroundStyle(Farbe.text2)
      if zustand.fertig {
        Text("\(zustand.fehlerpunkte)")
          .font(.title2.weight(.bold))
          .monospacedDigit()
          .foregroundStyle(zustand.bestanden ? Farbe.gruen : Farbe.rot)
      } else {
        Text("\(zustand.frage)/\(attribute.gesamt)")
          .font(.title2.weight(.bold))
          .monospacedDigit()
          .foregroundStyle(.white)
      }
    }
  }
}

struct SimulationFortschritt: View {
  let attribute: SimulationAttribute
  let zustand: SimulationAttribute.ContentState
  let abgelaufen: Bool

  var body: some View {
    if zustand.fertig {
      HStack(spacing: 10) {
        Image(systemName: zustand.bestanden ? "checkmark.seal.fill" : "xmark.seal.fill")
          .font(.title2)
          .foregroundStyle(zustand.bestanden ? Farbe.gruen : Farbe.rot)
        VStack(alignment: .leading, spacing: 1) {
          Text(zustand.bestanden ? "Bestanden" : "Nicht bestanden")
            .font(.headline)
            .foregroundStyle(zustand.bestanden ? Farbe.gruen : Farbe.rot)
          Text("\(zustand.richtig) von \(attribute.gesamt) richtig")
            .font(.caption)
            .foregroundStyle(Farbe.text2)
        }
        Spacer(minLength: 0)
      }
    } else if abgelaufen {
      Text("Zeit abgelaufen – öffne die App für dein Ergebnis.")
        .font(.caption)
        .foregroundStyle(Farbe.rot)
        .frame(maxWidth: .infinity, alignment: .leading)
    } else {
      VStack(spacing: 6) {
        ProgressView(value: Double(zustand.beantwortet), total: Double(max(attribute.gesamt, 1)))
          .tint(Farbe.orange)
        HStack {
          Text("\(zustand.beantwortet) beantwortet")
          Spacer()
          Text("\(max(0, attribute.gesamt - zustand.beantwortet)) offen")
        }
        .font(.caption.monospacedDigit())
        .foregroundStyle(Farbe.text2)
      }
    }
  }
}

struct SimulationKompaktLinks: View {
  let attribute: SimulationAttribute
  let zustand: SimulationAttribute.ContentState

  var body: some View {
    if zustand.fertig {
      SimulationSymbol(zustand: zustand)
    } else {
      Text("\(zustand.frage)/\(attribute.gesamt)")
        .font(.caption.weight(.semibold))
        .monospacedDigit()
        .foregroundStyle(Farbe.orange)
    }
  }
}

struct SimulationKompaktRechts: View {
  let attribute: SimulationAttribute
  let zustand: SimulationAttribute.ContentState
  let abgelaufen: Bool

  var body: some View {
    if zustand.fertig {
      Text("\(zustand.fehlerpunkte) FP")
        .font(.caption.weight(.semibold))
        .monospacedDigit()
        .foregroundStyle(zustand.bestanden ? Farbe.gruen : Farbe.rot)
    } else if abgelaufen {
      Text("0:00")
        .font(.caption.weight(.semibold))
        .monospacedDigit()
        .foregroundStyle(Farbe.rot)
    } else {
      Countdown(bis: attribute.frist)
        .font(.caption.weight(.semibold))
        .frame(width: 50)
        .foregroundStyle(.white)
    }
  }
}

struct SimulationSymbol: View {
  let zustand: SimulationAttribute.ContentState

  var body: some View {
    if zustand.fertig {
      Image(systemName: zustand.bestanden ? "checkmark.seal.fill" : "xmark.seal.fill")
        .foregroundStyle(zustand.bestanden ? Farbe.gruen : Farbe.rot)
    } else {
      Image(systemName: "checklist")
        .foregroundStyle(Farbe.orange)
    }
  }
}

// MARK: - Prüfungstag

struct PruefungstagLive: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PruefungstagAttribute.self) { context in
      PruefungstagSperrbildschirm(termin: context.attributes.termin, hinweis: context.state.hinweis, vorbei: context.isStale)
        .activityBackgroundTint(Farbe.grund)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label("Prüfung", systemImage: "car.fill")
            .font(.caption.weight(.semibold))
            .foregroundStyle(Farbe.orange)
            .padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.attributes.termin, style: .time)
            .font(.caption.weight(.semibold))
            .foregroundStyle(Farbe.text2)
            .padding(.trailing, 6)
        }
        DynamicIslandExpandedRegion(.bottom) {
          PruefungstagMitte(termin: context.attributes.termin, hinweis: context.state.hinweis, vorbei: context.isStale)
            .padding(.horizontal, 6)
        }
      } compactLeading: {
        Image(systemName: "car.fill")
          .foregroundStyle(Farbe.orange)
      } compactTrailing: {
        PruefungstagKompakt(termin: context.attributes.termin, vorbei: context.isStale)
      } minimal: {
        Image(systemName: "car.fill")
          .foregroundStyle(Farbe.orange)
      }
      .keylineTint(Farbe.orange)
    }
  }
}

struct PruefungstagSperrbildschirm: View {
  let termin: Date
  let hinweis: String
  let vorbei: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 6) {
        Image(systemName: "car.fill")
        Text("PRÜFUNGSTAG")
          .font(.caption2.weight(.bold))
          .tracking(0.8)
        Spacer(minLength: 8)
        Text(termin, style: .time)
          .font(.caption.weight(.semibold))
          .foregroundStyle(Farbe.text2)
      }
      .foregroundStyle(Farbe.orange)

      if vorbei {
        Text("Jetzt geht’s los – viel Erfolg!")
          .font(.system(size: 22, weight: .bold))
          .foregroundStyle(.white)
      } else {
        VStack(alignment: .leading, spacing: 0) {
          Text("Theorieprüfung in")
            .font(.subheadline)
            .foregroundStyle(Farbe.text2)
          Countdown(bis: termin, ausrichtung: .leading)
            .font(.system(size: 34, weight: .bold))
            .foregroundStyle(.white)
        }
      }

      Text(hinweis)
        .font(.footnote)
        .foregroundStyle(Farbe.text2)
        .lineLimit(2)
    }
    .padding(16)
  }
}

struct PruefungstagMitte: View {
  let termin: Date
  let hinweis: String
  let vorbei: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      if vorbei {
        Text("Jetzt geht’s los – viel Erfolg!")
          .font(.title3.weight(.bold))
          .foregroundStyle(.white)
      } else {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          Text("noch")
            .font(.subheadline)
            .foregroundStyle(Farbe.text2)
          Countdown(bis: termin, ausrichtung: .leading)
            .font(.system(size: 30, weight: .bold))
            .foregroundStyle(.white)
        }
      }
      Text(hinweis)
        .font(.caption)
        .foregroundStyle(Farbe.text2)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct PruefungstagKompakt: View {
  let termin: Date
  let vorbei: Bool

  var body: some View {
    if vorbei {
      Text("Jetzt")
        .font(.caption.weight(.semibold))
        .foregroundStyle(Farbe.orange)
    } else {
      Countdown(bis: termin)
        .font(.caption.weight(.semibold))
        .frame(width: 58)
        .foregroundStyle(.white)
    }
  }
}
