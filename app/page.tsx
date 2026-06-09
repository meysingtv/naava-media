import { redirect } from "next/navigation";

// Die Middleware leitet je nach Anmeldestatus weiter. Diese Seite dient als Fallback.
export default function Home() {
  redirect("/dashboard");
}
