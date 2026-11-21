import { PageTopbar, type PageTopbarProps } from "@/components/shared/page-topbar";

export type PageHeaderProps = PageTopbarProps;

/**
 * Seitenkopf v3 – identisch zu `PageTopbar`, nur unter dem im Bestand
 * verwendeten Namen. Alle bisherigen Aufrufe (`title`, `description`,
 * `eyebrow`, `children`) bleiben gültig: `eyebrow` wird zur ersten
 * Breadcrumb-Stufe, `children` zu den Seitenaktionen.
 */
export function PageHeader(props: PageHeaderProps) {
  return <PageTopbar {...props} />;
}
