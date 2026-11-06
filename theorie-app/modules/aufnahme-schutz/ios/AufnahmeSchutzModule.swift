import ExpoModulesCore
import UIKit

/// Sperre gegen Bildschirmaufnahmen auf dem iPhone: Sobald eine Aufnahme (oder
/// Bildschirmspiegelung) erkannt wird, liegt ein eigenes, undurchsichtiges
/// Fenster über der ganzen App – auch über Modals und Vollbild-Seiten. Das
/// Fenster ist Teil der Aufnahme, dort ist also nur diese Fläche zu sehen.
///
/// Wichtig: Öffnet man während der Aufnahme das Menü an der Dynamic Island,
/// meldet iOS „keine Aufnahme“, obwohl sie weiterläuft. Die Fläche geht
/// deshalb nie von selbst weg: Ist keine Aufnahme mehr gemeldet, erscheint ein
/// „Weiter“-Knopf. Ein Tippen bei offenem Menü schließt nur das Menü (dann
/// meldet iOS wieder „Aufnahme“). Kam die App aus dem Hintergrund zurück und
/// läuft nichts, verschwindet die Fläche ohne Tippen.
///
/// Erkennung über `UIScreen.isCaptured` – per Mitteilung und alle 0,3 s.
public class AufnahmeSchutzModule: Module {
  private var schutzAn = false
  private var zuletzt = false
  private var fenster: UIWindow?
  private var titelText: UILabel?
  private var hinweisText: UILabel?
  private var weiterKnopf: UIButton?
  private var timer: Timer?
  private var beobachter: [NSObjectProtocol] = []
  /// War die App seit dem Einblenden im Hintergrund? Dann darf die Fläche ohne Tippen weg.
  private var warImHintergrund = false
  /// Nach „Weiter“ wird kurz gewartet, ob die Aufnahme nicht doch noch läuft.
  private var weiterPruefung = false

  public func definition() -> ModuleDefinition {
    Name("AufnahmeSchutz")

    Events("onAufnahme")

    /// Schutz an (normale Nutzer) oder aus (Inhaber).
    AsyncFunction("setzen") { (an: Bool) in
      self.schutzAn = an
      if an {
        self.beobachten()
      } else {
        self.aufhoeren()
      }
      self.pruefen()
    }.runOnQueue(.main)

    AsyncFunction("laeuft") { () -> Bool in
      return AufnahmeSchutzModule.wirdAufgenommen()
    }.runOnQueue(.main)

    /// Zuletzt abgefangene Ausnahme eines nativen Moduls (siehe AusnahmeFang.m) – einmal abholen.
    Function("letzteAusnahme") { () -> String? in
      let schluessel = "fahrschulpro.letzteAusnahme"
      let text = UserDefaults.standard.string(forKey: schluessel)
      if text != nil {
        UserDefaults.standard.removeObject(forKey: schluessel)
      }
      return text
    }

    OnDestroy {
      DispatchQueue.main.async { [weak self] in
        self?.aufhoeren()
        self?.verbergen()
      }
    }
  }

  static func appAktiv() -> Bool {
    return UIApplication.shared.applicationState == .active
  }

  static func wirdAufgenommen() -> Bool {
    // Bewusst nur isCaptured (seit iOS 11): neuere APIs sind je nach SDK
    // unterschiedlich verfügbar und können den Build scheitern lassen.
    return UIScreen.main.isCaptured
  }

  private func beobachten() {
    if beobachter.isEmpty {
      let zentrale = NotificationCenter.default
      beobachter.append(zentrale.addObserver(forName: UIScreen.capturedDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
        self?.pruefen()
      })
      beobachter.append(zentrale.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
        if self?.fenster != nil {
          self?.warImHintergrund = true
        }
      })
      beobachter.append(zentrale.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
        self?.pruefen()
      })
    }
    if timer == nil {
      let t = Timer(timeInterval: 0.3, repeats: true) { [weak self] _ in
        self?.pruefen()
      }
      RunLoop.main.add(t, forMode: .common)
      timer = t
    }
  }

  private func aufhoeren() {
    for b in beobachter {
      NotificationCenter.default.removeObserver(b)
    }
    beobachter.removeAll()
    timer?.invalidate()
    timer = nil
  }

  private func pruefen() {
    let laeuft = AufnahmeSchutzModule.wirdAufgenommen()
    if laeuft != zuletzt {
      zuletzt = laeuft
      sendEvent("onAufnahme", ["aktiv": laeuft])
    }
    if !schutzAn {
      verbergen()
      return
    }
    if laeuft {
      zeigen()
      hinweisSetzen(aufnahmeLaeuft: true)
      return
    }
    // Keine Aufnahme gemeldet – die Fläche bleibt trotzdem (siehe oben).
    guard fenster != nil else { return }
    if warImHintergrund && AufnahmeSchutzModule.appAktiv() {
      verbergen()
      return
    }
    if !weiterPruefung {
      hinweisSetzen(aufnahmeLaeuft: false)
    }
  }

  /// „Weiter“ getippt. Ein Tippen bei offenem Menü an der Dynamic Island geht
  /// auch an die App und schließt das Menü – danach meldet iOS wieder
  /// „Aufnahme“. Darum erst 1,5 s abwarten und dann nochmal prüfen.
  private func weiterGetippt() {
    if weiterPruefung { return }
    if AufnahmeSchutzModule.wirdAufgenommen() {
      hinweisSetzen(aufnahmeLaeuft: true)
      return
    }
    weiterPruefung = true
    titelText?.text = "Einen Moment …"
    hinweisText?.text = "Wir prüfen, ob die Aufnahme wirklich beendet ist."
    weiterKnopf?.isHidden = true
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
      guard let selbst = self else { return }
      selbst.weiterPruefung = false
      if selbst.fenster == nil { return }
      let laeuft = AufnahmeSchutzModule.wirdAufgenommen()
      if !laeuft && AufnahmeSchutzModule.appAktiv() {
        selbst.verbergen()
      } else {
        selbst.hinweisSetzen(aufnahmeLaeuft: laeuft)
      }
    }
  }

  private func hinweisSetzen(aufnahmeLaeuft: Bool) {
    if aufnahmeLaeuft {
      titelText?.text = "Bildschirmaufnahme nicht erlaubt"
      hinweisText?.text = "Beende die Aufnahme, dann geht es weiter."
      weiterKnopf?.isHidden = true
    } else {
      titelText?.text = "Aufnahme beendet?"
      hinweisText?.text = "Tippe auf „Weiter“, um zur App zurückzukehren."
      weiterKnopf?.isHidden = false
    }
  }

  private func zeigen() {
    if fenster != nil { return }
    let szenen = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    guard let szene = szenen.first(where: { $0.activationState == .foregroundActive }) ?? szenen.first else { return }

    let neu = UIWindow(windowScene: szene)
    neu.windowLevel = UIWindow.Level(rawValue: UIWindow.Level.alert.rawValue + 50)
    // Komplett undurchsichtig: In der Aufnahme ist nichts von der App zu sehen.
    neu.backgroundColor = UIColor(red: 7 / 255, green: 9 / 255, blue: 12 / 255, alpha: 1)

    let inhalt = UIViewController()
    inhalt.view.backgroundColor = UIColor(red: 7 / 255, green: 9 / 255, blue: 12 / 255, alpha: 1)

    let symbol = UIImageView(image: UIImage(systemName: "eye.slash.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 34, weight: .semibold)))
    symbol.tintColor = .white

    let titel = UILabel()
    titel.font = .systemFont(ofSize: 20, weight: .bold)
    titel.textColor = .white
    titel.textAlignment = .center
    titel.numberOfLines = 0

    let text = UILabel()
    text.font = .systemFont(ofSize: 15, weight: .medium)
    text.textColor = UIColor(white: 1, alpha: 0.8)
    text.textAlignment = .center
    text.numberOfLines = 0

    var aussehen = UIButton.Configuration.filled()
    aussehen.title = "Weiter"
    aussehen.baseBackgroundColor = UIColor(red: 252 / 255, green: 91 / 255, blue: 14 / 255, alpha: 1)
    aussehen.baseForegroundColor = .white
    aussehen.cornerStyle = .capsule
    aussehen.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 32, bottom: 12, trailing: 32)
    let knopf = UIButton(configuration: aussehen, primaryAction: UIAction { [weak self] _ in
      self?.weiterGetippt()
    })
    knopf.isHidden = true

    let stapel = UIStackView(arrangedSubviews: [symbol, titel, text, knopf])
    stapel.axis = .vertical
    stapel.alignment = .center
    stapel.spacing = 12
    stapel.setCustomSpacing(22, after: text)
    stapel.translatesAutoresizingMaskIntoConstraints = false
    inhalt.view.addSubview(stapel)
    NSLayoutConstraint.activate([
      stapel.centerXAnchor.constraint(equalTo: inhalt.view.centerXAnchor),
      stapel.centerYAnchor.constraint(equalTo: inhalt.view.centerYAnchor),
      stapel.leadingAnchor.constraint(greaterThanOrEqualTo: inhalt.view.leadingAnchor, constant: 32),
      stapel.trailingAnchor.constraint(lessThanOrEqualTo: inhalt.view.trailingAnchor, constant: -32),
    ])

    neu.rootViewController = inhalt
    neu.isHidden = false
    fenster = neu
    titelText = titel
    hinweisText = text
    weiterKnopf = knopf
    warImHintergrund = false
  }

  private func verbergen() {
    guard let alt = fenster else { return }
    alt.isHidden = true
    alt.rootViewController = nil
    fenster = nil
    titelText = nil
    hinweisText = nil
    weiterKnopf = nil
    warImHintergrund = false
    weiterPruefung = false
  }
}
