/** Überschrift der Anmeldeseiten: Titel und ein Satz darunter. */
export function AuthKopf({ titel, text }: { titel: string; text?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">{titel}</h1>
      {text && <p className="mt-2 text-sm text-foreground-secondary">{text}</p>}
    </div>
  );
}
