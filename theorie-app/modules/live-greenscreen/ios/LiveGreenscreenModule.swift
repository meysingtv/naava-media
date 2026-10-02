import ExpoModulesCore

/// Brücke für den Greenscreen im Live (nur iPhone): Hintergrund setzen oder
/// entfernen. Eingeschaltet wird der Effekt in JavaScript an der Kameraspur
/// (`_setVideoEffects` von react-native-webrtc).
public class LiveGreenscreenModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveGreenscreen")

    OnCreate {
      GreenscreenProzessor.shared.registrieren()
    }

    Function("verfuegbar") { () -> Bool in
      GreenscreenProzessor.shared.registrieren()
      return GreenscreenProzessor.shared.registriert
    }

    AsyncFunction("setzeBild") { (uri: String) -> Bool in
      return GreenscreenProzessor.shared.setzeBild(uri)
    }.runOnQueue(.main)

    AsyncFunction("setzeVideo") { (uri: String) -> Bool in
      return GreenscreenProzessor.shared.setzeVideo(uri)
    }.runOnQueue(.main)

    Function("entfernen") {
      GreenscreenProzessor.shared.entfernen()
    }
  }
}
