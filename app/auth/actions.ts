"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  message?: string;
}

function basisUrl(): string {
  const origin = headers().get("origin");
  return origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Anmeldung mit E-Mail und Passwort. */
export async function anmelden(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const passwort = String(formData.get("passwort") ?? "");
  const weiter = String(formData.get("weiter") ?? "/dashboard") || "/dashboard";

  if (!email || !passwort) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });

  if (error) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  revalidatePath("/", "layout");
  redirect(weiter.startsWith("/") ? weiter : "/dashboard");
}

/** Registrierung eines neuen Accounts. */
export async function registrieren(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const passwort = String(formData.get("passwort") ?? "");
  const passwortWdh = String(formData.get("passwort_wdh") ?? "");

  if (!email || !passwort) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }
  if (passwort.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (passwort !== passwortWdh) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwort,
    options: { emailRedirectTo: `${basisUrl()}/auth/callback?weiter=/auth/setup` },
  });

  if (error) {
    return { error: error.message };
  }

  // Falls E-Mail-Bestätigung aktiv ist, existiert noch keine Session.
  if (!data.session) {
    return {
      message:
        "Fast geschafft! Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige deine Adresse und melde dich anschließend an.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/auth/setup");
}

/** Abmelden und zurück zum Login. */
export async function abmelden(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

/** Passwort-Zurücksetzen-Link anfordern. */
export async function passwortVergessen(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Bitte E-Mail-Adresse eingeben." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${basisUrl()}/auth/callback?weiter=/auth/passwort-zuruecksetzen`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message:
      "Falls ein Konto mit dieser Adresse existiert, haben wir dir einen Link zum Zurücksetzen geschickt.",
  };
}

/** Neues Passwort nach Klick auf den Reset-Link setzen. */
export async function passwortAktualisieren(_prev: FormState, formData: FormData): Promise<FormState> {
  const passwort = String(formData.get("passwort") ?? "");
  const passwortWdh = String(formData.get("passwort_wdh") ?? "");

  if (passwort.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (passwort !== passwortWdh) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: passwort });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Firmen-Ersteinrichtung: legt Fahrschule + Chef-Datensatz an. */
export async function fahrschuleEinrichten(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();

  if (!name || !vorname || !nachname) {
    return { error: "Bitte Fahrschulname sowie Vor- und Nachname angeben." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.rpc("setup_fahrschule", {
    p_name: name,
    p_vorname: vorname,
    p_nachname: nachname,
    p_strasse: String(formData.get("strasse") ?? "").trim() || null,
    p_plz: String(formData.get("plz") ?? "").trim() || null,
    p_ort: String(formData.get("ort") ?? "").trim() || null,
    p_telefon: String(formData.get("telefon") ?? "").trim() || null,
    p_email: String(formData.get("email") ?? "").trim() || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
