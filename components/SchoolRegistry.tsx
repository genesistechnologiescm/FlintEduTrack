"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, Building2, Check, LogOut, Megaphone, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";
import { registerSchool } from "@/app/flint/actions";
import { signOut } from "@/app/login/actions";

type SchoolRow = {
  id: string;
  name: string;
  region: string;
  town: string | null;
  isTest: boolean;
  crisis: boolean;
  students: number;
  staff: number;
};
export type RegistryData = { schools: SchoolRow[] };

const REGIONS = [
  "North-West", "South-West", "Centre", "Littoral", "West",
  "East", "South", "Adamawa", "North", "Far North",
];

const STR = {
  en: {
    owner: "Flint · Owner", signOut: "Sign out", oversight: "National oversight", curateTool: "Library curation", notices: "Noticeboard",
    title: "School registry", intro: "Register a school and its first administrator. They sign in with the phone + PIN you set here, then build their own classes, teachers and students.",
    add: "Register a school", schoolName: "School name", region: "Region", town: "Town (optional)",
    crisis: "Crisis-affected zone (NW / SW)", test: "Test school — kept out of the national dashboard & exports",
    adminHead: "First administrator", adminName: "Full name", adminPhone: "Phone number", adminPin: "5-digit PIN they'll use",
    create: "Create school", creating: "Creating…",
    existing: "Schools", none: "No schools yet.", students: "students", staff: "staff",
    testTag: "TEST", crisisTag: "crisis", live: "live",
    errPhone: "Enter a valid Cameroon phone number.", errProvision: "Couldn't create the login. Check the connection and try again.", errGeneric: "Something went wrong. Please try again.",
    created: "School created. The administrator can sign in now.",
  },
  fr: {
    owner: "Flint · Propriétaire", signOut: "Déconnexion", oversight: "Vue nationale", curateTool: "Curation bibliothèque", notices: "Tableau d'affichage",
    title: "Registre des écoles", intro: "Enregistrez une école et son premier administrateur. Il se connecte avec le téléphone + PIN que vous définissez ici, puis crée ses classes, enseignants et élèves.",
    add: "Enregistrer une école", schoolName: "Nom de l'école", region: "Région", town: "Ville (optionnel)",
    crisis: "Zone de crise (NO / SO)", test: "École test — exclue du tableau de bord national et des exports",
    adminHead: "Premier administrateur", adminName: "Nom complet", adminPhone: "Numéro de téléphone", adminPin: "PIN à 5 chiffres",
    create: "Créer l'école", creating: "Création…",
    existing: "Écoles", none: "Aucune école pour l'instant.", students: "élèves", staff: "personnel",
    testTag: "TEST", crisisTag: "crise", live: "réelle",
    errPhone: "Entrez un numéro camerounais valide.", errProvision: "Impossible de créer le compte. Vérifiez la connexion et réessayez.", errGeneric: "Une erreur s'est produite. Réessayez.",
    created: "École créée. L'administrateur peut se connecter.",
  },
};

const field = "et-input";

export function SchoolRegistry({ data }: { data: RegistryData }) {
  const { locale, setLocale } = useI18n();
  const t = STR[locale];
  const router = useRouter();

  const [name, setName] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [town, setTown] = useState("");
  const [crisis, setCrisis] = useState(false);
  const [isTest, setIsTest] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);

  const valid =
    name.trim().length >= 2 &&
    adminName.trim().length >= 2 &&
    adminPhone.replace(/\D/g, "").length >= 6 &&
    /^\d{5}$/.test(adminPin);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    setOkMsg(false);
    try {
      const res = await registerSchool({
        schoolName: name,
        region,
        town: town || undefined,
        isCrisisZone: crisis,
        isTest,
        adminName,
        adminPhone,
        adminPin,
      });
      if (res.ok) {
        setName(""); setTown(""); setCrisis(false); setIsTest(true);
        setAdminName(""); setAdminPhone(""); setAdminPin("");
        setOkMsg(true);
        router.refresh();
      } else {
        setErr(res.error === "phone" ? t.errPhone : res.error === "provision" ? t.errProvision : t.errGeneric);
      }
    } catch {
      setErr(t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[720px] px-4 pb-16">
        {/* Top bar */}
        <div className="flex items-center gap-2 py-5">
          <span className="text-ink"><OriginMark size={22} /></span>
          <span className="font-mono text-xs uppercase tracking-widest text-primary">{t.owner}</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="flex overflow-hidden rounded-full border border-line text-xs">
              {(["en", "fr"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l}
                  className={`px-2.5 py-1.5 ${locale === l ? "bg-primary text-white" : "text-muted"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button type="button" onClick={() => signOut()} aria-label={t.signOut} className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink">
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mb-4 mt-1 max-w-[560px] text-sm text-muted">{t.intro}</p>

        {/* Owner tools — platform powers, not any single school */}
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { href: "/government", label: t.oversight, icon: BarChart3 },
            { href: "/curate", label: t.curateTool, icon: BookOpen },
            { href: "/noticeboard", label: t.notices, icon: Megaphone },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <a key={tool.href} href={tool.href} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-primary/30 hover:bg-chip">
                <Icon size={15} className="text-primary" aria-hidden="true" /> {tool.label}
              </a>
            );
          })}
        </div>

        {/* Register form */}
        <section className="et-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <Plus size={18} className="text-primary" aria-hidden="true" /> {t.add}
          </h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="et-label" htmlFor="sr-name">{t.schoolName}</label>
              <input id="sr-name" className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="et-label" htmlFor="sr-region">{t.region}</label>
                <select id="sr-region" className={field} value={region} onChange={(e) => setRegion(e.target.value)}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="et-label" htmlFor="sr-town">{t.town}</label>
                <input id="sr-town" className={field} value={town} onChange={(e) => setTown(e.target.value)} maxLength={80} />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={crisis} onChange={(e) => setCrisis(e.target.checked)} className="size-4 accent-[var(--et-primary)]" />
              {t.crisis}
            </label>
            <label className="flex items-start gap-2.5 rounded-xl bg-blue-bg p-3 text-sm">
              <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} className="mt-0.5 size-4 accent-[var(--et-primary)]" />
              <span>{t.test}</span>
            </label>

            <div className="mt-2 border-t border-line pt-3">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">{t.adminHead}</div>
              <div className="space-y-3">
                <div>
                  <label className="et-label" htmlFor="sr-aname">{t.adminName}</label>
                  <input id="sr-aname" className={field} value={adminName} onChange={(e) => setAdminName(e.target.value)} maxLength={80} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="et-label" htmlFor="sr-aphone">{t.adminPhone}</label>
                    <input id="sr-aphone" className={field} inputMode="tel" placeholder="6XX XXX XXX" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} required />
                  </div>
                  <div>
                    <label className="et-label" htmlFor="sr-apin">{t.adminPin}</label>
                    <input id="sr-apin" className={field} inputMode="numeric" maxLength={5} placeholder="•••••" value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, "").slice(0, 5))} required />
                  </div>
                </div>
              </div>
            </div>

            {err && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
            {okMsg && <p className="flex items-center gap-1.5 rounded-lg bg-ok-bg px-3 py-2 text-sm text-ok"><Check size={15} /> {t.created}</p>}

            <button type="submit" disabled={!valid || busy} className="et-btn w-full py-3 text-sm">
              {busy ? t.creating : t.create}
            </button>
          </form>
        </section>

        {/* Existing schools */}
        <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t.existing} · {data.schools.length}</h2>
        {data.schools.length === 0 ? (
          <p className="et-card px-4 py-6 text-center text-muted">{t.none}</p>
        ) : (
          <ul className="space-y-2">
            {data.schools.map((s) => (
              <li key={s.id} className="et-card flex items-center gap-3 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-bg">
                  <Building2 size={19} className="text-primary" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display font-semibold">{s.name}</span>
                    {s.isTest ? (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: "var(--et-warn-bg)", color: "var(--et-warn)" }}>{t.testTag}</span>
                    ) : (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: "var(--et-ok-bg)", color: "var(--et-ok)" }}>{t.live}</span>
                    )}
                    {s.crisis && <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ background: "var(--et-danger-bg)", color: "var(--et-danger)" }}>{t.crisisTag}</span>}
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted">
                    {s.region}{s.town ? ` · ${s.town}` : ""} · {s.students} {t.students} · {s.staff} {t.staff}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
