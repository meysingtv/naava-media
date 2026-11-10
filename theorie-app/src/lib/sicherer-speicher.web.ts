import AsyncStorage from "@react-native-async-storage/async-storage";

// Im Browser gibt es keinen Schlüsselbund – dort bleibt der normale Speicher.
export const sichererSpeicher = AsyncStorage;
