"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface PortalAuthState {
  error?: string;
  message?: string;
}

function felder(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    passwort: String(formData.get("passwort") ?? ""),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
  };
}

async function istVerknuepft(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data } = await supabase.rpc("current_schueler_id");
  return Boolean(data);
}

/** Anmelden – optional mit Zugangscode beim ersten Mal. */
export async function portalAnmelden(
  _prev: PortalAuthState,
  formData: FormData,
): Promise<PortalAuthState> {
  const { email, passwort, code } = felder(formData);
  if (!email || !passwort) return { error: "Bitte E-Mail und Passwort eingeben." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
  if (error) return { error: "E-Mail oder Passwort ist falsch." };

  if (code) {
    await supabase.rpc("schueler_portal_verknuepfen", { p_code: code });
  }
  if (!(await istVerknuepft(supabase))) {
    await supabase.auth.signOut();
    return { error: "Dieses Konto ist mit keinem Fahrschüler verknüpft. Bitte gib deinen Zugangscode ein." };
  }

  redirect("/portal");
}

/** Konto erstellen und direkt mit Zugangscode verknüpfen. */
export async function portalRegistrieren(
  _prev: PortalAuthState,
  formData: FormData,
): Promise<PortalAuthState> {
  const { email, passwort, code } = felder(formData);
  if (!email || !passwort) return { error: "Bitte E-Mail und Passwort eingeben." };
  if (passwort.length < 8) return { error: "Das Passwort muss mindestens 8 Zeichen haben." };
  if (!code) return { error: "Bitte den Zugangscode aus deiner Fahrschule eingeben." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password: passwort });
  if (error) return { error: error.message };

  // Ohne E-Mail-Bestätigung gibt es sofort eine Session -> direkt verknüpfen.
  if (data.session) {
    await supabase.rpc("schueler_portal_verknuepfen", { p_code: code });
    if (!(await istVerknuepft(supabase))) {
      await supabase.auth.signOut();
      return { error: "Der Zugangscode ist ungültig oder bereits vergeben." };
    }
    redirect("/portal");
  }

  return {
    message:
      "Konto erstellt! Bitte bestätige deine E-Mail-Adresse und melde dich danach mit deinem Zugangscode an.",
  };
}

export async function portalAbmelden(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}
