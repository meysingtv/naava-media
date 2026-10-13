import { Platform, type ImageSourcePropType } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// App-Icon wechseln (wie bei Snapchat+). Die Icons stehen in app.json beim
// Plugin „expo-alternate-app-icons“ und kommen erst mit einem neuen nativen
// Build ins App-Paket. In Expo Go, im Web und in älteren Builds fehlt das
// Modul – dann lässt sich nur die Vorschau ansehen.

type Nativ = {
  supportsAlternateIcons: boolean;
  getAppIconName(): string | null;
  setAlternateAppIcon(name: string | null): Promise<string | null>;
};

const nativ = Platform.OS === "web" ? null : requireOptionalNativeModule<Nativ>("ExpoAlternateAppIcons");

export type AppIcon = {
  /** Name wie in app.json – null ist das normale Icon. */
  id: string | null;
  titel: string;
  vorschau: ImageSourcePropType;
};

export const APP_ICONS: AppIcon[] = [
  { id: null, titel: "Standard", vorschau: require("../../assets/app-icons/vorschau/standard.png") },
  { id: "Klassik", titel: "Klassik", vorschau: require("../../assets/app-icons/vorschau/klassik.png") },
  { id: "Nacht", titel: "Nachtfahrt", vorschau: require("../../assets/app-icons/vorschau/nacht.png") },
  { id: "Orange", titel: "Orange", vorschau: require("../../assets/app-icons/vorschau/orange.png") },
  { id: "Ozean", titel: "Ozean", vorschau: require("../../assets/app-icons/vorschau/ozean.png") },
  { id: "Racing", titel: "Racing", vorschau: require("../../assets/app-icons/vorschau/racing.png") },
  { id: "Gold", titel: "Gold", vorschau: require("../../assets/app-icons/vorschau/gold.png") },
  { id: "Neon", titel: "Neon", vorschau: require("../../assets/app-icons/vorschau/neon.png") },
  { id: "Carbon", titel: "Carbon", vorschau: require("../../assets/app-icons/vorschau/carbon.png") },
  { id: "Sunset", titel: "Sunset", vorschau: require("../../assets/app-icons/vorschau/sunset.png") },
  { id: "Mint", titel: "Mint", vorschau: require("../../assets/app-icons/vorschau/mint.png") },
];

/** Kann dieses Gerät das Icon wirklich wechseln? */
export const iconWechselMoeglich = !!nativ?.supportsAlternateIcons;

/** Zuletzt gewählt – Android meldet das neue Icon erst nach einem Neustart. */
let gewaehlt: string | null | undefined;

/** Aktives Icon (null = Standard). */
export function aktivesIcon(): string | null {
  if (gewaehlt !== undefined) return gewaehlt;
  try {
    return nativ?.getAppIconName() ?? null;
  } catch {
    return null;
  }
}

/** Icon wechseln; wirft, wenn es nicht geht. */
export async function iconSetzen(id: string | null): Promise<void> {
  if (!nativ) throw new Error("Icon-Wechsel gibt es erst in der neuen App-Version.");
  await nativ.setAlternateAppIcon(id);
  gewaehlt = id;
}
