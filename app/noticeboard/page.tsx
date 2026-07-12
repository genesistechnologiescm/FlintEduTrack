import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NoticeboardView, type NoticeboardData, type Notice } from "@/components/NoticeboardView";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  author: { displayName: string };
};

function toNotice(n: Row): Notice {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    author: n.author.displayName,
    date: n.createdAt.toISOString().slice(0, 10),
  };
}

// The national board is PUBLIC, like /national — circulars are public
// information (they hang on physical boards). Signed-in viewers additionally
// see their own school's board (the school board hangs INSIDE the compound),
// and Flint admins see the pending-review queue with approve/reject.
export default async function NoticeboardPage() {
  const published = await prisma.announcement.findMany({
    where: { audience: "NATIONAL", status: "PUBLISHED", deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { author: { select: { displayName: true } } },
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pending: Row[] = [];
  let isFlint = false;
  let school: NoticeboardData["school"] = null;

  if (user) {
    const me = await prisma.user.findUnique({ where: { id: user.id }, select: { isFlintAdmin: true } });
    isFlint = !!me?.isFlintAdmin;
    if (isFlint) {
      pending = await prisma.announcement.findMany({
        where: { audience: "NATIONAL", status: "PENDING_REVIEW", deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { displayName: true } } },
      });
    }

    // The viewer's school: staff membership first, else parent link, else
    // student enrolment. One school is enough for the board.
    const membership = await prisma.schoolMembership.findFirst({ where: { userId: user.id, status: "active" } });
    let schoolId = membership?.schoolId ?? null;
    if (!schoolId) {
      const link = await prisma.parentLink.findFirst({ where: { parentUserId: user.id, status: "active" } });
      schoolId = link?.schoolId ?? null;
    }
    if (!schoolId) {
      const acct = await prisma.studentAccount.findUnique({ where: { id: user.id } });
      if (acct) {
        const enr = await prisma.enrollment.findFirst({
          where: { studentId: acct.studentId, status: "ACTIVE" },
          orderBy: { enrolledAt: "desc" },
        });
        schoolId = enr?.schoolId ?? null;
      }
    }
    if (schoolId) {
      const [s, posts] = await Promise.all([
        prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
        prisma.announcement.findMany({
          where: { schoolId, audience: "SCHOOL", status: "PUBLISHED", deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { author: { select: { displayName: true } } },
        }),
      ]);
      if (s) school = { name: s.name, posts: posts.map(toNotice) };
    }
  }

  const data: NoticeboardData = {
    national: published.map(toNotice),
    pending: pending.map(toNotice),
    isFlint,
    school,
  };
  return <NoticeboardView data={data} />;
}
