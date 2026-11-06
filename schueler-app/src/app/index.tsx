import { Redirect } from "expo-router";

import { useAuth } from "@/lib/auth";

export default function Index() {
  const { session, verknuepft, laedt } = useAuth();
  if (laedt) return null;
  return <Redirect href={session && verknuepft ? "/(tabs)/start" : "/login"} />;
}
