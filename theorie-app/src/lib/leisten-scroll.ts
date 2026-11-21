import { useMemo } from "react";
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { makeMutable, withSpring } from "react-native-reanimated";

// Tab-Leiste auf Android wie bei iOS 26: Beim Runterscrollen klappt sie zu
// einer kleinen Kapsel zusammen, beim Hochscrollen (oder Antippen) wieder
// auf. Auf dem iPhone macht das die native Leiste selbst.

/** 0 = Leiste offen, 1 = eingeklappt. Wird in der Leiste animiert gelesen. */
export const leisteKlein = makeMutable(0);

const FEDER = { damping: 22, stiffness: 240, mass: 0.8 };
/** So weit (in Punkten) muss man in eine Richtung scrollen, bevor sie umschaltet. */
const SCHWELLE = 28;
/** Nahe am Anfang der Seite bleibt die Leiste immer offen. */
const OBEN = 80;

let eingeklappt = false;
let letzteY = 0;
let strecke = 0;
/** Nach einem Reiterwechsel: erst die Position der neuen Seite merken, nicht werten. */
let frisch = true;

function setzen(klein: boolean) {
  if (klein === eingeklappt) return;
  eingeklappt = klein;
  leisteKlein.value = withSpring(klein ? 1 : 0, FEDER);
}

/** Leiste wieder aufklappen (Reiterwechsel, Antippen der kleinen Kapsel). */
export function leisteAufklappen() {
  strecke = 0;
  frisch = true;
  setzen(false);
}

function beimScrollen(e: NativeSyntheticEvent<NativeScrollEvent>) {
  const y = e.nativeEvent.contentOffset.y;
  const d = frisch ? 0 : y - letzteY;
  letzteY = y;
  frisch = false;
  if (y < OBEN) {
    strecke = 0;
    setzen(false);
    return;
  }
  if (d === 0) return;
  // Richtungswechsel: neu zählen.
  strecke = Math.sign(d) === Math.sign(strecke) ? strecke + d : d;
  if (strecke > SCHWELLE) setzen(true);
  else if (strecke < -SCHWELLE) setzen(false);
}

/** Für die ScrollView einer Tab-Seite: `<ScrollView {...useLeistenScroll()} …>` */
export function useLeistenScroll(): { onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void; scrollEventThrottle?: number } {
  return useMemo(() => (Platform.OS === "ios" ? {} : { onScroll: beimScrollen, scrollEventThrottle: 16 }), []);
}
