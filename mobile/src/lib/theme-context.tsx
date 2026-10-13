import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";

import { darkColors, lightColors, type ThemeColors } from "./theme";

export type ThemeMode = "system" | "light" | "dark";

type ThemeValue = {
  colors: ThemeColors;
  mode: ThemeMode;
  schema: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "fahrschulapp.theme-mode";

const ThemeContext = createContext<ThemeValue>({
  colors: lightColors,
  mode: "system",
  schema: "light",
  setMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemSchema = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "light" || value === "dark" || value === "system") {
        setModeState(value);
      }
    });
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const value = useMemo<ThemeValue>(() => {
    const schema: "light" | "dark" =
      mode === "system" ? (systemSchema === "dark" ? "dark" : "light") : mode;
    return {
      colors: schema === "dark" ? darkColors : lightColors,
      mode,
      schema,
      setMode,
    };
  }, [mode, systemSchema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
