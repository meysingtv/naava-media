export type DemoInput = {
  name: string;
  fahrschule: string;
  ort: string;
  email: string;
  telefon: string;
  fahrlehrer: string;
  nachricht?: string;
  website?: string; // Honeypot – muss leer bleiben
};

export type DemoLead = {
  name: string;
  fahrschule: string;
  ort: string;
  email: string;
  telefon: string;
  fahrlehrer: string;
  nachricht: string;
};

export type ValidationResult = { ok: true; value: DemoLead } | { ok: false; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(v: unknown, max = 300): string {
  return String(v ?? "")
    // Steuerzeichen entfernen
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);
}

export function validateDemo(raw: unknown): ValidationResult {
  const data = (raw ?? {}) as Partial<DemoInput>;

  // Honeypot: von Bots ausgefüllt -> als Erfolg behandeln, aber nicht verarbeiten
  if (clean(data.website, 100)) {
    return { ok: false, errors: { _bot: "spam" } };
  }

  const value: DemoLead = {
    name: clean(data.name, 120),
    fahrschule: clean(data.fahrschule, 160),
    ort: clean(data.ort, 120),
    email: clean(data.email, 160),
    telefon: clean(data.telefon, 60),
    fahrlehrer: clean(data.fahrlehrer, 40),
    nachricht: clean(data.nachricht, 2000),
  };

  const errors: Record<string, string> = {};
  if (value.name.length < 2) errors.name = "Bitte gib deinen Namen an.";
  if (value.fahrschule.length < 2) errors.fahrschule = "Bitte gib den Namen der Fahrschule an.";
  if (value.ort.length < 2) errors.ort = "Bitte gib den Ort an.";
  if (!EMAIL_RE.test(value.email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (value.telefon.replace(/[^\d]/g, "").length < 5) errors.telefon = "Bitte gib eine gültige Telefonnummer an.";
  if (!value.fahrlehrer) errors.fahrlehrer = "Bitte wähle die Anzahl der Fahrlehrer.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}
