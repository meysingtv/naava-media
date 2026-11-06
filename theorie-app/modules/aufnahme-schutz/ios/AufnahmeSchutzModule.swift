import ExpoModulesCore
import UIKit

/// Sperre gegen Bildschirmaufnahmen auf dem iPhone: Läuft eine Aufnahme (oder
/// wird der Bildschirm gespiegelt), liegt ein eigenes Fenster mit starker
/// Unschärfe über der ganzen App – auch über Modals und Vollbild-Seiten. Das
/// Fenster ist Teil der Aufnahme, dort ist also nur die Unschärfe zu sehen.
///
/// Erkennung über `UIScreen.isCaptured`. Zusätzlich zur Mitteilung von iOS
/// wird jede Sekunde nachgesehen, damit nichts verpasst wird.
public class AufnahmeSchutzModule: Module {
  private var schutzAn = false
  private var zuletzt = false
  private var fenster: UIWindow?
  private var timer: Timer?
  private var beobachter: NSObjectProtocol?

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

  static func wirdAufgenommen() -> Bool {
    // Bewusst nur isCaptured (seit iOS 11): neuere APIs sind je nach SDK
    // unterschiedlich verfügbar und können den Build scheitern lassen.
    return UIScreen.main.isCaptured
  }

  private func beobachten() {
    if beobachter == nil {
      beobachter = NotificationCenter.default.addObserver(
        forName: UIScreen.capturedDidChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.pruefen()
      }
    }
    if timer == nil {
      let t = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
        self?.pruefen()
      }
      RunLoop.main.add(t, forMode: .common)
      timer = t
    }
  }

  private func aufhoeren() {
    if let b = beobachter {
      NotificationCenter.default.removeObserver(b)
      beobachter = nil
    }
    timer?.invalidate()
    timer = nil
  }

  private func pruefen() {
    let laeuft = AufnahmeSchutzModule.wirdAufgenommen()
    if laeuft != zuletzt {
      zuletzt = laeuft
      sendEvent("onAufnahme", ["aktiv": laeuft])
    }
    if schutzAn && laeuft {
      zeigen()
    } else {
      verbergen()
    }
  }

  private func zeigen() {
    if fenster != nil { return }
    let szenen = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    guard let szene = szenen.first(where: { $0.activationState == .foregroundActive }) ?? szenen.first else { return }

    let neu = UIWindow(windowScene: szene)
    neu.windowLevel = UIWindow.Level(rawValue: UIWindow.Level.alert.rawValue + 50)
    neu.backgroundColor = .clear

    let inhalt = UIViewController()
    inhalt.view.backgroundColor = .clear

    let unschaerfe = UIVisualEffectView(effect: UIBlurEffect(style: .systemThickMaterialDark))
    unschaerfe.frame = inhalt.view.bounds
    unschaerfe.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    inhalt.view.addSubview(unschaerfe)

    let abdunkeln = UIView(frame: inhalt.view.bounds)
    abdunkeln.backgroundColor = UIColor(white: 0, alpha: 0.35)
    abdunkeln.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    inhalt.view.addSubview(abdunkeln)

    let symbol = UIImageView(image: UIImage(systemName: "eye.slash.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 34, weight: .semibold)))
    symbol.tintColor = .white

    let titel = UILabel()
    titel.text = "Bildschirmaufnahme nicht erlaubt"
    titel.font = .systemFont(ofSize: 20, weight: .bold)
    titel.textColor = .white
    titel.textAlignment = .center
    titel.numberOfLines = 0

    let text = UILabel()
    text.text = "Beende die Aufnahme, dann geht es weiter."
    text.font = .systemFont(ofSize: 15, weight: .medium)
    text.textColor = UIColor(white: 1, alpha: 0.8)
    text.textAlignment = .center
    text.numberOfLines = 0

    let stapel = UIStackView(arrangedSubviews: [symbol, titel, text])
    stapel.axis = .vertical
    stapel.alignment = .center
    stapel.spacing = 10
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
  }

  private func verbergen() {
    guard let alt = fenster else { return }
    alt.isHidden = true
    alt.rootViewController = nil
    fenster = nil
  }
}
