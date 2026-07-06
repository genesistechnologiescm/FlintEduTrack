import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ThreadList, ThreadView, type ThreadSummary, type ThreadMessage } from "@/components/Messaging";
import { PageTitle } from "@/components/PageTitle";

export const dynamic = "force-dynamic";

const BASE = "/admin/messages";

function stamp(d: Date) {
  return d.toISOString().slice(5, 16).replace("T", " ");
}

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: threadId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
  });
  if (!membership) redirect("/login");
  const schoolId = membership.schoolId;

  // Single thread view
  if (threadId) {
    const thread = await prisma.messageThread.findFirst({
      where: { id: threadId, schoolId },
      include: { parent: true, student: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (thread) {
      const messages: ThreadMessage[] = thread.messages.map((m) => ({
        id: m.id,
        fromParent: m.fromParent,
        body: m.body,
        date: stamp(m.createdAt),
      }));
      const aboutName = thread.student
        ? `${thread.parent.displayName} · ${thread.student.firstName} ${thread.student.lastName}`
        : thread.parent.displayName;
      return (
        <ThreadView threadId={thread.id} subject={thread.subject} aboutName={aboutName} isStaff messages={messages} basePath={BASE} />
      );
    }
  }

  // List
  const threads = await prisma.messageThread.findMany({
    where: { schoolId },
    orderBy: { lastMessageAt: "desc" },
    include: { parent: true, student: true, messages: { orderBy: { createdAt: "desc" } } },
  });

  const items: ThreadSummary[] = threads.map((th) => ({
    id: th.id,
    subject: th.subject,
    otherName: th.student ? `${th.parent.displayName} · ${th.student.firstName} ${th.student.lastName}` : th.parent.displayName,
    snippet: th.messages[0]?.body ?? "",
    date: stamp(th.lastMessageAt),
    unread: th.messages.filter((m) => m.fromParent && m.readAt === null).length,
  }));

  return (
    <>
      <PageTitle titleKey="messagesNav" />
      <ThreadList items={items} basePath={BASE} />
    </>
  );
}
