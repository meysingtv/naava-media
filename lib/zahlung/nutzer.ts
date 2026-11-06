import "server-only";
import type { NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type ZahlungsNutzer = { id: string; email: string | null };

/** Angemeldeter Nutzer: die App schickt ihr Supabase-Token, das Portal hat seine Sitzung im Cookie. */
export async function nutzerAusAnfrage(request: NextRequest): Promise<ZahlungsNutzer | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token) {
    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase.auth.getUser(token);
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  }
  const { data } = await createClient().auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}
