import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveHome } from "@/lib/roleHome";
import { Welcome } from "@/components/Welcome";

export const dynamic = "force-dynamic";

export default async function Home() {
  // A signed-in visitor is a returning user, not a prospect — send them straight
  // to their own space so they never land on the marketing page.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(await resolveHome(user.id));

  return <Welcome />;
}
