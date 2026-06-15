import { Slot } from "expo-router";

// Auf dem iPad gibt es keine untere Tableiste – die Navigation läuft über die
// feste Sidebar (siehe IpadSidebar im Root-Layout). Hier nur der Inhalt.
export default function TabsLayout() {
  return <Slot />;
}
