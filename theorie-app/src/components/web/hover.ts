import type { ViewStyle } from "react-native";

// Gemeinsamer Hover im lila Design: alles gleitet kurz (180 ms) statt hart
// umzuspringen. Karten heben sich leicht an und bekommen mehr Schatten.

export const weich = { transitionProperty: "transform, box-shadow, border-color, background-color, opacity", transitionDuration: "180ms", transitionTimingFunction: "ease-out" } as unknown as ViewStyle;

/** Hover für Karten: anheben, Schatten größer, Rand zart lila. Gedrückt: kurz eindrücken. */
export function karteHover(an: boolean, gedrueckt?: boolean, rand = "#C9B2F8"): ViewStyle {
  return {
    ...weich,
    transform: [{ translateY: gedrueckt ? 0 : an ? -3 : 0 }, { scale: gedrueckt ? 0.985 : 1 }],
    ...(an ? { shadowOpacity: 0.18, shadowRadius: 26, borderColor: rand } : null),
  };
}

/** Hover für kleine Knöpfe und Chips: kaum anheben, beim Drücken eindrücken. */
export function knopfHover(an: boolean, gedrueckt?: boolean): ViewStyle {
  return { ...weich, transform: [{ translateY: gedrueckt ? 0 : an ? -1 : 0 }, { scale: gedrueckt ? 0.97 : 1 }] };
}
