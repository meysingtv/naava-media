"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import { cn } from "@/components/ui";

type Status = "idle" | "loading" | "success" | "error";
const FELD =
  "h-11 w-full rounded-xl border border-line2 bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-mint focus:outline-none focus:ring-4 focus:ring-mint/15 disabled:opacity-60";

function Fehler({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-[13px] font-medium text-[#D23F3F]">{msg}</p>;
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
      <div className="rounded-2xl border border-mint-hi bg-mint-soft p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-mint text-white">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-[22px] font-bold text-ink">Anfrage ist da – danke!</h3>
        <p className="mx-auto mt-2 max-w-[38ch] text-[15px] text-ink/70">
          Wir melden uns zeitnah persönlich bei dir, um einen Demo-Termin abzustimmen. Schau ggf. auch in deinen Spam-Ordner.
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
          <label htmlFor="name" className="mb-1.5 block text-[14px] font-semibold">Name *</label>
          <input id="name" name="name" required autoComplete="name" className={cn(FELD, errors.name && "border-[#D23F3F]")} placeholder="Vor- und Nachname" />
          <Fehler msg={errors.name} />
        </div>
        <div>
          <label htmlFor="fahrschule" className="mb-1.5 block text-[14px] font-semibold">Fahrschule *</label>
          <input id="fahrschule" name="fahrschule" required autoComplete="organization" className={cn(FELD, errors.fahrschule && "border-[#D23F3F]")} placeholder="Name deiner Fahrschule" />
          <Fehler msg={errors.fahrschule} />
        </div>
        <div>
          <label htmlFor="ort" className="mb-1.5 block text-[14px] font-semibold">Ort *</label>
          <input id="ort" name="ort" required autoComplete="address-level2" className={cn(FELD, errors.ort && "border-[#D23F3F]")} placeholder="z. B. Berlin" />
          <Fehler msg={errors.ort} />
        </div>
        <div>
          <label htmlFor="fahrlehrer" className="mb-1.5 block text-[14px] font-semibold">Anzahl Fahrlehrer *</label>
          <select id="fahrlehrer" name="fahrlehrer" required defaultValue="" className={cn(FELD, "appearance-none", errors.fahrlehrer && "border-[#D23F3F]")}>
            <option value="" disabled>Bitte wählen</option>
            <option value="1">1 (Einzelfahrschule)</option>
            <option value="2-3">2–3</option>
            <option value="4-6">4–6</option>
            <option value="7+">7 oder mehr</option>
          </select>
          <Fehler msg={errors.fahrlehrer} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[14px] font-semibold">E-Mail *</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={cn(FELD, errors.email && "border-[#D23F3F]")} placeholder="name@fahrschule.de" />
          <Fehler msg={errors.email} />
        </div>
        <div>
          <label htmlFor="telefon" className="mb-1.5 block text-[14px] font-semibold">Telefon *</label>
          <input id="telefon" name="telefon" type="tel" required autoComplete="tel" className={cn(FELD, errors.telefon && "border-[#D23F3F]")} placeholder="0170 1234567" />
          <Fehler msg={errors.telefon} />
        </div>
      </div>

      <div>
        <label htmlFor="nachricht" className="mb-1.5 block text-[14px] font-semibold">Nachricht <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="nachricht" name="nachricht" rows={4} className={cn(FELD, "h-auto py-2.5")} placeholder="Was ist dir bei einer Software wichtig?" />
      </div>

      {status === "error" && serverError && (
        <div className="flex items-center gap-2 rounded-xl bg-[#D23F3F]/10 px-3.5 py-2.5 text-[14px] font-medium text-[#D23F3F]">
          <AlertCircle className="h-4 w-4 shrink-0" /> {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-mint px-6 text-[15.5px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(26,127,78,.6)] transition-colors hover:bg-mint-dark disabled:opacity-70"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet …
          </>
        ) : (
          "Demo anfordern"
        )}
      </button>
      <p className="text-[12.5px] text-muted">Mit dem Absenden stimmst du zu, dass wir dich zur Anfrage kontaktieren dürfen. Kein Newsletter, keine Weitergabe.</p>
    </form>
  );
}
