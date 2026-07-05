"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { MessagesHeader } from "./MessagesHeader";

type Item = { id: string; title: string; type: "LINK" | "NOTE"; url: string | null; body: string | null };
type SubjectGroup = { subject: string; items: Item[] };
export type ParentResourcesData = {
  children: { name: string; className: string; school: string; subjects: SubjectGroup[] }[];
};

export function ParentResources({ data }: { data: ParentResourcesData }) {
  const { t } = useI18n();
  const hasAny = data.children.some((c) => c.subjects.length > 0);

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[560px] px-4 pb-16">
        <MessagesHeader backHref="/parent" parent titleKey="resourcesNav" />
        <p className="mb-4 text-sm text-muted">{t("resIntro")}</p>

        {!hasAny ? (
          <p className="et-card px-4 py-6 text-center text-muted">{t("resNone")}</p>
        ) : (
          <div className="space-y-4">
            {data.children.map((child, i) => (
              <section key={i} className="et-card p-5">
                <div className="mb-3">
                  <h2 className="font-display text-lg font-semibold">{child.name}</h2>
                  <p className="font-mono text-xs text-muted">{child.school} · {child.className}</p>
                </div>

                {child.subjects.length === 0 ? (
                  <p className="text-sm text-muted">{t("resNone")}</p>
                ) : (
                  <div className="space-y-4">
                    {child.subjects.map((g) => (
                      <div key={g.subject}>
                        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">{g.subject}</h3>
                        <ul className="space-y-2">
                          {g.items.map((item) => (
                            <li key={item.id} className="rounded-xl border border-line bg-chip p-3">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium">{item.title}</span>
                                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase" style={{ background: "var(--et-blue-bg)", color: "var(--et-primary)" }}>
                                  {item.type === "LINK" ? t("resTypeLink") : t("resTypeNote")}
                                </span>
                              </div>
                              {item.type === "LINK" && item.url ? (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                                  {t("resOpen")} <ArrowRight size={13} aria-hidden="true" />
                                </a>
                              ) : (
                                <p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p>
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
      </div>
    </main>
  );
}
