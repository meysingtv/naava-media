import SwiftUI

// MARK: - Haptik
func haptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
    UIImpactFeedbackGenerator(style: style).impactOccurred()
}

// MARK: - Theme
enum Theme {
    static let blueTop    = Color(red: 0.31, green: 0.62, blue: 0.96)
    static let blueBottom = Color(red: 0.15, green: 0.25, blue: 0.68)
    static let accent     = Color(red: 0.18, green: 0.49, blue: 0.95)
    static let orange     = Color(red: 0.94, green: 0.38, blue: 0.23)
    static let gold       = Color(red: 1.00, green: 0.83, blue: 0.31)
    static let ink        = Color(red: 0.06, green: 0.10, blue: 0.16)
    static let dark       = Color(red: 0.055, green: 0.055, blue: 0.07)
    static let darkCard   = Color(red: 0.10, green: 0.10, blue: 0.13)
}

// MARK: - Hintergrund: cleaner Gradient + weiche Radial-Glows
struct AppBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [Theme.blueTop, Theme.blueBottom],
                           startPoint: .top, endPoint: .bottom)
            RadialGradient(colors: [Color.white.opacity(0.28), .clear],
                           center: UnitPoint(x: 0.85, y: 0.05), startRadius: 0, endRadius: 360)
            RadialGradient(colors: [Color(red: 0.55, green: 0.78, blue: 1).opacity(0.35), .clear],
                           center: UnitPoint(x: 0.1, y: 0.42), startRadius: 0, endRadius: 420)
            RadialGradient(colors: [Color(red: 0.4, green: 0.5, blue: 1).opacity(0.30), .clear],
                           center: UnitPoint(x: 0.9, y: 0.9), startRadius: 0, endRadius: 380)
        }
        .ignoresSafeArea()
    }
}

// MARK: - Modelle & Daten
struct Profile: Equatable {
    var name = ""
    var age = ""
    var gender = ""
    var avatarId = 1
}

struct GameCat: Identifiable {
    let id: String
    let name: String
    let cover: String
    let icon: String
    let type: String
    var badge: String? = nil
    var big: Bool = false
    var data: [String] = []
}

let TRUTHS = [
    "Was war dein peinlichster Moment in der Schule?",
    "Was ist deine seltsamste Angewohnheit?",
    "Wen hier findest du am lustigsten – und wen am nervigsten?",
    "Was war die größte Lüge gegenüber deinen Eltern?",
    "Was ist dein größter Ick bei anderen?",
    "Was war dein peinlichster Chat-Verlauf?",
]
let DARES = [
    "Mach 10 Liegestütze.",
    "Sprich bis zur nächsten Runde nur im Flüsterton.",
    "Imitiere die Person links von dir für 30 Sekunden.",
    "Sag jedem hier ein ehrliches Kompliment.",
    "Tanze 20 Sekunden ohne Musik.",
    "Rede eine Runde lang nur in Reimen.",
]
let NEVER = [
    "einen Wecker verschlafen und was Wichtiges verpasst.",
    "mich in der Öffentlichkeit lang gemacht.",
    "heimlich Essen von jemandem geklaut.",
    "eine Nachricht an die komplett falsche Person geschickt.",
    "jemanden auf Social Media gestalkt.",
    "in einem Call-Center gearbeitet.",
]
let LIKELY = [
    "zu spät zur eigenen Hochzeit kommen?",
    "berühmt werden?",
    "den ganzen Kühlschrank leer essen?",
    "aus Versehen dem Ex schreiben?",
    "als Erste:r betrunken sein?",
    "das Handy in der Toilette fallen lassen?",
]
let EITHER: [(String, String)] = [
    ("Nie wieder Pizza", "nie wieder Pommes"),
    ("Fliegen können", "unsichtbar sein"),
    ("Immer 10 Min zu früh", "immer 10 Min zu spät"),
    ("Gedanken lesen können", "in die Zukunft sehen"),
    ("Peinliches Video geht viral", "alle lesen deine DMs"),
    ("Mit dem Ex nochmal ausgehen", "für immer Single"),
]
let SONGS: [(String, String, Int)] = [
    ("Bohemian Rhapsody", "Queen", 1975), ("Billie Jean", "Michael Jackson", 1983),
    ("99 Luftballons", "Nena", 1983), ("Smells Like Teen Spirit", "Nirvana", 1991),
    ("…Baby One More Time", "Britney Spears", 1998), ("Lose Yourself", "Eminem", 2002),
    ("Umbrella", "Rihanna", 2007), ("Rolling in the Deep", "Adele", 2010),
    ("Gangnam Style", "PSY", 2012), ("Uptown Funk", "Mark Ronson", 2014),
    ("Shape of You", "Ed Sheeran", 2017), ("Roller", "Apache 207", 2019),
    ("Blinding Lights", "The Weeknd", 2019), ("As It Was", "Harry Styles", 2022),
    ("Flowers", "Miley Cyrus", 2023),
]
let CATWORDS = ["Automarken", "Länder", "Tiere", "Süßigkeiten", "Serien", "Cocktails", "Filme", "Rapper"]

enum Cats {
    static let all: [GameCat] = [
        GameCat(id: "tod",    name: "Wahrheit oder Pflicht", cover: "cover_tod",    icon: "ic_flame",   type: "tod",    badge: "Beliebt"),
        GameCat(id: "never",  name: "Ich hab noch nie",       cover: "cover_never",  icon: "ic_wink",    type: "never"),
        GameCat(id: "likely", name: "Most Likely",            cover: "cover_likely", icon: "ic_heart",   type: "likely", badge: "Neu"),
        GameCat(id: "either", name: "Entweder / Oder",        cover: "cover_either", icon: "ic_storm",   type: "either"),
        GameCat(id: "song",   name: "Song-Quiz",              cover: "cover_song",   icon: "ic_note",    type: "song"),
        GameCat(id: "cats",   name: "Kategorien",             cover: "cover_cats",   icon: "ic_cup",     type: "cats"),
        GameCat(id: "bomb",   name: "Die Bombe",              cover: "cover_bomb",   icon: "ic_bomb",    type: "bomb",   badge: "Beliebt"),
        GameCat(id: "mixed",  name: "Party Mix",              cover: "cover_mixed",  icon: "ic_tornado", type: "mixed",  big: true),
    ]
}

struct DrawnCard {
    var kicker: String
    var color: Color
    var text: String
    var songYear: Int? = nil
}
func drawCard(_ cat: GameCat) -> DrawnCard {
    switch cat.type {
    case "never":  return DrawnCard(kicker: "Ich hab noch nie", color: Theme.accent, text: NEVER.randomElement()!)
    case "likely": return DrawnCard(kicker: "Wer würde am ehesten", color: Theme.accent, text: LIKELY.randomElement()!)
    case "either": let e = EITHER.randomElement()!; return DrawnCard(kicker: "Entweder … oder", color: Theme.accent, text: "\(e.0)\n\noder\n\n\(e.1)?")
    case "song":   let s = SONGS.randomElement()!; return DrawnCard(kicker: "Song-Quiz", color: Theme.accent, text: "\(s.0)\n\(s.1)", songYear: s.2)
    case "cats":   return DrawnCard(kicker: "Reihum nennen", color: Theme.accent, text: CATWORDS.randomElement()!)
    case "tod":    return Bool.random()
        ? DrawnCard(kicker: "Wahrheit", color: Theme.accent, text: TRUTHS.randomElement()!)
        : DrawnCard(kicker: "Pflicht", color: Theme.orange, text: DARES.randomElement()!)
    case "mixed":  return drawCard(Cats.all.filter { $0.type != "mixed" && $0.type != "bomb" }.randomElement()!)
    default:       return DrawnCard(kicker: cat.name, color: Theme.accent, text: cat.data.randomElement() ?? "")
    }
}

// MARK: - Root (Screen-Steuerung)
enum Screen { case onboarding, profile, home, game, settings, paywall }

struct RootView: View {
    @State private var screen: Screen = .onboarding
    @State private var profile = Profile()
    @State private var cat = Cats.all[0]

    var body: some View {
        ZStack {
            switch screen {
            case .onboarding: OnboardingView { screen = .profile }
            case .profile:    ProfileView(profile: $profile) { screen = .home }
            case .paywall:    PaywallView { screen = .home }
            case .settings:   SettingsView(profile: profile,
                                           onClose: { screen = .home },
                                           onPremium: { screen = .paywall },
                                           onEditProfile: { screen = .profile })
            case .home:       HomeView(profile: profile,
                                       onEditProfile: { screen = .profile },
                                       onSettings: { screen = .settings },
                                       onPick: { cat = $0; screen = .game })
            case .game:       GameView(cat: $cat, onHome: { screen = .home })
            }
        }
        .animation(.easeInOut(duration: 0.25), value: screenKey)
    }
    private var screenKey: Int {
        switch screen { case .onboarding: return 0; case .profile: return 1; case .home: return 2
        case .game: return 3; case .settings: return 4; case .paywall: return 5 }
    }
}
