import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

// Adresse der Website. In ipad/.env via EXPO_PUBLIC_SITE_URL überschreibbar
// (z. B. die LAN-IP des Macs im Dev oder die Live-Domain).
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL?.trim() || "http://192.168.178.78:3000";

export function WebApp() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <WebView
        source={{ uri: SITE_URL }}
        originWhitelist={["*"]}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        )}
        // Auth-Cookies der Website behalten
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        // iOS: Wischen zum Zurück, Ziehen zum Aktualisieren
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        style={styles.web}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6F9" },
  web: { flex: 1, backgroundColor: "#F4F6F9" },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F9",
  },
});
