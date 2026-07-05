import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ThreadList, NewThreadForm, ThreadView, type ThreadSummary, type ThreadMessage } from "@/components/Messaging";
import { PageTitle } from "@/components/PageTitle";

export const dynamic = "force-dynamic";

const BASE = "/parent/messages";

function stamp(d: Date) {
  return d.toISOString().slice(5, 16).replace("T", " ");
}

export default async function ParentMessagesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: threadId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Single thread view
  if (threadId) {
    const thread = await prisma.messageThread.findFirst({
      where: { id: threadId, parentUserId: user.id },
      include: { school: true, student: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (thread) {
      const messages: ThreadMessage[] = thread.messages.map((m) => ({
        id: m.id,
        fromParent: m.fromParent,
        body: m.body,
        date: stamp(m.createdAt),
      }));
      const aboutName = thread.student
        ? `${thread.student.firstName} ${thread.student.lastName} · ${thread.school.name}`
        : thread.school.name;
      return <ThreadView threadId={thread.id} subject={thread.subject} aboutName={aboutName} isStaff={false} messages={messages} basePath={BASE} />;
    }
  }

  // List + new-thread form
  const [links, threads] = await Promise.all([
    prisma.parentLink.findMany({ where: { parentUserId: user.id, status: "active" }, include: { student: true } }),
    prisma.messageThread.findMany({
      where: { parentUserId: user.id },
      orderBy: { lastMessageAt: "desc" },
      include: { school: true, messages: { orderBy: { createdAt: "desc" } } },
    }),
  ]);

  const children = links.map((l) => ({ id: l.studentId, name: `${l.student.firstName} ${l.student.lastName}` }));
  const items: ThreadSummary[] = threads.map((th) => ({
    id: th.id,
    subject: th.subject,
    otherName: th.school.name,
    snippet: th.messages[0]?.body ?? "",
    date: stamp(th.lastMessageAt),
    unread: th.messages.filter((m) => !m.fromParent && m.readAt === null).length,
  }));

  return (
    <>
      <PageTitle titleKey="messagesNav" />
      {children.length > 0 && (
        <div className="mb-4">
          <NewThreadForm children={children} basePath={BASE} />
        </div>
      )}
      <ThreadList items={items} basePath={BASE} />
    </>
  );
}
