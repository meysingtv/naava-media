"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKontext } from "@/lib/supabase/queries";
import type { FahrlehrerRolle } from "@/lib/types";

function basisUrl(): string {
  const konfiguriert = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (konfiguriert) return konfiguriert.replace(/\/+$/, "");
  return headers().get("origin") ?? "http://localhost:3000";
}

export interface BenutzerState {
  error?: string;
  ok?: boolean;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Legt einen Benutzer an oder aktualisiert ihn (abhängig vom Feld `id`). */
export async function benutzerSpeichern(
  _prev: BenutzerState,
  formData: FormData,
): Promise<BenutzerState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Keine Fahrschule gefunden." };
  if (kontext.fahrlehrer?.rolle !== "chef") {
    return { error: "Nur der Chef darf Benutzer verwalten." };
  }

  const id = leerZuNull(formData.get("id"));
  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  if (!vorname || !nachname) return { error: "Bitte Vor- und Nachname angeben." };

  const klassen = formData.getAll("klassen").map(String);
  const email = leerZuNull(formData.get("email"));

  const datensatz = {
    vorname,
    nachname,
    kuerzel: leerZuNull(formData.get("kuerzel")),
    rolle: (String(formData.get("rolle") ?? "fahrlehrer") as FahrlehrerRolle) || "fahrlehrer",
    email,
    telefon: leerZuNull(formData.get("telefon")),
    telefon_privat: leerZuNull(formData.get("telefon_privat")),
    strasse: leerZuNull(formData.get("strasse")),
    plz: leerZuNull(formData.get("plz")),
    ort: leerZuNull(formData.get("ort")),
    geburtsdatum: leerZuNull(formData.get("geburtsdatum")),
    geburtsort: leerZuNull(formData.get("geburtsort")),
    notiz: leerZuNull(formData.get("notiz")),
    fuehrerscheinklassen: klassen,
  };

  const supabase = createClient();
  let benutzerId = id;

  if (id) {
    const { error } = await supabase.from("fahrlehrer").update(datensatz).eq("id", id);
    if (error) return { error: error.message };
  } else {
    // Optional: Login-Zugang per E-Mail einladen (benötigt Service-Role-Key).
    let userId: string | null = null;
    if (formData.get("einladen") === "on") {
      if (!email) return { error: "Für eine Einladung wird eine E-Mail-Adresse benötigt." };
      const admin = createAdminClient();
      if (!admin) {
        return {
          error:
            "E-Mail-Einladung ist nicht eingerichtet (SUPABASE_SERVICE_ROLE_KEY fehlt, siehe README).",
        };
      }
      const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${basisUrl()}/auth/callback?weiter=/auth/passwort-zuruecksetzen`,
      });
      if (inviteError) return { error: `Einladung fehlgeschlagen: ${inviteError.message}` };
      userId = data.user?.id ?? null;
    }

    const { data, error } = await supabase
      .from("fahrlehrer")
      .insert({ ...datensatz, fahrschule_id: kontext.fahrschule.id, user_id: userId, aktiv: true })
      .select("id")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "Der Benutzer konnte nicht angelegt werden." };
    }
    benutzerId = data.id;
  }

  revalidatePath("/fahrlehrer");
  redirect(`/fahrlehrer?id=${benutzerId}`);
}

export async function fahrlehrerAktivSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const aktiv = formData.get("aktiv") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrlehrer").update({ aktiv }).eq("id", id);
  revalidatePath("/fahrlehrer");
}

export async function fahrlehrerLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrlehrer").delete().eq("id", id);
  revalidatePath("/fahrlehrer");
  redirect("/fahrlehrer");
}
