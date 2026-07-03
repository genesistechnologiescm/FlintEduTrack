import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Library, type LibraryData } from "@/components/Library";

export const dynamic = "force-dynamic";

// The digital library is a shared shelf for every signed-in user — student,
// parent or staff. Content is curated server-side (read-only surface).
export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await prisma.libraryItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ subject: "asc" }, { year: "desc" }, { paper: "asc" }],
    take: 500,
  });

  const data: LibraryData = {
    items: items.map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      subject: i.subject,
      exam: i.exam,
      year: i.year,
      paper: i.paper,
      url: i.url,
      body: i.body,
    })),
  };

  return <Library data={data} />;
}
