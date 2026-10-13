import { Redirect } from "expo-router";

import { useKonto } from "@/lib/konto";

export default function Start() {
  const { drin } = useKonto();
  return <Redirect href={drin ? "/heute" : "/willkommen"} />;
}
