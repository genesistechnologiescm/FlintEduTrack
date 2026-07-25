import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveHome } from "@/lib/roleHome";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in (e.g. opening the installed app) — skip the form.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(await resolveHome(user.id));

  return <LoginForm />;
}
