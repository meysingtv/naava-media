import { useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View, type TextInputProps, type ViewStyle } from "react-native";
import { router } from "expo-router";

import { Logo } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { B, Kachel, Knopf, n, TOENE, type Ton, type Zustand, webDunkel } from "@/components/web/bunt";
import { CODE_LAENGE, useKonto, type CodeAblauf, type Rolle } from "@/lib/konto";
import { serverVerbunden } from "@/lib/supabase";

// Willkommen, Anmelden, Registrieren und Code-Eingabe am PC: zweigeteilter
// Bildschirm. Links eine ruhige, leicht getönte Fläche mit Logo, Claim und
// drei Vorteilen, rechts das Formular in einer weißen Kachel. Die Logik
// (Anmelden, Prüfen der Felder …) bleibt in den Routen – hier nur die Ansicht.

// ---------------------------------------------------------------------------
// Rahmen
// ---------------------------------------------------------------------------

const VORTEILE: { icon: IconName; ton: Ton; titel: string; text: string }[] = [
  { icon: "flash", ton: TOENE.orange, titel: "Kurze Lerneinheiten", text: "Ein paar Minuten am Tag reichen – die App merkt sich, was noch nicht sitzt." },
  { icon: "shield-checkmark", ton: TOENE.blau, titel: "Echte Prüfungslogik", text: "Übe die Theorieprüfung mit Fehlerpunkten und Zeitlimit, bevor es ernst wird." },
  { icon: "stats-chart", ton: TOENE.gruen, titel: "Klarer Überblick", text: "Du siehst jederzeit, wie prüfungsreif du bist – Thema für Thema." },
];

/** Linke Hälfte: Logo, Claim, drei Vorteile. */
function SeitenFlaeche({ breite }: { breite: number }) {
  return (
    <View style={{ width: breite, height: "100%", backgroundColor: B.ton, paddingHorizontal: breite > 500 ? 56 : 44, paddingTop: 36, paddingBottom: 40 }}>
      <Pressable onPress={() => router.replace("/")} accessibilityLabel="Fahrschul Pro" style={{ alignSelf: "flex-start" }}>
        <Logo groesse={28} hell={!webDunkel()} />
      </Pressable>
      <View style={{ flex: 1, justifyContent: "center", gap: 40, maxWidth: 460 }}>
        <View style={{ gap: 14 }}>
          <Text style={{ ...n.fett, fontSize: 15, color: B.orange }}>Führerschein-Theorie</Text>
          <Text style={{ ...n.schwarz, fontSize: 44, lineHeight: 50, color: B.text }}>Deine Theorie.{"\n"}Klar geplant.</Text>
          <Text style={{ ...n.halb, fontSize: 17, lineHeight: 25, color: B.text2 }}>Lernen, üben und prüfen – in deinem Tempo, auf dem Handy und am PC.</Text>
        </View>
        <View style={{ gap: 22 }}>
          {VORTEILE.map((v) => (
            <View key={v.titel} style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: B.flaeche, borderWidth: 1.5, borderColor: B.linie, alignItems: "center", justifyContent: "center" }}>
                <Icon name={v.icon} size={20} color={v.ton.farbe} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...n.fett, fontSize: 16, color: B.text }}>{v.titel}</Text>
                <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>{v.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Zweigeteilter Bildschirm: links die ruhige Fläche, rechts der Inhalt mittig
 * (scrollt, wenn er höher ist). Oben rechts auf Wunsch „Zurück“.
 */
export function AuthBuehne({ children, breite = 460, onZurueck }: { children: ReactNode; breite?: number; onZurueck?: () => void }) {
  const { width } = useWindowDimensions();
  const links = Math.round(Math.min(600, Math.max(400, width * 0.4)));
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: B.grund }}>
      <SeitenFlaeche breite={links} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 44, flexDirection: "row", alignItems: "center" }}>
          {onZurueck ? (
            <Pressable
              onPress={onZurueck}
              accessibilityLabel="Zurück"
              style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 10, marginLeft: -10, borderRadius: 10, backgroundColor: z.hovered ? B.ton : "transparent" })}
            >
              <Icon name="arrow-back" size={18} color={B.text2} />
              <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2 }}>Zurück</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flex: 1, justifyContent: "center", paddingVertical: 24 }}>
          <View style={{ width: "100%", maxWidth: breite, alignSelf: "center" }}>{children}</View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Titel und Unterzeile oben in der Formular-Kachel. */
export function FormKopf({ titel, unter }: { titel: string; unter?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...n.schwarz, fontSize: 30, lineHeight: 36, color: B.text }}>{titel}</Text>
      {unter ? <Text style={{ ...n.halb, fontSize: 15.5, lineHeight: 22, color: B.text2 }}>{unter}</Text> : null}
    </View>
  );
}

/** Die weiße Kachel mit dem Formular. */
export function FormKachel({ children }: { children: ReactNode }) {
  return <Kachel style={{ paddingHorizontal: 36, paddingTop: 34, paddingBottom: 30, gap: 22 }}>{children}</Kachel>;
}

// ---------------------------------------------------------------------------
// Felder und kleine Bausteine
// ---------------------------------------------------------------------------

/** Ring um ein fokussiertes Feld (nur im Browser). */
const RING = (farbe: string) => ({ boxShadow: `0 0 0 3px ${farbe}` }) as ViewStyle;

/**
 * Eingabefeld: Beschriftung darüber (rechts optional ein Link), weißes Feld
 * mit feinem Rand, orange beim Tippen, rot bei Fehler. Darunter ein Hinweis.
 */
export function Feld({
  label,
  rechtsOben,
  icon,
  links,
  fehler,
  hinweis,
  hinweisTon,
  ...props
}: TextInputProps & {
  label: string;
  rechtsOben?: ReactNode;
  icon?: IconName;
  links?: ReactNode;
  fehler?: boolean;
  hinweis?: string;
  hinweisTon?: "gut" | "schlecht";
}) {
  const [fokus, setFokus] = useState(false);
  const eingabe = useRef<TextInput>(null);
  const rand = fehler ? B.rot : fokus ? B.orange : B.linie;
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>{label}</Text>
        {rechtsOben}
      </View>
      <Pressable
        onPress={() => eingabe.current?.focus()}
        accessible={false}
        style={(z: Zustand) => [
          { flexDirection: "row", alignItems: "center", height: 50, paddingLeft: 14, paddingRight: 6, borderRadius: 14, borderWidth: 1.5, borderColor: z.hovered && !fokus && !fehler ? B.kante : rand, backgroundColor: B.flaeche },
          fokus ? RING(fehler ? B.rotHell : B.orangeHell) : null,
        ]}
      >
        {links}
        <TextInput
          ref={eingabe}
          placeholderTextColor={B.text3}
          selectionColor={B.orange}
          {...props}
          onFocus={(e) => {
            setFokus(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFokus(false);
            props.onBlur?.(e);
          }}
          style={[{ flex: 1, minWidth: 0, height: 46, ...n.halb, fontSize: 16, color: B.text, outlineWidth: 0 } as never, props.style]}
        />
        {icon ? (
          <View style={{ width: 38, alignItems: "center" }}>
            <Icon name={icon} size={19} color={fokus ? B.orange : B.text3} />
          </View>
        ) : null}
      </Pressable>
      {hinweis ? <Text style={{ ...n.halb, fontSize: 13, color: hinweisTon === "gut" ? B.gruenKante : hinweisTon === "schlecht" ? B.rotKante : B.text3 }}>{hinweis}</Text> : null}
    </View>
  );
}

/** Kleiner Text-Link (Registrieren, Code erneut senden …). */
export function Verweis({ text, onPress, ton = TOENE.orange }: { text: string; onPress: () => void; ton?: Ton }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={(z: Zustand) => ({ opacity: z.hovered ? 0.7 : 1 })}>
      <Text style={{ ...n.fett, fontSize: 14, color: ton.kante }}>{text}</Text>
    </Pressable>
  );
}

/** Fehler- oder Hinweiszeile in der Kachel. */
export function Meldung({ text, art = "fehler" }: { text: string; art?: "fehler" | "hinweis" }) {
  const ton = art === "fehler" ? TOENE.rot : TOENE.gelb;
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, backgroundColor: ton.hell }}>
      <Icon name={art === "fehler" ? "alert-circle" : "cloud-offline-outline"} size={18} color={ton.kante} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, ...n.halb, fontSize: 14, lineHeight: 20, color: art === "fehler" ? B.rotKante : "#8A6400" }}>{text}</Text>
    </View>
  );
}

/** Hauptknopf über die ganze Breite – mit „Einen Moment …“ beim Laden. */
export function HauptKnopf({ titel, onPress, laedt, deaktiviert, icon }: { titel: string; onPress: () => void; laedt?: boolean; deaktiviert?: boolean; icon?: IconName }) {
  return <Knopf titel={laedt ? "Einen Moment …" : titel} icon={laedt ? undefined : icon} groesse="gross" deaktiviert={laedt || deaktiviert} onPress={onPress} />;
}

/** „Kein Konto? Registrieren“. */
export function Wechsel({ frage, aktion, onPress }: { frage: string; aktion: string; onPress: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
      <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>{frage}</Text>
      <Verweis text={aktion} onPress={onPress} />
    </View>
  );
}

/** Trennlinie mit „oder“. */
export function Oder() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ flex: 1, height: 1.5, backgroundColor: B.ton }} />
      <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>oder</Text>
      <View style={{ flex: 1, height: 1.5, backgroundColor: B.ton }} />
    </View>
  );
}

/** Auswahl als Kachel (Rolle, Klasse): gewählt mit orangem Rand und Haken. */
export function WahlKachel({ aktiv, onPress, label, children, style }: { aktiv: boolean; onPress: () => void; label: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: aktiv }}
      accessibilityLabel={label}
      style={(z: Zustand) => [
        { borderRadius: 14, borderWidth: 1.5, borderBottomWidth: 3, borderColor: aktiv ? B.orange : z.hovered ? B.kante : B.linie, borderBottomColor: aktiv ? B.orangeKante : B.kante, backgroundColor: z.hovered && !aktiv ? B.hover : B.flaeche },
        z.pressed ? { borderBottomWidth: 1.5, marginTop: 1.5 } : null,
        style,
      ]}
    >
      {children}
      {aktiv ? (
        <View style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: B.orange, alignItems: "center", justifyContent: "center" }}>
          <Icon name="checkmark" size={13} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Code aus der E-Mail
// ---------------------------------------------------------------------------

/** Zweiter Schritt von Anmelden und Registrieren: Code aus der E-Mail eingeben. */
function CodeWeb({ ablauf, onAngemeldet }: { ablauf: CodeAblauf; onAngemeldet: () => void }) {
  async function los(c?: string) {
    if (await ablauf.pruefen(c)) onAngemeldet();
  }
  return (
    <AuthBuehne breite={440} onZurueck={ablauf.andereAdresse}>
      <FormKachel>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: B.orangeHell, alignItems: "center", justifyContent: "center" }}>
          <Icon name="mail-unread-outline" size={28} color={B.orangeKante} />
        </View>
        <FormKopf titel="Code eingeben" unter={`Wir haben dir einen ${CODE_LAENGE}-stelligen Code an ${ablauf.gesendetAn} geschickt.`} />
        <Feld
          label="Code aus der E-Mail"
          value={ablauf.code}
          onChangeText={(t) => {
            ablauf.setCode(t);
            const z = t.replace(/\D/g, "").slice(0, CODE_LAENGE);
            if (z.length === CODE_LAENGE) los(z);
          }}
          placeholder={"•".repeat(CODE_LAENGE)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          fehler={Boolean(ablauf.fehler)}
          hinweis="Nichts angekommen? Schau auch im Spam-Ordner nach. Der Code gilt eine Stunde."
          style={{ fontSize: 22, letterSpacing: 8 }}
        />
        {ablauf.fehler ? <Meldung text={ablauf.fehler} /> : null}
        <HauptKnopf titel="Bestätigen" laedt={ablauf.laedt} deaktiviert={ablauf.code.length < CODE_LAENGE} onPress={() => los()} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {ablauf.warten > 0 ? (
            <Text style={{ ...n.fett, fontSize: 14, color: B.text3 }}>Neuer Code in {ablauf.warten} s</Text>
          ) : (
            <Verweis text="Code erneut senden" onPress={ablauf.nochmalSenden} />
          )}
          <Verweis text="Andere E-Mail" onPress={ablauf.andereAdresse} />
        </View>
      </FormKachel>
    </AuthBuehne>
  );
}

// ---------------------------------------------------------------------------
// Willkommen
// ---------------------------------------------------------------------------

/** Startseite ohne Konto: Konto erstellen, anmelden oder als Gast umschauen. */
export function WillkommenWeb() {
  const { alsGast } = useKonto();
  const [gastForm, setGastForm] = useState(false);
  const [name, setName] = useState("");

  return (
    <AuthBuehne breite={440}>
      <FormKachel>
        <FormKopf titel="Schön, dass du da bist." unter="Leg ein kostenloses Konto an – dann ist dein Fortschritt gesichert und auf allen Geräten gleich." />
        <View style={{ gap: 12, marginTop: 4 }}>
          <HauptKnopf titel="Konto erstellen" onPress={() => router.push("/registrieren")} />
          <Knopf titel="Ich habe schon ein Konto" art="rand" ton="blau" groesse="gross" onPress={() => router.push("/anmelden")} />
        </View>
        <Oder />
        {gastForm ? (
          <View style={{ gap: 14 }}>
            <Feld
              label="Wie heißt du?"
              icon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Dein Vorname"
              autoFocus
              autoCapitalize="words"
              returnKeyType="go"
              onSubmitEditing={() => alsGast(name)}
            />
            <Knopf titel="Los geht's" art="rand" ton="orange" onPress={() => alsGast(name)} />
            <Text style={{ ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text3, textAlign: "center" }}>Dein Fortschritt bleibt in diesem Browser. Ein Konto kannst du jederzeit anlegen.</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => setGastForm(true)}
            accessibilityRole="button"
            style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 12, marginHorizontal: -12, borderRadius: 14, backgroundColor: z.hovered ? B.ton : "transparent" })}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: B.ton, alignItems: "center", justifyContent: "center" }}>
              <Icon name="compass-outline" size={21} color={B.text2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }}>Erst mal ohne Konto umschauen</Text>
              <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>Sofort loslernen, Konto später</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={B.text3} />
          </Pressable>
        )}
      </FormKachel>
    </AuthBuehne>
  );
}

// ---------------------------------------------------------------------------
// Anmelden
// ---------------------------------------------------------------------------

export type AnmeldenWebProps = {
  email: string;
  onEmail: (t: string) => void;
  ablauf: CodeAblauf;
  onSenden: () => void;
  onAngemeldet: () => void;
};

export function AnmeldenWeb(p: AnmeldenWebProps) {
  const adresseOk = /\S+@\S+\.\S+/.test(p.email.trim());
  if (p.ablauf.gesendetAn) return <CodeWeb ablauf={p.ablauf} onAngemeldet={p.onAngemeldet} />;
  return (
    <AuthBuehne breite={440} onZurueck={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
      <FormKachel>
        <FormKopf titel="Anmelden" unter="Willkommen zurück! Gib deine E-Mail ein – wir schicken dir einen Code, ganz ohne Passwort." />
        {!serverVerbunden ? <Meldung art="hinweis" text="Die App ist noch mit keinem Server verbunden. Anmelden klappt erst danach." /> : null}
        <Feld
          label="E-Mail"
          icon="mail-outline"
          value={p.email}
          onChangeText={p.onEmail}
          placeholder="name@beispiel.de"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoFocus
          returnKeyType="go"
          onSubmitEditing={p.onSenden}
        />
        {p.ablauf.fehler ? <Meldung text={p.ablauf.fehler} /> : null}
        <HauptKnopf titel="Code senden" laedt={p.ablauf.laedt} deaktiviert={!adresseOk} onPress={p.onSenden} />
        <Wechsel frage="Kein Konto?" aktion="Registrieren" onPress={() => router.replace("/registrieren")} />
      </FormKachel>
    </AuthBuehne>
  );
}

// ---------------------------------------------------------------------------
// Registrieren
// ---------------------------------------------------------------------------

export type WebAuswahl<W extends string> = { id: W; titel: string; unter?: string; icon?: IconName };
export type WebLand = { code: string; vorwahl: string; flagge: string; name: string };

export type RegistrierenWebProps = {
  rollen: WebAuswahl<Rolle>[];
  rolle: Rolle;
  onRolle: (r: Rolle) => void;
  vorname: string;
  onVorname: (t: string) => void;
  nachname: string;
  onNachname: (t: string) => void;
  benutzer: string;
  onBenutzer: (t: string) => void;
  benutzerGueltig: boolean;
  frei: boolean | null;
  laender: readonly WebLand[];
  land: WebLand;
  onLand: (l: WebLand) => void;
  telefon: string;
  onTelefon: (t: string) => void;
  telefonOk: boolean;
  geburt: string;
  onGeburt: (t: string) => void;
  geburtOk: boolean;
  klassen: WebAuswahl<string>[];
  klasse: string;
  onKlasse: (k: string) => void;
  email: string;
  onEmail: (t: string) => void;
  /** Nach dem Absenden: Code aus der E-Mail eingeben. */
  ablauf: CodeAblauf;
  allesOk: boolean;
  onAbsenden: () => void;
  onAngemeldet: () => void;
};

/** Zwei Felder nebeneinander. */
function Paar({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>{children}</View>;
}

/** Ländervorwahl vor der Telefonnummer – klappt die Liste unter dem Feld auf. */
function VorwahlKnopf({ land, offen, onPress }: { land: WebLand; offen: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Vorwahl ${land.vorwahl}, ändern`}
      style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 8, marginLeft: -6, marginRight: 10, borderRadius: 9, backgroundColor: z.hovered || offen ? B.ton : "transparent" })}
    >
      <Text style={{ fontSize: 16 }}>{land.flagge}</Text>
      <Text style={{ ...n.fett, fontSize: 15, color: B.text }}>{land.vorwahl}</Text>
      <Icon name={offen ? "chevron-up" : "chevron-down"} size={13} color={B.text3} />
    </Pressable>
  );
}

function VorwahlListe({ laender, land, onWahl }: { laender: readonly WebLand[]; land: WebLand; onWahl: (l: WebLand) => void }) {
  return (
    <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: B.linie, paddingVertical: 6, flexDirection: "row", flexWrap: "wrap" }}>
      {laender.map((l) => {
        const aktiv = l.code === land.code;
        return (
          <Pressable
            key={l.code}
            onPress={() => onWahl(l)}
            style={(z: Zustand) => ({ width: "50%", flexDirection: "row", alignItems: "center", gap: 10, height: 40, paddingHorizontal: 14, backgroundColor: z.hovered ? B.hover : "transparent" })}
          >
            <Text style={{ fontSize: 16 }}>{l.flagge}</Text>
            <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, color: aktiv ? B.text : B.text2 }} numberOfLines={1}>
              {l.name}
            </Text>
            <Text style={{ ...n.fett, fontSize: 13.5, color: aktiv ? B.orange : B.text3 }}>{l.vorwahl}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RegistrierenWeb(p: RegistrierenWebProps) {
  const [vorwahlOffen, setVorwahlOffen] = useState(false);
  const zurueck = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (p.ablauf.gesendetAn) return <CodeWeb ablauf={p.ablauf} onAngemeldet={p.onAngemeldet} />;

  const benutzerHinweis =
    p.benutzer.length > 0 && !p.benutzerGueltig
      ? "3–20 Zeichen: a–z, 0–9, Punkt und Unterstrich."
      : p.frei === false
        ? "Dieser Benutzername ist schon vergeben."
        : p.frei
          ? "Der Benutzername ist frei."
          : "3–20 Zeichen: a–z, 0–9, Punkt und Unterstrich.";

  return (
    <AuthBuehne breite={600} onZurueck={zurueck}>
      <FormKachel>
        <FormKopf titel="Konto erstellen" unter="Beginne deine Reise zum Führerschein." />
        {!serverVerbunden ? <Meldung art="hinweis" text="Die App ist noch mit keinem Server verbunden. Registrieren klappt erst danach – bis dahin kannst du ohne Konto lernen." /> : null}

        <View style={{ gap: 18 }}>
          <View style={{ gap: 7 }}>
            <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>Ich bin</Text>
            <Paar>
              {p.rollen.map((r) => (
                <WahlKachel key={r.id} aktiv={r.id === p.rolle} onPress={() => p.onRolle(r.id)} label={r.titel} style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 30 }}>
                    {r.icon ? <Icon name={r.icon} size={22} color={r.id === p.rolle ? B.orange : B.text3} /> : null}
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...n.fett, fontSize: 15, color: B.text }}>{r.titel}</Text>
                      {r.unter ? (
                        <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }} numberOfLines={1}>
                          {r.unter}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </WahlKachel>
              ))}
            </Paar>
          </View>

          <Paar>
            <View style={{ flex: 1 }}>
              <Feld label="Vorname" value={p.vorname} onChangeText={p.onVorname} placeholder="Max" autoCapitalize="words" textContentType="givenName" autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <Feld label="Nachname" value={p.nachname} onChangeText={p.onNachname} placeholder="Muster" autoCapitalize="words" textContentType="familyName" autoComplete="family-name" />
            </View>
          </Paar>

          <Feld
            label="Benutzername"
            icon="at"
            value={p.benutzer}
            onChangeText={p.onBenutzer}
            placeholder="dein_name"
            autoCapitalize="none"
            autoCorrect={false}
            fehler={p.frei === false}
            hinweis={benutzerHinweis}
            hinweisTon={p.frei === false || (p.benutzer.length > 0 && !p.benutzerGueltig) ? "schlecht" : p.frei ? "gut" : undefined}
          />

          <View style={{ gap: 10 }}>
            <Paar>
              <View style={{ flex: 1.25 }}>
                <Feld
                  label="Telefon (optional)"
                  links={<VorwahlKnopf land={p.land} offen={vorwahlOffen} onPress={() => setVorwahlOffen((o) => !o)} />}
                  value={p.telefon}
                  onChangeText={p.onTelefon}
                  placeholder="151 23456789"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  fehler={!p.telefonOk}
                  hinweis={!p.telefonOk ? "Bitte eine gültige Nummer eingeben." : undefined}
                  hinweisTon="schlecht"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Feld
                  label="Geburtsdatum (optional)"
                  icon="calendar-outline"
                  value={p.geburt}
                  onChangeText={p.onGeburt}
                  placeholder="TT.MM.JJJJ"
                  keyboardType="number-pad"
                  maxLength={10}
                  fehler={!p.geburtOk && p.geburt.length === 10}
                  hinweis={!p.geburtOk && p.geburt.length === 10 ? "Dieses Datum gibt es nicht." : undefined}
                  hinweisTon="schlecht"
                />
              </View>
            </Paar>
            {vorwahlOffen ? (
              <VorwahlListe
                laender={p.laender}
                land={p.land}
                onWahl={(l) => {
                  p.onLand(l);
                  setVorwahlOffen(false);
                }}
              />
            ) : null}
          </View>

          {p.rolle === "schueler" ? (
            <View style={{ gap: 7 }}>
              <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>Führerscheinklasse</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {p.klassen.map((k) => {
                  const aktiv = k.id === p.klasse;
                  return (
                    <Pressable
                      key={k.id}
                      onPress={() => p.onKlasse(k.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: aktiv }}
                      accessibilityLabel={`${k.titel}, ${k.unter ?? ""}`}
                      style={(z: Zustand) => ({
                        flexBasis: "40%",
                        flexGrow: 1,
                        height: 48,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingHorizontal: 14,
                        borderWidth: 1.5,
                        borderColor: aktiv ? B.orange : z.hovered ? B.kante : B.linie,
                        backgroundColor: aktiv ? B.orangeHell : z.hovered ? B.hover : B.flaeche,
                      })}
                    >
                      <Text style={{ ...n.schwarz, fontSize: 16, color: aktiv ? B.orangeKante : B.text, minWidth: 26 }}>{k.id}</Text>
                      <Text style={{ flex: 1, ...n.halb, fontSize: 13, color: aktiv ? B.orangeKante : B.text2 }} numberOfLines={1}>
                        {k.unter}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Feld
            label="E-Mail"
            icon="mail-outline"
            value={p.email}
            onChangeText={p.onEmail}
            placeholder="name@beispiel.de"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            hinweis="Hierhin schicken wir dir einen Code – ein Passwort brauchst du nicht."
            returnKeyType="go"
            onSubmitEditing={p.onAbsenden}
          />
        </View>

        {p.ablauf.fehler ? <Meldung text={p.ablauf.fehler} /> : null}
        <HauptKnopf titel="Code senden" laedt={p.ablauf.laedt} deaktiviert={!p.allesOk} onPress={p.onAbsenden} />
        <Wechsel frage="Bereits ein Konto?" aktion="Anmelden" onPress={() => router.replace("/anmelden")} />
      </FormKachel>
    </AuthBuehne>
  );
}
