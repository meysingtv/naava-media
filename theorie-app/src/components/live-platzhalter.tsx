import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

// Nur zum Testen im Simulator (dort gibt es keine Kamera): statt des Videos ein
// Selfie einer erfundenen, KI-erzeugten Person – leicht bewegt wie aus der Hand
// gefilmt, damit das Live echt wirkt. In fertigen App-Versionen nie zu sehen.

const BILD = require("../../assets/images/live-platzhalter.jpg");

export function LivePlatzhalter() {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(w, { toValue: 1, duration: 11000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [w]);
  const translateX = w.interpolate({ inputRange: [0, 0.2, 0.45, 0.7, 1], outputRange: [0, 6, -3, -6, 0] });
  const translateY = w.interpolate({ inputRange: [0, 0.15, 0.4, 0.65, 0.85, 1], outputRange: [0, -5, 3, -2, 4, 0] });
  const scale = w.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.07, 1.1, 1.07] });
  const rotate = w.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: ["0deg", "0.5deg", "-0.45deg", "0deg"] });
  return <Animated.Image source={BILD} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%", transform: [{ translateX }, { translateY }, { scale }, { rotate }] }]} />;
}
