"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { MessagesHeader } from "./MessagesHeader";

type Item = { id: string; title: string; type: "LINK" | "NOTE"; url: string | null; body: string | null };
type SubjectGroup = { subject: string; items: Item[] };
export type ParentResourcesData = {
  children: {
    name: string;
    className: string;
    school: string;
    subjects: SubjectGroup[];
  }[];
};

export function ParentResources({ data }: { data: ParentResourcesData }) {
  const { t } = useI18n();
  const hasAny = data.children.some((c) => c.subjects.length > 0);

  return (
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <MessagesHeader backHref="/parent" parent />
      <h1 className="mb-1 -mt-3 font-display text-2xl font-bold text-flint-black">{t("resourcesNav")}</h1>
      <p className="mb-5 text-sm text-muted">{t("resIntro")}</p>

      {!hasAny ? (
        <p className="rounded-2xl border border-black/10 bg-white px-4 py-6 text-center text-muted">{t("resNone")}</p>
      ) : (
        <div className="space-y-5">
          {data.children.map((child, i) => (
            <section key={i} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="mb-3">
                <h2 className="font-display text-lg font-bold text-flint-black">{child.name}</h2>
                <p className="font-mono text-xs text-muted">
                  {child.school} · {child.className}
                </p>
              </div>

              {child.subjects.length === 0 ? (
                <p className="text-sm text-muted">{t("resNone")}</p>
              ) : (
                <div className="space-y-4">
                  {child.subjects.map((g) => (
                    <div key={g.subject}>
                      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">{g.subject}</h3>
                      <ul className="space-y-2">
                        {g.items.map((item) => (
                          <li key={item.id} className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-flint-black">{item.title}</span>
                              <span className="shrink-0 rounded-full bg-flint-blue/10 px-2 py-0.5 font-mono text-[10px] uppercase text-flint-blue">
                                {item.type === "LINK" ? t("resTypeLink") : t("resTypeNote")}
                              </span>
                            </div>
                            {item.type === "LINK" && item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex min-h-9 items-center font-mono text-xs text-flint-blue hover:underline"
                              >
                                {t("resOpen")} →
                              </a>
                            ) : (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-flint-black">{item.body}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
