import type { ReactNode } from "react";
import { Platform, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView, type SFSymbol, type SymbolWeight } from "expo-symbols";

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Auf dem iPhone echte SF Symbols wie in der Vorlage, sonst Ionicons.
 * Die Namen bleiben Ionicons-Namen, damit alle Stellen gleich bleiben.
 */
const SF: Partial<Record<IconName, SFSymbol>> = {
  "arrow-back": "arrow.left",
  "arrow-forward": "arrow.right",
  close: "xmark",
  "chevron-forward": "chevron.right",
  "chevron-back": "chevron.left",
  search: "magnifyingglass",
  heart: "heart.fill",
  "heart-outline": "heart",
  notifications: "bell.fill",
  "notifications-outline": "bell",
  flame: "flame.fill",
  star: "star.fill",
  "stats-chart": "chart.bar.fill",
  book: "book.fill",
  "book-outline": "book",
  clipboard: "list.bullet.clipboard.fill",
  "school-outline": "graduationcap",
  "warning-outline": "exclamationmark.triangle",
  warning: "exclamationmark.triangle.fill",
  leaf: "leaf.fill",
  settings: "gearshape.fill",
  "settings-outline": "gearshape",
  walk: "figure.walk",
  speedometer: "speedometer",
  person: "person.fill",
  "person-outline": "person",
  calculator: "plus.forwardslash.minus",
  checkmark: "checkmark",
  "checkmark-circle": "checkmark.circle.fill",
  "checkmark-done": "checkmark.circle",
  "close-circle": "xmark.circle.fill",
  bulb: "lightbulb.fill",
  "bulb-outline": "lightbulb",
  "play-circle": "play.circle.fill",
  "play-circle-outline": "play.circle",
  flash: "bolt.fill",
  trophy: "trophy.fill",
  "trophy-outline": "trophy",
  home: "house.fill",
  "home-outline": "house",
  "time-outline": "clock",
  "layers-outline": "square.stack.3d.up",
  "alert-circle-outline": "exclamationmark.circle",
  "shield-checkmark": "checkmark.shield.fill",
  "shield-checkmark-outline": "checkmark.shield",
  "eye-off-outline": "eye.slash",
  "eye-outline": "eye",
  refresh: "arrow.clockwise",
  bookmark: "bookmark.fill",
  "bookmark-outline": "bookmark",
  "share-outline": "square.and.arrow.up",
  "diamond-outline": "diamond",
  "log-out-outline": "rectangle.portrait.and.arrow.right",
  "people-outline": "person.2",
  "images-outline": "photo.on.rectangle",
  "open-outline": "arrow.up.right.square",
  help: "questionmark",
  "map-outline": "map",
  "mail-outline": "envelope",
  "lock-closed-outline": "lock",
  "lock-closed": "lock.fill",
  at: "at",
  "person-add-outline": "person.badge.plus",
  "help-buoy-outline": "lifepreserver",
  "shield-outline": "shield",
  "document-text-outline": "doc.text",
  "reader-outline": "doc.plaintext",
  "refresh-circle-outline": "arrow.clockwise.circle",
  "swap-horizontal": "arrow.left.arrow.right",
  "hourglass-outline": "hourglass",
  flag: "flag.fill",
  "trail-sign": "signpost.right.fill",
  "car-outline": "car.fill",
  // Clips
  film: "play.rectangle.on.rectangle.fill",
  "film-outline": "play.rectangle.on.rectangle",
  "chatbubble-ellipses": "ellipsis.bubble.fill",
  "arrow-redo": "arrowshape.turn.up.right.fill",
  "ellipsis-horizontal": "ellipsis",
  "volume-mute": "speaker.slash.fill",
  "volume-high": "speaker.wave.2.fill",
  add: "plus",
  play: "play.fill",
  "arrow-up": "arrow.up",
  "cloud-offline-outline": "icloud.slash",
  "log-in-outline": "person.crop.circle.badge.checkmark",
  // Schilder-Jagd
  camera: "camera.fill",
  "camera-outline": "camera",
  scan: "viewfinder",
  "image-outline": "photo",
  "grid-outline": "square.grid.3x3",
  flashlight: "flashlight.on.fill",
  "flashlight-outline": "flashlight.off.fill",
  "help-circle-outline": "questionmark.circle",
  sparkles: "sparkles",
  albums: "rectangle.stack.fill",
  "location-outline": "mappin.and.ellipse",
  // Karteikarten
  "albums-outline": "rectangle.stack",
  "create-outline": "square.and.pencil",
  "trash-outline": "trash",
  "sync-outline": "arrow.triangle.2.circlepath",
};

export function Icon({
  name,
  sf,
  fallback,
  size = 22,
  color,
  weight = "medium",
  style,
}: {
  name: IconName;
  /** Eigenes SF Symbol statt der Standardzuordnung. */
  sf?: SFSymbol;
  /** Eigene Darstellung außerhalb von iOS (z. B. ein anderes Icon-Set). */
  fallback?: ReactNode;
  size?: number;
  color: string;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
}) {
  const symbol = Platform.OS === "ios" ? sf ?? SF[name] : undefined;
  if (symbol) {
    return <SymbolView name={symbol} size={size} tintColor={color} weight={weight} type="monochrome" style={[{ width: size, height: size }, style]} />;
  }
  if (fallback) return <>{fallback}</>;
  return <Ionicons name={name} size={size} color={color} style={style as StyleProp<TextStyle>} />;
}
