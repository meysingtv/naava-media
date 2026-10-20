import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin-Client mit Service-Role-Key. NUR serverseitig verwenden – dieser Key
 * umgeht die Row Level Security. Gibt `null` zurück, wenn kein Key gesetzt ist,
 * damit die aufrufende Stelle eine verständliche Meldung anzeigen kann.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
