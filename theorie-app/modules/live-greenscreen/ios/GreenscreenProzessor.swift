import AVFoundation
import CoreImage
import CoreImage.CIFilterBuiltins
import CoreVideo
import Foundation
import LiveKitWebRTC
import QuartzCore
import Vision

/// Greenscreen für das Live: tauscht im gesendeten Kamerabild den Hintergrund aus.
///
/// Läuft als Video-Effekt von react-native-webrtc („ProcessorProvider“) direkt
/// zwischen Kamera und Encoder – die Zuschauer bekommen das fertige Bild. Die
/// Person stellt Vision frei (Personen-Segmentierung), dahinter liegt ein Bild
/// oder ein Video, das immer den ganzen Ausschnitt füllt (nicht skalierbar).
/// Ohne Hintergrund gehen die Kamerabilder unverändert durch.
final class GreenscreenProzessor: NSObject {
  static let shared = GreenscreenProzessor()
  /// Name des Effekts – derselbe steht in src/lib/greenscreen.ts.
  static let effektName = "fahrschul-greenscreen"

  private enum Quelle {
    case bild(CIImage)
    case video(VideoHintergrund)
  }

  private let sperre = NSLock()
  private var quelle: Quelle?
  private(set) var registriert = false

  // Ab hier nur im Kamera-Thread benutzt
  private let kontext = CIContext(options: [.cacheIntermediates: false])
  private let folge = VNSequenceRequestHandler()
  private let anfrage: VNGeneratePersonSegmentationRequest = {
    let r = VNGeneratePersonSegmentationRequest()
    r.qualityLevel = .balanced
    r.outputPixelFormat = kCVPixelFormatType_OneComponent8
    return r
  }()
  private var letzteMaske: CIImage?
  private var aussetzen = false
  private var pool: CVPixelBufferPool?
  private var poolBreite = 0
  private var poolHoehe = 0

  private override init() {
    super.init()
  }

  // MARK: Anmelden bei react-native-webrtc

  /// Meldet den Effekt bei `ProcessorProvider` an. Die Klasse kommt aus
  /// react-native-webrtc und wird zur Laufzeit gesucht – so braucht dieses
  /// Modul deren Header nicht. Doppelt anmelden schadet nicht.
  func registrieren() {
    if registriert { return }
    guard let klasse = NSClassFromString("ProcessorProvider") else { return }
    _ = (klasse as AnyObject).perform(NSSelectorFromString("addProcessor:forName:"), with: self, with: GreenscreenProzessor.effektName as NSString)
    registriert = true
  }

  // MARK: Hintergrund wählen

  func setzeBild(_ uri: String) -> Bool {
    guard let url = Self.dateiUrl(uri), let roh = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]) else { return false }
    // Große Fotos einmal verkleinern und fertig rechnen – sonst wäre jedes Videobild teuer.
    let e = roh.extent
    guard e.width > 0, e.height > 0 else { return false }
    let faktor = min(1, 1920 / max(e.width, e.height))
    let klein = roh.transformed(by: CGAffineTransform(translationX: -e.origin.x, y: -e.origin.y).concatenating(CGAffineTransform(scaleX: faktor, y: faktor)))
    guard let cg = CIContext().createCGImage(klein, from: klein.extent) else { return false }
    setze(.bild(CIImage(cgImage: cg)))
    return true
  }

  /// Muss auf dem Hauptthread laufen (AVPlayer).
  func setzeVideo(_ uri: String) -> Bool {
    guard let url = Self.dateiUrl(uri) else { return false }
    setze(.video(VideoHintergrund(url: url)))
    return true
  }

  func entfernen() {
    setze(nil)
  }

  private func setze(_ neu: Quelle?) {
    registrieren()
    sperre.lock()
    let alt = quelle
    quelle = neu
    sperre.unlock()
    if case let .video(v)? = alt { v.stoppen() }
  }

  private static func dateiUrl(_ uri: String) -> URL? {
    if uri.hasPrefix("/") { return URL(fileURLWithPath: uri) }
    return URL(string: uri)
  }

  // MARK: Videobilder – react-native-webrtc ruft das für jedes Kamerabild auf

  @objc(capturer:didCaptureVideoFrame:)
  func verarbeiten(_ capturer: LKRTCVideoCapturer, bild frame: LKRTCVideoFrame) -> LKRTCVideoFrame {
    sperre.lock()
    let aktuell = quelle
    sperre.unlock()
    guard let aktuell, let kamera = frame.buffer as? LKRTCCVPixelBuffer else {
      letzteMaske = nil
      return frame
    }
    return autoreleasepool { zusammensetzen(frame, kamera.pixelBuffer, aktuell) ?? frame }
  }

  private func zusammensetzen(_ frame: LKRTCVideoFrame, _ eingang: CVPixelBuffer, _ quelle: Quelle) -> LKRTCVideoFrame? {
    // Die Kamera liefert quer; die nötige Drehung steht im Bild. Hier aufrecht drehen,
    // damit Vision die Person richtig erkennt und der Hintergrund aufrecht liegt.
    let gedreht = CIImage(cvPixelBuffer: eingang).oriented(Self.orientierung(Int(frame.rotation.rawValue)))
    let kamera = gedreht.transformed(by: CGAffineTransform(translationX: -gedreht.extent.origin.x, y: -gedreht.extent.origin.y))
    let rahmen = CGRect(origin: .zero, size: kamera.extent.size)
    guard rahmen.width >= 16, rahmen.height >= 16 else { return nil }

    // Person freistellen. Dauert es zu lange, beim nächsten Bild die letzte Maske nehmen.
    var maske = letzteMaske
    if !aussetzen || maske == nil {
      let start = CACurrentMediaTime()
      if (try? folge.perform([anfrage], on: kamera)) != nil, let ergebnis = anfrage.results?.first {
        maske = CIImage(cvPixelBuffer: ergebnis.pixelBuffer)
      }
      aussetzen = CACurrentMediaTime() - start > 0.028
    } else {
      aussetzen = false
    }
    guard let maske else { return nil }
    letzteMaske = maske

    // Maske auf Bildgröße ziehen und die Kante weich machen
    let me = maske.extent
    let weich = maske
      .transformed(by: CGAffineTransform(scaleX: rahmen.width / me.width, y: rahmen.height / me.height))
      .clampedToExtent()
      .applyingGaussianBlur(sigma: 2)
      .cropped(to: rahmen)

    guard let hintergrund = hintergrundBild(quelle, rahmen.size) else { return nil }
    let mischen = CIFilter.blendWithRedMask()
    mischen.inputImage = kamera
    mischen.backgroundImage = hintergrund
    mischen.maskImage = weich
    guard let fertig = mischen.outputImage?.cropped(to: rahmen), let ausgang = puffer(rahmen.size) else { return nil }
    kontext.render(fertig, to: ausgang)

    // Das neue Bild ist schon aufrecht – also ohne Drehung weitergeben.
    let ohneDrehung = type(of: frame.rotation).init(rawValue: 0) ?? frame.rotation
    return LKRTCVideoFrame(buffer: LKRTCCVPixelBuffer(pixelBuffer: ausgang), rotation: ohneDrehung, timeStampNs: frame.timeStampNs)
  }

  private func hintergrundBild(_ quelle: Quelle, _ groesse: CGSize) -> CIImage? {
    switch quelle {
    case let .bild(b):
      return Self.fuellen(b, groesse)
    case let .video(v):
      guard let b = v.aktuellesBild() else { return nil }
      return Self.fuellen(b, groesse)
    }
  }

  /// Füllt den ganzen Ausschnitt mittig (wie „cover“).
  private static func fuellen(_ bild: CIImage, _ groesse: CGSize) -> CIImage {
    let e = bild.extent
    let s = max(groesse.width / e.width, groesse.height / e.height)
    let x = (groesse.width - e.width * s) / 2
    let y = (groesse.height - e.height * s) / 2
    let t = CGAffineTransform(translationX: -e.origin.x, y: -e.origin.y)
      .concatenating(CGAffineTransform(scaleX: s, y: s))
      .concatenating(CGAffineTransform(translationX: x, y: y))
    return bild.transformed(by: t).cropped(to: CGRect(origin: .zero, size: groesse))
  }

  /// Drehung aus WebRTC (Grad im Uhrzeigersinn) → Ausrichtung für Core Image.
  private static func orientierung(_ grad: Int) -> CGImagePropertyOrientation {
    switch grad {
    case 90: return .right
    case 180: return .down
    case 270: return .left
    default: return .up
    }
  }

  private func puffer(_ groesse: CGSize) -> CVPixelBuffer? {
    let breite = Int(groesse.width)
    let hoehe = Int(groesse.height)
    if pool == nil || breite != poolBreite || hoehe != poolHoehe {
      let attribute: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: breite,
        kCVPixelBufferHeightKey as String: hoehe,
        kCVPixelBufferIOSurfacePropertiesKey as String: [String: Any](),
        kCVPixelBufferMetalCompatibilityKey as String: true,
      ]
      var neu: CVPixelBufferPool?
      CVPixelBufferPoolCreate(kCFAllocatorDefault, nil, attribute as CFDictionary, &neu)
      pool = neu
      poolBreite = breite
      poolHoehe = hoehe
    }
    guard let pool else { return nil }
    var ergebnis: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &ergebnis)
    return ergebnis
  }
}

/// Video als Hintergrund: läuft stumm in Schleife und liefert das jeweils aktuelle Bild.
final class VideoHintergrund {
  private let spieler: AVPlayer
  private let ausgabe: AVPlayerItemVideoOutput
  private let ausrichtung: CGImagePropertyOrientation
  private let sperre = NSLock()
  private var letztes: CIImage?
  private var beobachter: NSObjectProtocol?

  init(url: URL) {
    let asset = AVURLAsset(url: url)
    let element = AVPlayerItem(asset: asset)
    let ausgabe = AVPlayerItemVideoOutput(pixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    element.add(ausgabe)
    let spieler = AVPlayer(playerItem: element)
    spieler.isMuted = true
    spieler.actionAtItemEnd = .none
    spieler.preventsDisplaySleepDuringVideoPlayback = false
    self.ausgabe = ausgabe
    self.spieler = spieler
    self.ausrichtung = VideoHintergrund.ausrichtungAus(asset.tracks(withMediaType: .video).first?.preferredTransform ?? .identity)
    // Am Ende von vorn – ohne Pause, damit der Hintergrund nie stehen bleibt
    beobachter = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: element, queue: .main) { [weak spieler] _ in
      spieler?.seek(to: .zero)
      spieler?.play()
    }
    spieler.play()
  }

  func aktuellesBild() -> CIImage? {
    let zeit = ausgabe.itemTime(forHostTime: CACurrentMediaTime())
    if ausgabe.hasNewPixelBuffer(forItemTime: zeit), let pb = ausgabe.copyPixelBuffer(forItemTime: zeit, itemTimeForDisplay: nil) {
      let b = CIImage(cvPixelBuffer: pb).oriented(ausrichtung)
      sperre.lock()
      letztes = b
      sperre.unlock()
      return b
    }
    sperre.lock()
    defer { sperre.unlock() }
    return letztes
  }

  func stoppen() {
    spieler.pause()
    if let b = beobachter { NotificationCenter.default.removeObserver(b) }
    beobachter = nil
  }

  /// Hochkant gefilmte Videos tragen ihre Drehung als Transform.
  private static func ausrichtungAus(_ t: CGAffineTransform) -> CGImagePropertyOrientation {
    if t.a == 0 && t.b == 1 && t.c == -1 && t.d == 0 { return .right }
    if t.a == 0 && t.b == -1 && t.c == 1 && t.d == 0 { return .left }
    if t.a == -1 && t.b == 0 && t.c == 0 && t.d == -1 { return .down }
    return .up
  }
}
