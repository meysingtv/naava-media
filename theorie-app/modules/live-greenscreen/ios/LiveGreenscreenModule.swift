import CoreGraphics
import ExpoModulesCore

/// Lage des Kamera-Kreises aus JS (Punkte der Bühne des Gastgebers).
struct ZweitkameraLage: Record {
  @Field var an: Bool = false
  @Field var tausch: Bool = false
  @Field var weich: Bool = false
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var d: Double = 0
  @Field var breite: Double = 1
  @Field var hoehe: Double = 1
}

/// Brücke für die Kamera-Effekte im Live (nur iPhone): Greenscreen (Hintergrund
/// setzen oder entfernen) und die zweite Kamera im Kreis. Eingeschaltet werden
/// die Effekte in JavaScript an der Kameraspur (`_setVideoEffects` von
/// react-native-webrtc).
public class LiveGreenscreenModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveGreenscreen")

    OnCreate {
      GreenscreenProzessor.shared.registrieren()
      ZweitkameraProzessor.shared.registrieren()
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

    // Zweite Kamera: geht nur auf iPhones mit Multi-Cam (ab XS/XR).
    Function("zweiKameras") { () -> Bool in
      ZweitkameraProzessor.shared.registrieren()
      return ZweitkameraProzessor.moeglich && ZweitkameraProzessor.shared.registriert
    }

    Function("zweitkameraSetzen") { (lage: ZweitkameraLage) in
      ZweitkameraProzessor.shared.setzen(
        an: lage.an,
        tausch: lage.tausch,
        weich: lage.weich,
        lage: ZweitkameraProzessor.Lage(x: CGFloat(lage.x), y: CGFloat(lage.y), d: CGFloat(lage.d), breite: CGFloat(lage.breite), hoehe: CGFloat(lage.hoehe))
      )
    }

    Function("zweitkameraAus") {
      ZweitkameraProzessor.shared.aus()
    }
  }
}
