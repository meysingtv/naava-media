import AVFoundation
import CoreImage
import CoreImage.CIFilterBuiltins
import CoreVideo
import Foundation
import LiveKitWebRTC
import QuartzCore

/// Zweite Kamera im Live: Die eine Kamera füllt das Bild, die andere liegt als
/// runder Kreis darüber (wie „Dual“ bei TikTok). Gerechnet wird direkt vor dem
/// Senden als Video-Effekt von react-native-webrtc – die Zuschauer bekommen ein
/// fertiges Bild, auf jedem Gerät gleich.
///
/// LiveKits WebRTC nutzt auf iPhones mit Multi-Cam (ab XS/XR) eine gemeinsame
/// `AVCaptureMultiCamSession`. In diese hängt sich die zweite Kamera mit eigenem
/// Eingang und Ausgang – die Kamera des Lives läuft unverändert weiter.
final class ZweitkameraProzessor: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  static let shared = ZweitkameraProzessor()
  /// Name des Effekts – derselbe steht in src/lib/zweitkamera.ts.
  static let effektName = "fahrschul-zweitkamera"

  /// Kreis in Punkten der Bühne des Gastgebers (Ursprung oben links). Das Video
  /// liegt dort wie „cover“ – daraus wird die Lage im Bild berechnet.
  struct Lage {
    var x: CGFloat
    var y: CGFloat
    var d: CGFloat
    var breite: CGFloat
    var hoehe: CGFloat
  }

  static var moeglich: Bool {
    AVCaptureMultiCamSession.isMultiCamSupported
  }

  private(set) var registriert = false

  // Zustand von JS (unter `sperre`)
  private let sperre = NSLock()
  private var an = false
  private var tausch = false
  private var weich = false
  private var ziel = Lage(x: 100, y: 200, d: 160, breite: 390, hoehe: 844)
  private var aktuell: Lage?
  private var zweitBild: CIImage?
  private var zweitZeit: CFTimeInterval = 0
  private var richtetEin = false
  private var eingerichtet = false

  // Sitzung – nur auf `warteschlange`
  private let warteschlange = DispatchQueue(label: "de.spur.theorie.zweitkamera.sitzung")
  private let bildSchlange = DispatchQueue(label: "de.spur.theorie.zweitkamera.bilder")
  private weak var sitzung: AVCaptureSession?
  private var eingang: AVCaptureDeviceInput?
  private var ausgang: AVCaptureVideoDataOutput?
  private var verbindung: AVCaptureConnection?

  // Bild – nur im Kamera-Thread
  private let kontext = CIContext(options: [.cacheIntermediates: false])
  private var pool: CVPixelBufferPool?
  private var poolBreite = 0
  private var poolHoehe = 0

  private override init() {
    super.init()
  }

  /// Meldet den Effekt bei `ProcessorProvider` (react-native-webrtc) an – zur
  /// Laufzeit gesucht, wie beim Greenscreen. Doppelt anmelden schadet nicht.
  func registrieren() {
    if registriert { return }
    guard let klasse = NSClassFromString("ProcessorProvider") else { return }
    _ = (klasse as AnyObject).perform(NSSelectorFromString("addProcessor:forName:"), with: self, with: ZweitkameraProzessor.effektName as NSString)
    registriert = true
  }

  // MARK: Steuerung aus JS

  /// `weich`: zur neuen Lage gleiten (Bühne wird kleiner/größer), sonst sofort (Finger).
  func setzen(an neuAn: Bool, tausch neuTausch: Bool, weich neuWeich: Bool, lage: Lage) {
    registrieren()
    sperre.lock()
    let warAn = an
    an = neuAn
    tausch = neuTausch
    weich = neuWeich
    ziel = lage
    if !neuAn {
      aktuell = nil
      zweitBild = nil
    }
    sperre.unlock()
    if warAn && !neuAn { abbauen() }
  }

  func aus() {
    sperre.lock()
    let warAn = an
    an = false
    aktuell = nil
    zweitBild = nil
    sperre.unlock()
    if warAn { abbauen() }
  }

  // MARK: Videobilder der Live-Kamera

  @objc(capturer:didCaptureVideoFrame:)
  func verarbeiten(_ capturer: LKRTCVideoCapturer, bild frame: LKRTCVideoFrame) -> LKRTCVideoFrame {
    sperre.lock()
    let istAn = an
    let mitTausch = tausch
    var lage = ziel
    if istAn, let alt = aktuell {
      lage = weich ? Self.naeher(alt, ziel, 0.22) : ziel
    }
    if istAn { aktuell = lage }
    let zweit = zweitBild
    let frisch = CACurrentMediaTime() - zweitZeit < 0.6
    let einrichten = istAn && !eingerichtet && !richtetEin
    if einrichten { richtetEin = true }
    sperre.unlock()

    // Die zweite Kamera beim ersten Bild in die Sitzung des Lives hängen.
    if einrichten {
      let gefunden: AVCaptureSession? = (capturer as? LKRTCCameraVideoCapturer)?.captureSession
      if let s = gefunden {
        warteschlange.async { self.aufbauen(s) }
      } else {
        sperre.lock()
        richtetEin = false
        sperre.unlock()
      }
    }

    guard istAn, frisch, let zweit, let puffer = frame.buffer as? LKRTCCVPixelBuffer else { return frame }
    return autoreleasepool { zusammensetzen(frame, puffer.pixelBuffer, zweit, lage, mitTausch) ?? frame }
  }

  // MARK: Zweite Kamera ein- und aushängen

  private func aufbauen(_ s: AVCaptureSession) {
    defer {
      sperre.lock()
      richtetEin = false
      sperre.unlock()
    }
    guard let multi = s as? AVCaptureMultiCamSession, AVCaptureMultiCamSession.isMultiCamSupported, eingang == nil else { return }

    // Welche Kamera nutzt das Live? Die andere kommt in den Kreis.
    let belegt = multi.inputs.compactMap { ($0 as? AVCaptureDeviceInput)?.device }.filter { $0.hasMediaType(.video) }
    let seite: AVCaptureDevice.Position = belegt.contains { $0.position == .front } ? .back : .front
    guard let geraet = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: seite), !belegt.contains(geraet) else { return }

    // Ein Format, das mit mehreren Kameras geht – möglichst nah an 640 × 480.
    let passend = geraet.formats.filter { $0.isMultiCamSupported }
    guard let format = passend.min(by: { Self.abstand($0) < Self.abstand($1) }) else { return }
    do {
      try geraet.lockForConfiguration()
      geraet.activeFormat = format
      if format.videoSupportedFrameRateRanges.contains(where: { $0.minFrameRate <= 24 && $0.maxFrameRate >= 24 }) {
        geraet.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 24)
        geraet.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 24)
      }
      geraet.unlockForConfiguration()
    } catch {
      return
    }

    guard let neuEingang = try? AVCaptureDeviceInput(device: geraet) else { return }
    let neuAusgang = AVCaptureVideoDataOutput()
    neuAusgang.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
    neuAusgang.alwaysDiscardsLateVideoFrames = true
    neuAusgang.setSampleBufferDelegate(self, queue: bildSchlange)

    multi.beginConfiguration()
    guard multi.canAddInput(neuEingang), multi.canAddOutput(neuAusgang) else {
      multi.commitConfiguration()
      return
    }
    multi.addInputWithNoConnections(neuEingang)
    multi.addOutputWithNoConnections(neuAusgang)
    guard let port = neuEingang.ports.first(where: { $0.mediaType == .video }) else {
      multi.removeOutput(neuAusgang)
      multi.removeInput(neuEingang)
      multi.commitConfiguration()
      return
    }
    let neuVerbindung = AVCaptureConnection(inputPorts: [port], output: neuAusgang)
    guard multi.canAddConnection(neuVerbindung) else {
      multi.removeOutput(neuAusgang)
      multi.removeInput(neuEingang)
      multi.commitConfiguration()
      return
    }
    multi.addConnection(neuVerbindung)
    // Wie die Kamera des Lives: ungespiegelt, Drehung kommt beim Zusammensetzen.
    if neuVerbindung.isVideoMirroringSupported {
      neuVerbindung.automaticallyAdjustsVideoMirroring = false
      neuVerbindung.isVideoMirrored = false
    }
    multi.commitConfiguration()

    // Schafft die Hardware zwei Kameras in diesen Formaten nicht: wieder weg.
    if multi.hardwareCost > 1.0 {
      multi.beginConfiguration()
      multi.removeConnection(neuVerbindung)
      multi.removeOutput(neuAusgang)
      multi.removeInput(neuEingang)
      multi.commitConfiguration()
      return
    }

    sitzung = multi
    eingang = neuEingang
    ausgang = neuAusgang
    verbindung = neuVerbindung
    sperre.lock()
    eingerichtet = true
    let nochAn = an
    sperre.unlock()
    // In der Zwischenzeit ausgeschaltet?
    if !nochAn { abbauenJetzt() }
  }

  private func abbauen() {
    warteschlange.async { self.abbauenJetzt() }
  }

  /// Nur auf `warteschlange`.
  private func abbauenJetzt() {
    if let s = sitzung {
      s.beginConfiguration()
      if let v = verbindung, s.connections.contains(v) { s.removeConnection(v) }
      if let a = ausgang, s.outputs.contains(a) { s.removeOutput(a) }
      if let e = eingang, s.inputs.contains(e) { s.removeInput(e) }
      s.commitConfiguration()
    }
    ausgang?.setSampleBufferDelegate(nil, queue: nil)
    sitzung = nil
    eingang = nil
    ausgang = nil
    verbindung = nil
    sperre.lock()
    eingerichtet = false
    zweitBild = nil
    sperre.unlock()
  }

  private static func abstand(_ f: AVCaptureDevice.Format) -> Int32 {
    let d = CMVideoFormatDescriptionGetDimensions(f.formatDescription)
    return abs(d.width - 640) + abs(d.height - 480)
  }

  // Bilder der zweiten Kamera: nur das jeweils neueste behalten.
  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard let pb = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    let bild = CIImage(cvPixelBuffer: pb)
    sperre.lock()
    if an {
      zweitBild = bild
      zweitZeit = CACurrentMediaTime()
    }
    sperre.unlock()
  }

  // MARK: Zusammensetzen

  private func zusammensetzen(_ frame: LKRTCVideoFrame, _ eingangsPuffer: CVPixelBuffer, _ zweitRoh: CIImage, _ lage: Lage, _ mitTausch: Bool) -> LKRTCVideoFrame? {
    // Beide Kameras aufrecht drehen. Hochkant drehen beide gleich, quer liegen sie 180° auseinander.
    let grad = Int(frame.rotation.rawValue)
    let haupt = Self.aufrecht(CIImage(cvPixelBuffer: eingangsPuffer), grad)
    let zweit = Self.aufrecht(zweitRoh, grad == 0 || grad == 180 ? (grad + 180) % 360 : grad)
    let rahmen = CGRect(origin: .zero, size: haupt.extent.size)
    guard rahmen.width >= 16, rahmen.height >= 16, zweit.extent.width >= 4, zweit.extent.height >= 4 else { return nil }

    let gross = mitTausch ? Self.fuellen(zweit, rahmen.size) : haupt
    let klein = mitTausch ? haupt : zweit

    // Bühne (Punkte) → Bild (Pixel): Das Video liegt beim Gastgeber wie „cover“.
    let breite = max(lage.breite, 1)
    let hoehe = max(lage.hoehe, 1)
    let s = max(breite / rahmen.width, hoehe / rahmen.height)
    let ox = (rahmen.width * s - breite) / 2
    let oy = (rahmen.height * s - hoehe) / 2
    let r = min(max(lage.d / 2 / s, rahmen.width * 0.06), rahmen.width * 0.48)
    let cx = min(max((lage.x + ox) / s, r), rahmen.width - r)
    let cyOben = min(max((lage.y + oy) / s, r), rahmen.height - r)
    // Core Image zählt von unten.
    let mitte = CGPoint(x: cx, y: rahmen.height - cyOben)

    let seite = 2 * r
    let rund = Self.fuellen(klein, CGSize(width: seite, height: seite))
      .transformed(by: CGAffineTransform(translationX: mitte.x - r, y: mitte.y - r))
    let rand = max(2, seite * 0.022)

    // Weicher Schatten, weißer Rand, dann das Bild im Kreis.
    let schwarz = CIImage(color: CIColor(red: 0, green: 0, blue: 0)).cropped(to: rahmen)
    let weiss = CIImage(color: CIColor(red: 1, green: 1, blue: 1)).cropped(to: rahmen)
    let schattenMaske = Self.verlauf(mitte, r + rand, r + rand + seite * 0.07, innen: 0.32, rahmen)
    let mitSchatten = Self.ueberlagern(schwarz, gross, schattenMaske, rahmen)
    let mitRand = Self.ueberlagern(weiss, mitSchatten, Self.scheibe(mitte, r + rand, rahmen), rahmen)
    let fertig = Self.ueberlagern(rund, mitRand, Self.scheibe(mitte, r, rahmen), rahmen)

    guard let ausgabe = puffer(rahmen.size) else { return nil }
    kontext.render(fertig, to: ausgabe)
    // Das neue Bild ist schon aufrecht – also ohne Drehung weitergeben.
    let ohneDrehung = type(of: frame.rotation).init(rawValue: 0) ?? frame.rotation
    return LKRTCVideoFrame(buffer: LKRTCCVPixelBuffer(pixelBuffer: ausgabe), rotation: ohneDrehung, timeStampNs: frame.timeStampNs)
  }

  private static func naeher(_ a: Lage, _ b: Lage, _ k: CGFloat) -> Lage {
    func m(_ u: CGFloat, _ v: CGFloat) -> CGFloat { abs(v - u) < 0.5 ? v : u + (v - u) * k }
    return Lage(x: m(a.x, b.x), y: m(a.y, b.y), d: m(a.d, b.d), breite: m(a.breite, b.breite), hoehe: m(a.hoehe, b.hoehe))
  }

  /// Drehung aus WebRTC (Grad im Uhrzeigersinn) anwenden, Ursprung auf (0, 0).
  private static func aufrecht(_ bild: CIImage, _ grad: Int) -> CIImage {
    let o: CGImagePropertyOrientation
    switch grad {
    case 90: o = .right
    case 180: o = .down
    case 270: o = .left
    default: o = .up
    }
    let g = bild.oriented(o)
    return g.transformed(by: CGAffineTransform(translationX: -g.extent.origin.x, y: -g.extent.origin.y))
  }

  /// Füllt die Fläche mittig (wie „cover“), Ursprung auf (0, 0).
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

  /// Weiße Scheibe mit weicher Kante (Maske).
  private static func scheibe(_ mitte: CGPoint, _ radius: CGFloat, _ rahmen: CGRect) -> CIImage {
    verlauf(mitte, max(0, radius - 0.75), radius + 0.75, innen: 1, rahmen)
  }

  /// Ring-Verlauf als Maske: innen `innen` (0–1), nach außen schwarz.
  private static func verlauf(_ mitte: CGPoint, _ r0: CGFloat, _ r1: CGFloat, innen: CGFloat, _ rahmen: CGRect) -> CIImage {
    let f = CIFilter.radialGradient()
    f.center = mitte
    f.radius0 = Float(r0)
    f.radius1 = Float(r1)
    f.color0 = CIColor(red: innen, green: innen, blue: innen)
    f.color1 = CIColor(red: 0, green: 0, blue: 0)
    return (f.outputImage ?? CIImage(color: CIColor(red: 0, green: 0, blue: 0))).cropped(to: rahmen)
  }

  private static func ueberlagern(_ vorne: CIImage, _ hinten: CIImage, _ maske: CIImage, _ rahmen: CGRect) -> CIImage {
    let f = CIFilter.blendWithMask()
    f.inputImage = vorne
    f.backgroundImage = hinten
    f.maskImage = maske
    return (f.outputImage ?? hinten).cropped(to: rahmen)
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
