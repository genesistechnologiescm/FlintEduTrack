"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/dictionary";

// Simple section-page heading. The shell provides nav + theme/language/logout,
// so sub-pages just need their title.
export function PageTitle({ titleKey, subKey }: { titleKey: MessageKey; subKey?: MessageKey }) {
  const { t } = useI18n();
  return (
    <div className="mb-4">
      <h1 className="font-display text-2xl font-bold tracking-tight">{t(titleKey)}</h1>
      {subKey && <p className="mt-0.5 text-sm text-muted">{t(subKey)}</p>}
    </div>
  );
}
