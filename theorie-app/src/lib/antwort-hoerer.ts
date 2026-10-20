/**
 * Kleine Meldestelle für beantwortete Fragen: Der Lernstand meldet jede Antwort,
 * andere Teile der App (z. B. der Wochen-Boss der Crew) hören mit.
 */
type Hoerer = (frageId: string, richtig: boolean) => void;

const hoerer = new Set<Hoerer>();

export function antwortHoeren(h: Hoerer): () => void {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

export function antwortMelden(frageId: string, richtig: boolean) {
  for (const h of hoerer) {
    try {
      h(frageId, richtig);
    } catch {
      // Ein Zuhörer darf das Lernen nie stören.
    }
  }
}
