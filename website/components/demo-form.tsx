"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import { cn } from "@/components/ui";

type Status = "idle" | "loading" | "success" | "error";
const FELD =
  "h-12 w-full rounded-xl border-2 border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:opacity-60";
const LABEL = "mb-1.5 block text-[14px] font-bold text-ink";
const ERR = "border-[#D23F3F]";

function Fehler({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-[13px] font-semibold text-[#D23F3F]">{msg}</p>;
}

export function DemoForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setErrors({});
    setServerError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("success");
        return;
      }
      if (data.errors) setErrors(data.errors);
      setServerError(data.error || "Bitte prüfe deine Eingaben.");
      setStatus("error");
    } catch {
      setServerError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl bg-brand-light p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-white">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-[24px] font-extrabold tracking-tight text-ink">Anfrage ist da – danke!</h3>
        <p className="mx-auto mt-2 max-w-[38ch] text-[15px] leading-relaxed text-ink/70">
          Wir melden uns innerhalb von 24 Stunden persönlich bei dir, um einen Demo-Termin abzustimmen. Schau ggf. auch in deinen Spam-Ordner.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL}>
            Name *
          </label>
          <input id="name" name="name" required autoComplete="name" className={cn(FELD, errors.name && ERR)} placeholder="Vor- und Nachname" />
          <Fehler msg={errors.name} />
        </div>
        <div>
          <label htmlFor="fahrschule" className={LABEL}>
            Fahrschule *
          </label>
          <input id="fahrschule" name="fahrschule" required autoComplete="organization" className={cn(FELD, errors.fahrschule && ERR)} placeholder="Name deiner Fahrschule" />
          <Fehler msg={errors.fahrschule} />
        </div>
        <div>
          <label htmlFor="ort" className={LABEL}>
            Ort *
          </label>
          <input id="ort" name="ort" required autoComplete="address-level2" className={cn(FELD, errors.ort && ERR)} placeholder="z. B. Berlin" />
          <Fehler msg={errors.ort} />
        </div>
        <div>
          <label htmlFor="fahrlehrer" className={LABEL}>
            Anzahl Fahrlehrer *
          </label>
          <select id="fahrlehrer" name="fahrlehrer" required defaultValue="" className={cn(FELD, "appearance-none", errors.fahrlehrer && ERR)}>
            <option value="" disabled>
              Bitte wählen
            </option>
            <option value="1">1 (Einzelfahrschule)</option>
            <option value="2-3">2–3</option>
            <option value="4-6">4–6</option>
            <option value="7+">7 oder mehr</option>
          </select>
          <Fehler msg={errors.fahrlehrer} />
        </div>
        <div>
          <label htmlFor="email" className={LABEL}>
            E-Mail *
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={cn(FELD, errors.email && ERR)} placeholder="name@fahrschule.de" />
          <Fehler msg={errors.email} />
        </div>
        <div>
          <label htmlFor="telefon" className={LABEL}>
            Telefon *
          </label>
          <input id="telefon" name="telefon" type="tel" required autoComplete="tel" className={cn(FELD, errors.telefon && ERR)} placeholder="0170 1234567" />
          <Fehler msg={errors.telefon} />
        </div>
      </div>

      <div>
        <label htmlFor="nachricht" className={LABEL}>
          Nachricht <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="nachricht" name="nachricht" rows={4} className={cn(FELD, "h-auto py-2.5")} placeholder="Was ist dir bei einer Software wichtig?" />
      </div>

      {status === "error" && serverError && (
        <div className="flex items-center gap-2 rounded-xl bg-[#D23F3F]/10 px-3.5 py-2.5 text-[14px] font-semibold text-[#D23F3F]">
          <AlertCircle className="h-4 w-4 shrink-0" /> {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-1 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-orange px-8 text-[16px] font-bold text-white shadow-cta transition-all hover:-translate-y-0.5 hover:bg-orange-dark disabled:opacity-70"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet …
          </>
        ) : (
          "Demo anfordern"
        )}
      </button>
      <p className="text-[12.5px] leading-relaxed text-muted">
        Mit dem Absenden stimmst du zu, dass wir dich zur Anfrage kontaktieren dürfen. Kein Newsletter, keine Weitergabe.
      </p>
    </form>
  );
}
