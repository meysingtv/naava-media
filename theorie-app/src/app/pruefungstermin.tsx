import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Gruppe, Knopf, Kopf, T, Zeile } from "@/components/ui";
import { datumLang, uhrzeit } from "@/lib/format";
import { erfolg } from "@/lib/haptik";
import { countdownMoeglich, pruefungstagErinnerungPlanen, tageText, terminDatum, terminText } from "@/lib/pruefungstag";
import { useStand } from "@/lib/stand";
import { abstand, farben, RAND } from "@/lib/theme";

/** Vorschlag, wenn noch nichts eingetragen ist: in zwei Wochen um 10 Uhr. */
function vorschlag(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(10, 0, 0, 0);
  return d;
}

/** Termin der Theorieprüfung eintragen – für Countdown und Erinnerung am Prüfungstag. */
export default function Pruefungstermin() {
  const insets = useSafeAreaInsets();
  const { stand, setzen } = useStand();
  const gespeichert = terminDatum(stand.pruefungstermin);
  const [wert, setWert] = useState<Date>(() => gespeichert ?? vorschlag());
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const inEinemJahr = new Date(heute);
  inEinemJahr.setFullYear(heute.getFullYear() + 1);
  const vergangen = wert.getTime() <= Date.now();
  const countdown = countdownMoeglich();

  function datumSetzen(d: Date) {
    setWert((alt) => {
      const neu = new Date(alt);
      neu.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      return neu;
    });
  }

  function zeitSetzen(d: Date) {
    setWert((alt) => {
      const neu = new Date(alt);
      neu.setHours(d.getHours(), d.getMinutes(), 0, 0);
      return neu;
    });
  }

  function androidWaehlen(modus: "date" | "time") {
    DateTimePickerAndroid.open({
      value: wert,
      mode: modus,
      is24Hour: true,
      minimumDate: modus === "date" ? heute : undefined,
      maximumDate: modus === "date" ? inEinemJahr : undefined,
      onChange: (ereignis, d) => {
        if (ereignis.type !== "set" || !d) return;
        if (modus === "date") datumSetzen(d);
        else zeitSetzen(d);
      },
    });
  }

  function speichern() {
    const iso = wert.toISOString();
    setzen({ pruefungstermin: iso });
    erfolg();
    pruefungstagErinnerungPlanen(iso, true);
    router.back();
  }

  function entfernen() {
    setzen({ pruefungstermin: null });
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Prüfungstermin" schliessen />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: abstand(8), gap: abstand(5) }}>
        <View style={{ flexDirection: "row", gap: abstand(3), padding: abstand(4), borderRadius: 18, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
          <Icon name={countdown ? "phone-portrait-outline" : "notifications-outline"} size={22} color={farben.orange} />
          <T v="klein" style={{ flex: 1 }}>
            {countdown
              ? "Am Prüfungstag läuft ein Countdown auf deinem Sperrbildschirm und in der Dynamic Island. Morgens bekommst du dazu eine kurze Erinnerung."
              : "Am Morgen des Prüfungstags bekommst du eine kurze Erinnerung mit deiner Uhrzeit."}
          </T>
        </View>

        {Platform.OS === "ios" ? (
          <View style={{ borderRadius: 18, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie, padding: abstand(2) }}>
            <DateTimePicker
              value={wert}
              mode="date"
              display="inline"
              minimumDate={heute}
              maximumDate={inEinemJahr}
              onChange={(_, d) => d && datumSetzen(d)}
              themeVariant="dark"
              accentColor={farben.orange}
              locale="de-DE"
            />
          </View>
        ) : null}

        {Platform.OS === "web" ? (
          <T v="klein">Den Termin trägst du in der App auf deinem Handy ein.</T>
        ) : (
          <Gruppe>
            {Platform.OS === "android" ? (
              <Zeile icon="calendar-outline" iconFarbe={farben.orange} titel="Datum" wert={datumLang(wert)} onPress={() => androidWaehlen("date")} />
            ) : null}
            {Platform.OS === "android" ? (
              <Zeile icon="time-outline" iconFarbe={farben.orange} titel="Uhrzeit" wert={`${uhrzeit(wert.getHours(), wert.getMinutes())} Uhr`} onPress={() => androidWaehlen("time")} />
            ) : (
              <Zeile
                icon="time-outline"
                iconFarbe={farben.orange}
                titel="Uhrzeit"
                rechts={
                  <DateTimePicker
                    value={wert}
                    mode="time"
                    display="compact"
                    minuteInterval={5}
                    onChange={(_, d) => d && zeitSetzen(d)}
                    themeVariant="dark"
                    accentColor={farben.orange}
                    locale="de-DE"
                  />
                }
              />
            )}
          </Gruppe>
        )}

        <View style={{ gap: 2 }}>
          <T v="mini" farbe={vergangen ? farben.rot : farben.orange}>
            {vergangen ? "Dieser Zeitpunkt ist schon vorbei" : tageText(wert)}
          </T>
          <T v="h3">{terminText(wert)}</T>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), gap: abstand(2), borderTopWidth: 1, borderColor: farben.linie }}>
        <Knopf titel="Termin speichern" icon="checkmark" onPress={speichern} deaktiviert={vergangen || Platform.OS === "web"} />
        {gespeichert ? <Knopf titel="Termin entfernen" art="geist" onPress={entfernen} /> : null}
      </View>
    </View>
  );
}
