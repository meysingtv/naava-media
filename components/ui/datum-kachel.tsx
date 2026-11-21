/** Kachel mit Wochentag und Tag – für Prüfungen und Termine. */
export function DatumKachel({ datum, farbe }: { datum: string; farbe: string }) {
  const d = new Date(`${datum}T12:00:00`);
  return (
    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] text-white" style={{ background: farbe }}>
      <span className="text-[10px] font-medium leading-3 text-white/85">
        {d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")}
      </span>
      <span className="text-13 font-semibold leading-4 tabular-nums">{d.getDate()}.</span>
    </span>
  );
}
