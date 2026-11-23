import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";

import { QrCode, zeitVor } from "@/components/crew";
import { dialog } from "@/components/dialog";
import { Icon, type IconName } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { Abschnitt, B, Balken, Chip, Eingabe, Kachel, Knopf, n, Reiter, Spalte, Symbol, THEMA_TON, TOENE, UnterKopf, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { bossVon, CREW_MAX, crewLink, heuteGeschafft, useCrew, type Crew, type CrewBoss, type CrewDaten, type CrewEreignis, type CrewMitglied } from "@/lib/crew";
import { themaVon } from "@/lib/fragen";
import { erfolg } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";

// Crew am PC: links die Flamme von heute, die Mitglieder und was los war,
// rechts der Wochen-Boss und das Einladen (QR-Code, Code, Link). Ohne Crew
// eine ruhige Seite zum Gründen bzw. Beitreten, daneben was eine Crew kann.

const GRAU: Ton = { farbe: "#8A8F96", kante: "#6E737A", hell: "#F0F1F2" };

export function einladungsText(crewName: string, code: string) {
  return `Lern mit mir für den Führerschein! Komm in meine Crew „${crewName}“ bei Fahrschul Pro.\n\nCode: ${code}\n${crewLink(code)}`;
}

/** Text in die Zwischenablage – `kopiert` ist kurz wahr, damit der Knopf „Kopiert“ zeigen kann. */
function useKopieren() {
  const [kopiert, setKopiert] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const kopieren = useCallback(async (schluessel: string, text: string) => {
    await Clipboard.setStringAsync(text);
    erfolg();
    setKopiert(schluessel);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKopiert(null), 2000);
  }, []);
  return { kopiert, kopieren };
}

// ---------------------------------------------------------------------------
// Kleine Bausteine (auch für den Wochen-Boss)
// ---------------------------------------------------------------------------

/** Liste in einer Kachel – die Zeilen sind durch feine Linien getrennt. */
export function ListenKachel({ children }: { children: ReactNode }) {
  const kinder = Children.toArray(children);
  return (
    <Kachel>
      {kinder.map((k, i) => (
        <View key={i} style={{ borderTopWidth: i ? 1.5 : 0, borderTopColor: B.ton }}>
          {k}
        </View>
      ))}
    </Kachel>
  );
}

function ereignisInfo(e: CrewEreignis, ich?: string): { icon: IconName; ton: Ton; text: string; wert?: string; wertTon?: Ton } {
  const du = !!ich && e.user_id === ich;
  const wer = du ? "Du" : (e.name ?? "Jemand");
  const hat = du ? "hast" : "hat";
  switch (e.art) {
    case "gruendung":
      return { icon: "sparkles", ton: TOENE.orange, text: `${wer} ${hat} die Crew gegründet` };
    case "beitritt":
      return { icon: "person-add", ton: TOENE.gruen, text: du ? "Du bist dabei" : `${wer} ist dabei` };
    case "austritt":
      return { icon: "log-out", ton: GRAU, text: `${wer} ${hat} die Crew verlassen` };
    case "stupser":
      return { icon: "paper-plane", ton: TOENE.orange, text: e.an_mich ? `${wer} ${hat} dich angestupst` : `${wer} ${hat} ${e.ziel_name ?? "jemanden"} angestupst` };
    case "flamme":
      return { icon: "flame", ton: TOENE.orange, text: `Alle haben es geschafft – Tag ${e.wert}!` };
    case "sieg":
      return { icon: "trophy", ton: TOENE.gelb, text: `${wer} ${hat} den Boss erledigt!` };
    case "treffer":
    default: {
      const schaden = e.wert >= 0;
      return {
        icon: "flash",
        ton: schaden ? TOENE.gruen : TOENE.rot,
        text: `${wer}: ${e.richtig} richtig${e.falsch ? `, ${e.falsch} falsch` : ""}`,
        wert: `${schaden ? "−" : "+"}${Math.abs(e.wert)} HP`,
        wertTon: schaden ? TOENE.gruen : TOENE.rot,
      };
    }
  }
}

/** Ein Ereignis der Crew als Zeile: Bild bzw. Symbol, Text, Zeit, rechts der Wert. */
export function EreignisZeileWeb({ e, ich }: { e: CrewEreignis; ich?: string }) {
  const x = ereignisInfo(e, ich);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, paddingHorizontal: 18, paddingVertical: 10 }}>
      {e.user_id && e.name ? <NutzerBild pfad={e.bild} name={e.name} farbe={e.farbe ?? undefined} groesse={36} rand={0} /> : <Symbol icon={x.icon} ton={x.ton} groesse={36} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={2}>
          {x.text}
        </Text>
        <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>{zeitVor(e.zeit)}</Text>
      </View>
      {x.wert && x.wertTon ? <Chip text={x.wert} ton={x.wertTon} /> : null}
    </View>
  );
}

/** Kasten für Gäste: Crew, Boss und Duelle brauchen ein Konto. */
export function KontoNoetig({ titel, text }: { titel: string; text: string }) {
  return (
    <Kachel style={{ padding: 28, gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Symbol icon="person-add" ton={TOENE.blau} groesse={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>{titel}</Text>
          <Text style={{ ...n.halb, fontSize: 15, lineHeight: 21, color: B.text2 }}>{text}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <Knopf titel="Konto erstellen" icon="person-add" ton="gruen" onPress={() => router.push("/registrieren")} style={{ minWidth: 200 }} />
        <Knopf titel="Ich habe schon ein Konto" art="rand" ton="blau" onPress={() => router.push("/anmelden")} />
      </View>
    </Kachel>
  );
}

/** Was eine Crew kann – rechts neben Gründen und Beitreten. */
function CrewVorteile() {
  const punkte: { icon: IconName; ton: Ton; titel: string; text: string }[] = [
    { icon: "people", ton: TOENE.koralle, titel: `Bis zu ${CREW_MAX} Freunde`, text: "Ihr seht, wer heute schon gelernt hat – und könnt euch anstupsen." },
    { icon: "flame", ton: TOENE.orange, titel: "Eine gemeinsame Flamme", text: "Sie wächst jeden Tag, an dem alle ihr Tagesziel schaffen." },
    { icon: "flash", ton: TOENE.rot, titel: "Jede Woche ein Boss", text: "Aus eurem schwächsten Thema. Jede richtige Antwort trifft ihn." },
    { icon: "trophy", ton: TOENE.gelb, titel: "Belohnung für alle", text: "Abzeichen „Bossbezwinger“ und eine XP-Truhe, wenn ihr gewinnt." },
  ];
  return (
    <View>
      <ListenKachel>
        <Text style={{ ...n.schwarz, fontSize: 18, color: B.text, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 }}>So läuft eine Crew</Text>
        {punkte.map((p) => (
          <View key={p.titel} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 }}>
            <Symbol icon={p.icon} ton={p.ton} groesse={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }}>{p.titel}</Text>
              <Text style={{ ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text2 }}>{p.text}</Text>
            </View>
          </View>
        ))}
      </ListenKachel>
    </View>
  );
}

/** Zwei Spalten: links der Hauptteil, rechts eine feste Spalte. */
export function ZweiSpalten({ links, rechts, rechtsBreite = 360 }: { links: ReactNode; rechts: ReactNode; rechtsBreite?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
      <View style={{ flex: 1, minWidth: 0, gap: 32 }}>{links}</View>
      <View style={{ width: rechtsBreite, gap: 24 }}>{rechts}</View>
    </View>
  );
}

function TextLink({ text, onPress, farbe = B.blau, links }: { text: string; onPress: () => void; farbe?: string; links?: boolean }) {
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => ({ alignSelf: links ? "flex-start" : undefined, opacity: z.hovered ? 0.7 : 1 })}>
      <Text style={{ ...n.fett, fontSize: 14.5, color: farbe }}>{text}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Gründen und Beitreten
// ---------------------------------------------------------------------------

export function CrewGruendenWeb({ moeglich, gruenden }: { moeglich: boolean; gruenden: (name: string) => Promise<string | null> }) {
  const { profil } = useKonto();
  const [name, setName] = useState(profil?.name ? `Crew von ${profil.name.split(" ")[0]}` : "");
  const [laeuft, setLaeuft] = useState(false);

  async function los() {
    if (laeuft || !name.trim()) return;
    setLaeuft(true);
    const f = await gruenden(name);
    setLaeuft(false);
    if (f) dialog("Crew gründen", f);
    else erfolg();
  }

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Crew gründen" unter="Lernt zusammen. Besteht zusammen." />
        <ZweiSpalten
          rechtsBreite={420}
          links={
            moeglich ? (
              <Kachel style={{ padding: 28, gap: 22 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Gib deiner Crew einen Namen</Text>
                  <Text style={{ ...n.halb, fontSize: 15, color: B.text2 }}>Danach lädst du Freunde per Link, QR-Code oder Code ein.</Text>
                </View>
                <Eingabe titel="Name der Crew" value={name} onChangeText={setName} placeholder="z. B. Die Raser" maxLength={30} icon="people" returnKeyType="done" onSubmitEditing={los} autoFocus />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                  <Knopf titel={laeuft ? "Wird gegründet …" : "Crew gründen"} icon="arrow-forward" groesse="gross" onPress={los} deaktiviert={laeuft || !name.trim()} style={{ minWidth: 220 }} />
                  <TextLink text="Ich habe schon einen Code" onPress={() => router.replace("/crew-beitreten")} />
                </View>
              </Kachel>
            ) : (
              <KontoNoetig titel="Für eine Crew brauchst du ein Konto" text="Mit einem kostenlosen Konto lernst du mit Freunden – dein bisheriger Lernstand bleibt erhalten." />
            )
          }
          rechts={<CrewVorteile />}
        />
      </Spalte>
    </WebSeite>
  );
}

export function CrewBeitretenWeb({
  code,
  onCode,
  laeuft,
  onBeitreten,
  moeglich,
  schonDrin,
}: {
  code: string;
  onCode: (c: string) => void;
  laeuft: boolean;
  onBeitreten: () => void;
  moeglich: boolean;
  /** Crew, in der man schon ist. */
  schonDrin: Crew | null;
}) {
  const vollstaendig = code.replace("-", "").length === 8;

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Crew beitreten" unter="Lernt zusammen – mit Flamme und Wochen-Boss." />
        <ZweiSpalten
          rechtsBreite={420}
          links={
            !moeglich ? (
              <KontoNoetig titel="Für eine Crew brauchst du ein Konto" text="Mit einem kostenlosen Konto trittst du der Crew deiner Freunde bei – dein bisheriger Lernstand bleibt erhalten." />
            ) : schonDrin ? (
              <Kachel style={{ padding: 28, gap: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Symbol icon="people" ton={TOENE.koralle} groesse={52} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Du bist schon in „{schonDrin.name}“</Text>
                    <Text style={{ ...n.halb, fontSize: 15, lineHeight: 21, color: B.text2 }}>Um zu wechseln, verlasse deine Crew zuerst – das geht auf der Crew-Seite unten rechts.</Text>
                  </View>
                </View>
                <Knopf titel="Zu meiner Crew" icon="arrow-forward" onPress={() => router.replace("/crew")} style={{ alignSelf: "flex-start", minWidth: 200 }} />
              </Kachel>
            ) : (
              <Kachel style={{ padding: 28, gap: 22 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Code eingeben</Text>
                  <Text style={{ ...n.halb, fontSize: 15, color: B.text2 }}>Den Code findest du bei deinen Freunden unter Profil → Meine Crew.</Text>
                </View>
                <Eingabe
                  value={code}
                  onChangeText={onCode}
                  placeholder="ABCD-1234"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={9}
                  icon="qr-code"
                  returnKeyType="go"
                  autoFocus
                  onSubmitEditing={() => vollstaendig && !laeuft && onBeitreten()}
                  style={{ ...n.schwarz, fontSize: 22, letterSpacing: 3 }}
                />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                  <Knopf titel={laeuft ? "Einen Moment …" : "Beitreten"} icon="arrow-forward" groesse="gross" onPress={onBeitreten} deaktiviert={laeuft || !vollstaendig} style={{ minWidth: 220 }} />
                  <TextLink text="Lieber selbst eine Crew gründen" onPress={() => router.replace("/crew")} />
                </View>
              </Kachel>
            )
          }
          rechts={<CrewVorteile />}
        />
      </Spalte>
    </WebSeite>
  );
}

// ---------------------------------------------------------------------------
// Meine Crew
// ---------------------------------------------------------------------------

function MitgliedZeileWeb({ m, gestupst, onStupsen }: { m: CrewMitglied; gestupst: boolean; onStupsen: () => void }) {
  const fertig = m.heute >= m.ziel;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 72, paddingHorizontal: 18, paddingVertical: 12 }}>
      <Pressable onPress={() => router.push({ pathname: "/nutzer/[id]", params: { id: m.id } })} accessibilityLabel={`Profil von ${m.name}`} style={(z: Zustand) => ({ opacity: z.hovered ? 0.8 : 1 })}>
        <NutzerBild pfad={m.bild} name={m.name} farbe={m.farbe} groesse={44} rand={0} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <Text style={{ flexShrink: 1, ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
            {m.name}
            {m.ich ? <Text style={{ color: B.text3 }}> · du</Text> : null}
          </Text>
          <Text style={{ ...n.halb, fontSize: 13, color: B.text3, fontVariant: ["tabular-nums"] }}>
            {Math.min(m.heute, 999)} / {m.ziel} heute
          </Text>
        </View>
        <Balken anteil={m.heute / Math.max(1, m.ziel)} ton={fertig ? TOENE.gruen : TOENE.orange} hoehe={8} />
      </View>
      <View style={{ width: 132, alignItems: "flex-end" }}>
        {fertig ? (
          <Chip icon="checkmark" text="Geschafft" ton={TOENE.gruen} />
        ) : m.ich ? (
          <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>noch {m.ziel - m.heute}</Text>
        ) : (
          <Knopf titel={gestupst ? "Gestupst" : "Anstupsen"} icon={gestupst ? "checkmark" : "paper-plane"} art="rand" ton="orange" groesse="klein" deaktiviert={gestupst} onPress={onStupsen} />
        )}
      </View>
    </View>
  );
}

/** Flamme von heute: wer es schon geschafft hat, Tage, Rekord. */
function FlammeKachel({ crew, mitglieder }: { crew: Crew; mitglieder: CrewMitglied[] }) {
  const geschafft = heuteGeschafft(mitglieder);
  const alle = geschafft >= mitglieder.length;
  return (
    <Kachel style={{ padding: 26, gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
          <Text style={{ ...n.fett, fontSize: 14.5, color: B.text3 }}>Heute</Text>
          <Text style={{ ...n.schwarz, fontSize: 28, color: B.text, fontVariant: ["tabular-nums"] }}>
            {geschafft} <Text style={{ color: B.text3 }}>von {mitglieder.length} geschafft</Text>
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 28 }}>
          {[
            { icon: "flame" as IconName, ton: crew.flamme > 0 ? TOENE.orange : GRAU, wert: crew.flamme, titel: crew.flamme === 1 ? "Tag Flamme" : "Tage Flamme" },
            { icon: "trophy" as IconName, ton: TOENE.gelb, wert: crew.flamme_beste, titel: "Rekord" },
          ].map((w) => (
            <View key={w.titel} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name={w.icon} size={28} color={w.ton.farbe} />
              <View>
                <Text style={{ ...n.schwarz, fontSize: 22, lineHeight: 26, color: B.text, fontVariant: ["tabular-nums"] }}>{w.wert}</Text>
                <Text style={{ ...n.halb, fontSize: 12.5, color: B.text2 }}>{w.titel}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <Balken anteil={mitglieder.length ? geschafft / mitglieder.length : 0} ton={alle ? TOENE.gruen : TOENE.orange} hoehe={12} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {mitglieder.map((m) => {
            const fertig = m.heute >= m.ziel;
            return (
              <View key={m.id} accessibilityLabel={`${m.name}: ${fertig ? "geschafft" : "noch offen"}`} style={{ padding: 2, borderRadius: 21, borderWidth: 2, borderColor: fertig ? B.gruen : B.linie }}>
                <NutzerBild pfad={m.bild} name={m.name} farbe={m.farbe} groesse={32} rand={0} />
                {fertig ? (
                  <View style={{ position: "absolute", right: -5, bottom: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: B.gruen, borderWidth: 2, borderColor: B.flaeche, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        <Text style={{ flex: 1, minWidth: 220, ...n.halb, fontSize: 14, color: B.text2 }}>
          {alle ? (crew.flamme_heute ? "Alle haben ihr Tagesziel – die Flamme brennt weiter." : "Alle haben ihr Tagesziel geschafft.") : "Die Flamme wächst jeden Tag, an dem alle ihr Tagesziel schaffen."}
        </Text>
      </View>
    </Kachel>
  );
}

function restZeit(bis: string): string {
  const ms = new Date(`${bis}T00:00:00`).getTime() - Date.now();
  if (ms <= 0) return "endet gleich";
  const tage = Math.floor(ms / 86400000);
  if (tage >= 1) return `noch ${tage} ${tage === 1 ? "Tag" : "Tage"}`;
  return `noch ${Math.floor((ms % 86400000) / 3600000)} Std.`;
}

/** Wochen-Boss im Kleinen – führt zur Boss-Seite. */
function BossKachel({ boss }: { boss: CrewBoss }) {
  const b = bossVon(boss.thema);
  const thema = themaVon(boss.thema);
  return (
    <View>
      <Abschnitt titel="Wochen-Boss" link={boss.besiegt ? "besiegt" : restZeit(boss.bis)} />
      <Kachel onPress={() => router.push("/crew-boss")} style={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: B.ton, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 32, lineHeight: 40, opacity: boss.besiegt ? 0.5 : 1 }}>{b.emoji}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }} numberOfLines={1}>
              {b.name}
            </Text>
            <Text style={{ ...n.halb, fontSize: 13.5, color: THEMA_TON[boss.thema].kante }} numberOfLines={1}>
              {thema.titel}
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} color={B.text3} />
        </View>
        {boss.besiegt ? (
          <Chip icon="checkmark" text="Diese Woche besiegt" ton={TOENE.gruen} />
        ) : (
          <View style={{ gap: 7 }}>
            <Balken anteil={boss.hp_max ? boss.hp / boss.hp_max : 0} ton={TOENE.rot} hoehe={10} />
            <Text style={{ ...n.halb, fontSize: 13, color: B.text2, fontVariant: ["tabular-nums"] }}>
              {boss.hp} / {boss.hp_max} HP übrig
            </Text>
          </View>
        )}
      </Kachel>
    </View>
  );
}

type Teilen = "qr" | "code" | "link";

function EinladenKachel({ crew }: { crew: Crew }) {
  const [art, setArt] = useState<Teilen>("qr");
  const { kopiert, kopieren } = useKopieren();
  const link = crewLink(crew.code);
  return (
    <View>
      <Abschnitt titel="Freunde einladen" />
      <Kachel style={{ padding: 20, gap: 18 }}>
        <Reiter<Teilen>
          optionen={[
            { id: "qr", titel: "QR-Code" },
            { id: "code", titel: "Code" },
            { id: "link", titel: "Link" },
          ]}
          wert={art}
          onWechsel={setArt}
        />
        <View style={{ alignItems: "center", gap: 12, minHeight: 210, justifyContent: "center" }}>
          {art === "qr" ? (
            <>
              <View style={{ padding: 8, borderRadius: 18, borderWidth: 1.5, borderColor: B.linie }}>
                <QrCode wert={link} groesse={168} />
              </View>
              <Text style={{ ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text2, textAlign: "center" }}>Mit der Handykamera scannen – die App öffnet sich direkt beim Beitreten.</Text>
            </>
          ) : art === "code" ? (
            <>
              <Text selectable style={{ ...n.schwarz, fontSize: 38, letterSpacing: 4, color: B.text, fontVariant: ["tabular-nums"] }}>
                {crew.code}
              </Text>
              <Text style={{ ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text2, textAlign: "center" }}>Freunde geben den Code unter Profil → Meine Crew → Code eingeben ein.</Text>
              <Knopf titel={kopiert === "code" ? "Kopiert" : "Code kopieren"} icon={kopiert === "code" ? "checkmark" : "copy"} art="rand" ton="blau" groesse="klein" onPress={() => kopieren("code", crew.code)} />
            </>
          ) : (
            <>
              <Symbol icon="link" ton={TOENE.blau} groesse={52} />
              <Text style={{ ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text2, textAlign: "center" }}>Schick die Einladung per WhatsApp, Instagram oder E-Mail – der Code steht als Rückfall mit drin.</Text>
            </>
          )}
        </View>
        <Knopf titel={kopiert === "text" ? "Einladung kopiert" : "Einladung kopieren"} icon={kopiert === "text" ? "checkmark" : "copy"} onPress={() => kopieren("text", einladungsText(crew.name, crew.code))} />
      </Kachel>
    </View>
  );
}

export function CrewWeb() {
  const { daten, neuLaden, verlassen, stupsen, gruenden, moeglich } = useCrew();

  useFocusEffect(
    useCallback(() => {
      neuLaden();
    }, [neuLaden]),
  );

  if (!daten?.crew || !daten.mitglieder) return <CrewGruendenWeb moeglich={moeglich} gruenden={gruenden} />;
  return <CrewAnsichtWeb daten={daten} crew={daten.crew} mitglieder={daten.mitglieder} stupsen={stupsen} verlassen={verlassen} />;
}

/** Meine Crew – nur Anzeige, die Daten kommen von außen. */
export function CrewAnsichtWeb({
  daten,
  crew,
  mitglieder,
  stupsen,
  verlassen,
}: {
  daten: CrewDaten;
  crew: Crew;
  mitglieder: CrewMitglied[];
  stupsen: (id: string) => Promise<string | null>;
  verlassen: () => Promise<string | null>;
}) {
  const [gestupst, setGestupst] = useState<Record<string, boolean>>({});
  const voll = mitglieder.length >= CREW_MAX;
  const ich = mitglieder.find((m) => m.ich)?.id;

  async function anstupsen(m: CrewMitglied) {
    const f = await stupsen(m.id);
    if (f) dialog("Anstupsen", f);
    else {
      erfolg();
      setGestupst((g) => ({ ...g, [m.id]: true }));
    }
  }

  function verlassenFragen() {
    dialog("Crew verlassen?", mitglieder.length > 1 ? "Die Flamme brennt für die anderen weiter. Du kannst später per Code zurückkommen." : "Du bist allein in der Crew – sie wird dann gelöscht.", [
      { text: "Bleiben", style: "cancel" },
      {
        text: "Verlassen",
        style: "destructive",
        onPress: async () => {
          const f = await verlassen();
          if (f) dialog("Crew verlassen", f);
        },
      },
    ]);
  }

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel={crew.name} unter={`${mitglieder.length} von ${CREW_MAX} Mitgliedern${crew.gruender ? " · von dir gegründet" : ""}`} />
        <ZweiSpalten
          links={
            <>
              <FlammeKachel crew={crew} mitglieder={mitglieder} />
              <View>
                <Abschnitt titel="Mitglieder" link={`${mitglieder.length} / ${CREW_MAX}`} />
                <ListenKachel>
                  {mitglieder.map((m) => (
                    <MitgliedZeileWeb key={m.id} m={m} gestupst={!!gestupst[m.id]} onStupsen={() => anstupsen(m)} />
                  ))}
                </ListenKachel>
              </View>
              {daten.ereignisse && daten.ereignisse.length > 0 ? (
                <View>
                  <Abschnitt titel="Was los war" />
                  <ListenKachel>
                    {daten.ereignisse.slice(0, 12).map((e) => (
                      <EreignisZeileWeb key={e.id} e={e} ich={ich} />
                    ))}
                  </ListenKachel>
                </View>
              ) : null}
            </>
          }
          rechts={
            <>
              {daten.boss ? <BossKachel boss={daten.boss} /> : null}
              {!voll ? (
                <EinladenKachel crew={crew} />
              ) : (
                <Kachel style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Symbol icon="people" ton={TOENE.koralle} groesse={40} />
                  <Text style={{ flex: 1, ...n.halb, fontSize: 14, lineHeight: 20, color: B.text2 }}>Eure Crew ist voll – mehr als {CREW_MAX} gehen nicht.</Text>
                </Kachel>
              )}
              <TextLink text="Crew verlassen" farbe={B.rotKante} onPress={verlassenFragen} links />
            </>
          }
        />
      </Spalte>
    </WebSeite>
  );
}
