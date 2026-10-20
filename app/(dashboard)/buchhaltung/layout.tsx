import { nurMitZugriff } from "@/lib/zugriff";

/** Nur für Rollen, die diesen Bereich in der Navigation sehen. */
export default async function BereichLayout({ children }: { children: React.ReactNode }) {
  await nurMitZugriff("/buchhaltung");
  return <>{children}</>;
}
