import SwiftUI

let AVA_GENDER: [Int: String] = [1: "w", 2: "m", 3: "w", 4: "m", 5: "w", 6: "m", 7: "w", 8: "w"]

// MARK: - Wiederverwendbare Bausteine
struct RoundIcon: View {
    let symbol: String
    var body: some View {
        Image(systemName: symbol).font(.system(size: 18, weight: .semibold)).foregroundColor(.white)
            .frame(width: 42, height: 42).background(Circle().fill(Color.white.opacity(0.16)))
    }
}

struct WeiterButton: View {
    let title: String
    var arrow: Bool = true
    var action: () -> Void
    var body: some View {
        Button { haptic(); action() } label: {
            HStack(spacing: 10) {
                Text(title).font(.system(size: 18, weight: .heavy)).foregroundColor(.white)
                if arrow { Image(systemName: "arrow.right").font(.system(size: 17, weight: .bold)).foregroundColor(.white) }
            }
            .frame(maxWidth: .infinity).padding(.vertical, 17)
            .background(Capsule().fill(Color.white.opacity(0.18)))
        }
    }
}

// MARK: - Onboarding
struct OnbSlide { let img: String; let title: String; let text: String }
let ONB = [
    OnbSlide(img: "ic_cup",     title: "Willkommen bei PROST", text: "Das ultimative Trinkspiel für jede Runde."),
    OnbSlide(img: "ic_flame",   title: "Hunderte Karten",       text: "Von harmlos bis wild – für jede Stimmung."),
    OnbSlide(img: "ic_note",    title: "Viele Spielmodi",       text: "Wahrheit oder Pflicht, Song-Quiz & mehr."),
    OnbSlide(img: "ic_tornado", title: "Bereit?",               text: "Schnapp dir deine Crew und leg los!"),
]

struct OnboardingView: View {
    var onDone: () -> Void
    @State private var i = 0
    var body: some View {
        ZStack {
            AppBackground()
            VStack {
                TabView(selection: $i) {
                    ForEach(ONB.indices, id: \.self) { idx in
                        VStack(spacing: 22) {
                            ZStack {
                                Circle().fill(Color.white.opacity(0.15)).frame(width: 180, height: 180)
                                Image(ONB[idx].img).resizable().scaledToFit().frame(width: 112, height: 112)
                            }
                            Text(ONB[idx].title).font(.system(size: 30, weight: .heavy)).foregroundColor(.white).multilineTextAlignment(.center)
                            Text(ONB[idx].text).font(.system(size: 17)).foregroundColor(.white.opacity(0.85)).multilineTextAlignment(.center).padding(.horizontal, 34)
                        }.tag(idx)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                HStack {
                    HStack(spacing: 8) {
                        ForEach(ONB.indices, id: \.self) { idx in
                            Capsule().fill(Color.white.opacity(idx == i ? 1 : 0.35)).frame(width: idx == i ? 30 : 22, height: 6)
                        }
                    }
                    Spacer()
                    Button {
                        haptic()
                        if i < ONB.count - 1 { withAnimation { i += 1 } } else { onDone() }
                    } label: {
                        Image(systemName: i < ONB.count - 1 ? "chevron.right" : "checkmark")
                            .font(.system(size: 24, weight: .bold)).foregroundColor(Theme.accent)
                            .frame(width: 66, height: 66).background(Circle().fill(.white))
                    }
                }.padding(.horizontal, 28).padding(.bottom, 20)
            }
        }
    }
}

// MARK: - Profil
struct ProfileView: View {
    @Binding var profile: Profile
    var onDone: () -> Void
    @State private var name = ""
    @State private var age = ""
    @State private var gender = ""
    @State private var sel = 1

    init(profile: Binding<Profile>, onDone: @escaping () -> Void) {
        _profile = profile; self.onDone = onDone
        _name = State(initialValue: profile.wrappedValue.name)
        _age = State(initialValue: profile.wrappedValue.age)
        _gender = State(initialValue: profile.wrappedValue.gender)
        _sel = State(initialValue: profile.wrappedValue.avatarId)
    }

    let cols = Array(repeating: GridItem(.flexible(), spacing: 12), count: 4)
    var order: [Int] { Array(1...8).sorted { (AVA_GENDER[$0] == gender ? 0 : 1) < (AVA_GENDER[$1] == gender ? 0 : 1) } }

    var body: some View {
        ZStack {
            AppBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Dein Profil").font(.system(size: 30, weight: .heavy)).foregroundColor(.white).frame(maxWidth: .infinity).padding(.bottom, 4)
                    Image("ava\(sel)").resizable().scaledToFit().frame(width: 116, height: 116)
                        .overlay(Circle().stroke(.white, lineWidth: 3)).frame(maxWidth: .infinity).padding(.bottom, 8)
                    label("Name"); field("Wie heißt du?", $name)
                    label("Alter"); field("Dein Alter", $age, num: true)
                    label("Geschlecht")
                    HStack(spacing: 10) {
                        genderBtn("m", "Männlich"); genderBtn("w", "Weiblich"); genderBtn("d", "Divers")
                    }
                    label("Profilbild")
                    LazyVGrid(columns: cols, spacing: 12) {
                        ForEach(order, id: \.self) { id in
                            Image("ava\(id)").resizable().scaledToFit()
                                .overlay(Circle().stroke(.white, lineWidth: sel == id ? 3 : 0))
                                .onTapGesture { haptic(); sel = id }
                        }
                    }
                    Button {
                        guard !name.isEmpty else { return }
                        haptic(.medium)
                        profile = Profile(name: name, age: age, gender: gender, avatarId: sel)
                        onDone()
                    } label: {
                        Text("Los geht’s").font(.system(size: 18, weight: .heavy)).foregroundColor(Theme.accent)
                            .frame(maxWidth: .infinity).padding(.vertical, 17).background(Capsule().fill(.white))
                    }
                    .opacity(name.isEmpty ? 0.5 : 1).padding(.top, 10)
                }.padding(24)
            }
        }
    }
    func label(_ t: String) -> some View {
        Text(t).font(.system(size: 14, weight: .bold)).foregroundColor(.white.opacity(0.9)).padding(.top, 6)
    }
    func field(_ ph: String, _ text: Binding<String>, num: Bool = false) -> some View {
        ZStack(alignment: .leading) {
            if text.wrappedValue.isEmpty { Text(ph).foregroundColor(.white.opacity(0.5)) }
            TextField("", text: text).foregroundColor(.white).tint(.white).keyboardType(num ? .numberPad : .default)
        }
        .padding(.horizontal, 16).padding(.vertical, 15)
        .background(RoundedRectangle(cornerRadius: 16).fill(.white.opacity(0.16)))
    }
    func genderBtn(_ k: String, _ t: String) -> some View {
        Button { haptic(); gender = k } label: {
            Text(t).font(.system(size: 14, weight: .bold)).foregroundColor(gender == k ? Theme.accent : .white)
                .frame(maxWidth: .infinity).padding(.vertical, 12)
                .background(RoundedRectangle(cornerRadius: 12).fill(gender == k ? .white : .white.opacity(0.14)))
        }
    }
}

// MARK: - Home (Karten-Grid)
struct HomeView: View {
    let profile: Profile
    var onEditProfile: () -> Void
    var onSettings: () -> Void
    var onPick: (GameCat) -> Void
    let cols = Array(repeating: GridItem(.flexible(), spacing: 12), count: 2)

    var body: some View {
        ZStack {
            AppBackground()
            VStack(spacing: 0) {
                HStack {
                    Button { haptic(); onEditProfile() } label: {
                        Image("ava\(profile.avatarId)").resizable().scaledToFit().frame(width: 42, height: 42)
                            .overlay(Circle().stroke(.white.opacity(0.7), lineWidth: 2))
                    }
                    Spacer()
                    HStack(spacing: 10) {
                        RoundIcon(symbol: "gamecontroller.fill")
                        Button { haptic(); onSettings() } label: { RoundIcon(symbol: "gearshape.fill") }
                    }
                }.padding(.horizontal, 18).padding(.top, 4)
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(profile.name.isEmpty ? "Deine Spiele" : "\(profile.name)s Spiele")
                            .font(.system(size: 30, weight: .heavy)).foregroundColor(.white)
                        HStack(spacing: 10) {
                            Image(systemName: "magnifyingglass").foregroundColor(.white.opacity(0.7))
                            Text("Spiel suchen").foregroundColor(.white.opacity(0.7)); Spacer()
                        }.padding(14).background(RoundedRectangle(cornerRadius: 16).fill(.white.opacity(0.16)))
                        HStack(spacing: 10) {
                            chip("person.2.fill", "Spieleranzahl", Color(red: 0.49, green: 0.75, blue: 1))
                            chip("heart.fill", "Favoriten", Color(red: 1, green: 0.42, blue: 0.42))
                            Spacer()
                        }
                        LazyVGrid(columns: cols, spacing: 12) {
                            ForEach(Cats.all.filter { !$0.big }) { c in coverCard(c) }
                        }
                        if let m = Cats.all.first(where: { $0.big }) { coverCard(m) }
                    }.padding(16)
                }
            }
        }
    }
    func coverCard(_ c: GameCat) -> some View {
        Button { haptic(.medium); onPick(c) } label: {
            Image(c.cover).resizable().scaledToFit()
                .overlay(alignment: .topLeading) {
                    if let b = c.badge {
                        HStack(spacing: 6) {
                            ZStack {
                                Circle().fill(b == "Neu" ? Theme.gold : Color(red: 1, green: 0.23, blue: 0.19)).frame(width: 22, height: 22)
                                Image(systemName: b == "Neu" ? "star.fill" : "flame.fill").font(.system(size: 11, weight: .bold))
                                    .foregroundColor(b == "Neu" ? Color(red: 0.48, green: 0.36, blue: 0) : .white)
                            }
                            Text(b).font(.system(size: 12.5, weight: .bold)).foregroundColor(Theme.ink).padding(.trailing, 4)
                        }.padding(4).background(Capsule().fill(.white)).padding(10)
                    }
                }
        }
    }
    func chip(_ symbol: String, _ t: String, _ c: Color) -> some View {
        HStack(spacing: 7) {
            Image(systemName: symbol).font(.system(size: 14)).foregroundColor(c)
            Text(t).font(.system(size: 14, weight: .bold)).foregroundColor(.white)
        }.padding(.horizontal, 14).padding(.vertical, 9).background(Capsule().fill(Color.black.opacity(0.28)))
    }
}

// MARK: - Spiel
struct GameView: View {
    @Binding var cat: GameCat
    var onHome: () -> Void
    var body: some View {
        ZStack {
            AppBackground()
            VStack(spacing: 0) {
                HStack {
                    Button { haptic(); onHome() } label: { RoundIcon(symbol: "house.fill") }
                    Spacer()
                    Text(cat.name).font(.system(size: 17, weight: .bold)).foregroundColor(.white)
                    Spacer()
                    Color.clear.frame(width: 42, height: 42)
                }.padding(.horizontal, 18).padding(.top, 4)
                if cat.type == "bomb" { BombView() } else { CardPlayView(cat: cat).id(cat.id) }
                SwitcherBar(current: cat) { cat = $0 }
            }
        }
    }
}

struct CardPlayView: View {
    let cat: GameCat
    @State private var card: DrawnCard
    @State private var revealed = false
    @State private var up = Int.random(in: 10...90)
    @State private var down = Int.random(in: 20...220)
    init(cat: GameCat) { self.cat = cat; _card = State(initialValue: drawCard(cat)) }

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            ZStack {
                RoundedRectangle(cornerRadius: 28).fill(.white.opacity(0.22)).padding(.horizontal, 20).offset(y: 16)
                RoundedRectangle(cornerRadius: 28).fill(.white.opacity(0.45)).padding(.horizontal, 10).offset(y: 8)
                cardFace
            }
            Spacer()
            WeiterButton(title: "Weiter") { revealed = false; card = drawCard(cat); up = .random(in: 10...90); down = .random(in: 20...220) }
        }.padding(20)
    }
    var cardFace: some View {
        VStack(spacing: 12) {
            Spacer()
            Text(card.kicker).font(.system(size: 22, weight: .heavy)).foregroundColor(card.color)
            Text(card.text).font(.system(size: 28, weight: .heavy)).foregroundColor(Theme.ink)
                .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            if let y = card.songYear {
                if revealed {
                    Text("\(y)").font(.system(size: 44, weight: .heavy)).foregroundColor(card.color).padding(.top, 6)
                } else {
                    Button { haptic(); revealed = true } label: {
                        Text("Jahr zeigen").font(.system(size: 15, weight: .bold)).foregroundColor(Color(white: 0.35))
                            .padding(.horizontal, 22).padding(.vertical, 11).background(Capsule().fill(Color(white: 0.93)))
                    }.padding(.top, 14)
                }
            }
            Spacer()
            HStack(spacing: 12) { voteChip("hand.thumbsup.fill", up); voteChip("hand.thumbsdown.fill", down) }
        }
        .padding(26).frame(maxWidth: .infinity).frame(height: 380)
        .background(RoundedRectangle(cornerRadius: 28).fill(.white))
    }
    func voteChip(_ symbol: String, _ n: Int) -> some View {
        HStack(spacing: 7) {
            Image(systemName: symbol).font(.system(size: 15)).foregroundColor(Color(white: 0.6))
            Text("\(n)").font(.system(size: 14, weight: .bold)).foregroundColor(Color(white: 0.6))
        }.padding(.horizontal, 16).padding(.vertical, 9).background(Capsule().fill(Color(white: 0.95)))
    }
}

struct BombView: View {
    @State private var phase = "idle"
    @State private var word = ""
    @State private var pulse = false
    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            if phase == "idle" {
                Image("ic_bomb").resizable().scaledToFit().frame(width: 110, height: 110)
                info("Gebt das Handy reihum weiter und nennt Begriffe. Wer die Bombe hält, wenn sie hochgeht, trinkt.")
                WeiterButton(title: "Bombe zünden", arrow: false) { start() }.padding(.horizontal, 4)
            } else if phase == "run" {
                Image("ic_bomb").resizable().scaledToFit().frame(width: 130, height: 130)
                    .scaleEffect(pulse ? 1.12 : 1)
                    .animation(.easeInOut(duration: 0.4).repeatForever(autoreverses: true), value: pulse)
                Text(word).font(.system(size: 28, weight: .heavy)).foregroundColor(.white)
                info("Abwechselnd nennen und schnell weitergeben!")
            } else {
                Text("💥").font(.system(size: 90))
                Text("Bumm!").font(.system(size: 44, weight: .heavy)).foregroundColor(Theme.gold)
                info("Wer das Handy hält, trinkt 3 Schlücke.")
                WeiterButton(title: "Nochmal", arrow: false) { phase = "idle" }.padding(.horizontal, 4)
            }
            Spacer()
        }.padding(24)
    }
    func info(_ t: String) -> some View {
        Text(t).font(.system(size: 15)).foregroundColor(.white.opacity(0.9)).multilineTextAlignment(.center).padding(.horizontal, 10)
    }
    func start() {
        haptic(.medium); word = CATWORDS.randomElement()!; phase = "run"; pulse = true
        DispatchQueue.main.asyncAfter(deadline: .now() + Double.random(in: 5...18)) {
            if phase == "run" { haptic(.heavy); phase = "boom"; pulse = false }
        }
    }
}

struct SwitcherBar: View {
    let current: GameCat
    var onSelect: (GameCat) -> Void
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(Cats.all.filter { $0.type != "mixed" }) { c in
                    let on = c.id == current.id
                    VStack(spacing: 5) {
                        Image(c.icon).resizable().scaledToFit().frame(width: 34, height: 34).opacity(on ? 1 : 0.85)
                            .frame(width: 56, height: 56).background(Circle().fill(.white.opacity(on ? 0.24 : 0.10)))
                        Text(c.name.components(separatedBy: " ").first ?? c.name)
                            .font(.system(size: 11, weight: .bold)).foregroundColor(.white).opacity(on ? 1 : 0.6)
                    }.onTapGesture { haptic(); onSelect(c) }
                }
            }.padding(.horizontal, 14).padding(.vertical, 6)
        }
    }
}

// MARK: - Settings (iOS-Stil)
struct SettingsView: View {
    let profile: Profile
    var onClose: () -> Void
    var onPremium: () -> Void
    var onEditProfile: () -> Void

    var body: some View {
        ZStack {
            Theme.dark.ignoresSafeArea()
            VStack(spacing: 0) {
                HStack {
                    Text("Einstellungen").font(.system(size: 30, weight: .heavy)).foregroundColor(.white)
                    Spacer()
                    Button { haptic(); onClose() } label: {
                        Image(systemName: "xmark").font(.system(size: 16, weight: .bold)).foregroundColor(.white)
                            .frame(width: 40, height: 40).background(Circle().fill(Color.white.opacity(0.15)))
                    }
                }.padding(.horizontal, 20).padding(.vertical, 10)
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 18) {
                        Button { haptic(.medium); onPremium() } label: { promo }
                        Button { haptic(); onEditProfile() } label: { profileRow }
                        group([("globe", "Sprache", Theme.accent), ("bell.fill", "Benachrichtigungen", Theme.accent),
                               ("envelope.fill", "Feedback", Theme.accent), ("lock.shield.fill", "Datenschutz", Theme.accent),
                               ("doc.text.fill", "Bedingungen", Theme.accent), ("info.circle.fill", "Über", Theme.accent)])
                        group([("heart.fill", "App bewerten", .green), ("square.and.arrow.up.fill", "Freunde einladen", .orange),
                               ("sparkles", "Ideen & Wünsche", Theme.gold)])
                        Text("PROST · Demo v4").foregroundColor(Color(white: 0.4)).font(.footnote).padding(.bottom, 20)
                    }.padding(16)
                }
            }
        }
    }
    var promo: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("PROST Premium").font(.system(size: 14, weight: .bold)).foregroundColor(.white.opacity(0.9))
            Text("Komm ins Team ❤️ 🪩").font(.system(size: 24, weight: .heavy)).foregroundColor(.white).padding(.bottom, 12)
            Text("Alle Vorteile freischalten").font(.system(size: 16, weight: .heavy)).foregroundColor(Color(red: 0.1, green: 0.1, blue: 0))
                .frame(maxWidth: .infinity).padding(.vertical, 14).background(Capsule().fill(Theme.gold))
        }
        .padding(18)
        .background(RoundedRectangle(cornerRadius: 22).fill(LinearGradient(colors: [Color(red: 1, green: 0.35, blue: 0.48), Color(red: 0.89, green: 0.23, blue: 0.35)], startPoint: .topLeading, endPoint: .bottomTrailing)))
    }
    var profileRow: some View {
        HStack {
            Image("ava\(profile.avatarId)").resizable().scaledToFit().frame(width: 52, height: 52)
            VStack(alignment: .leading, spacing: 1) {
                Text(profile.name.isEmpty ? "Dein Profil" : profile.name).font(.system(size: 17, weight: .bold)).foregroundColor(.white)
                Text("Dein PROST-Profil").font(.system(size: 13)).foregroundColor(Color(white: 0.55))
            }.padding(.leading, 12)
            Spacer()
            Image(systemName: "chevron.right").foregroundColor(Color(white: 0.4))
        }.padding(12).background(RoundedRectangle(cornerRadius: 18).fill(Theme.darkCard))
    }
    func group(_ items: [(String, String, Color)]) -> some View {
        VStack(spacing: 0) {
            ForEach(items, id: \.1) { it in
                HStack {
                    Image(systemName: it.0).font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                        .frame(width: 30, height: 30).background(RoundedRectangle(cornerRadius: 8).fill(it.2))
                    Text(it.1).font(.system(size: 16.5)).foregroundColor(.white).padding(.leading, 14)
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 14)).foregroundColor(Color(white: 0.35))
                }.padding(.vertical, 13).padding(.horizontal, 14)
                if it.1 != items.last?.1 { Divider().background(Color.white.opacity(0.08)).padding(.leading, 58) }
            }
        }.background(RoundedRectangle(cornerRadius: 18).fill(Theme.darkCard))
    }
}

// MARK: - Paywall
struct PaywallView: View {
    var onClose: () -> Void
    let feats: [(String, String)] = [
        ("sparkles", "Alle Kategorien freischalten"), ("flame.fill", "NSFW & 18+ Karten"),
        ("arrow.clockwise", "Neue Karten jeden Monat"), ("square.and.pencil", "Eigene Karten erstellen"),
        ("nosign", "Keine Werbung mehr"), ("checkmark.seal.fill", "Jederzeit kündbar"),
    ]
    var body: some View {
        ZStack {
            AppBackground()
            VStack(spacing: 0) {
                HStack {
                    Spacer()
                    Button { haptic(); onClose() } label: {
                        Image(systemName: "xmark").font(.system(size: 16, weight: .bold)).foregroundColor(.white)
                            .frame(width: 40, height: 40).background(Circle().fill(Color.white.opacity(0.16)))
                    }
                }.padding()
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 16) {
                        Text("80% Rabatt · Erste Woche").font(.system(size: 15, weight: .heavy)).foregroundColor(Color(red: 0.35, green: 0.28, blue: 0))
                            .padding(.horizontal, 20).padding(.vertical, 10).background(Capsule().fill(Theme.gold)).rotationEffect(.degrees(-3))
                        Text("PROST Premium").font(.system(size: 30, weight: .heavy)).foregroundColor(.white)
                        VStack(spacing: 0) {
                            ForEach(feats, id: \.1) { f in
                                HStack {
                                    Image(systemName: f.0).font(.system(size: 16)).foregroundColor(.white)
                                        .frame(width: 34, height: 34).background(RoundedRectangle(cornerRadius: 10).fill(.white.opacity(0.18)))
                                    Text(f.1).font(.system(size: 16, weight: .semibold)).foregroundColor(.white).padding(.leading, 12)
                                    Spacer()
                                }.padding(.vertical, 8)
                            }
                        }.padding(16).background(RoundedRectangle(cornerRadius: 22).fill(.white.opacity(0.12)))
                        Text("Erste Woche 1,99 € · danach 9,99 €/Woche").font(.system(size: 14)).foregroundColor(.white.opacity(0.8)).padding(.top, 6)
                        Button { haptic(.medium); onClose() } label: {
                            Text("Jetzt starten").font(.system(size: 18, weight: .heavy)).foregroundColor(Theme.accent)
                                .frame(maxWidth: .infinity).padding(.vertical, 18).background(Capsule().fill(.white))
                        }
                        Text("Einkäufe wiederherstellen").font(.system(size: 14, weight: .semibold)).foregroundColor(.white).underline().padding(.top, 6)
                    }.padding(24)
                }
            }
        }
    }
}
