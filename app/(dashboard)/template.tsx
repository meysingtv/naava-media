// Wird bei jedem Seitenwechsel neu gemountet → sanftes Einblenden (200 ms).
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
