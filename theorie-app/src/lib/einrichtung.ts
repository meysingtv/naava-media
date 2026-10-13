import AsyncStorage from "@react-native-async-storage/async-storage";

// Merkt sich je Gerät, ob die Einrichtung nach der Registrierung (Klasse,
// Prüfungstermin, Tagesziel, Darstellung) schon durchlaufen wurde.

const SCHLUESSEL = "spur-einrichtung-v1";

export async function einrichtungOffen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SCHLUESSEL)) !== "fertig";
  } catch {
    return false;
  }
}

export function einrichtungErledigt() {
  AsyncStorage.setItem(SCHLUESSEL, "fertig").catch(() => {});
}
