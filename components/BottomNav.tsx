import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  current?: boolean;
  badge?: number;
};

// Persistent role-aware bottom navigation — icon + label, always visible, so a
// user can never get lost. Used by every dashboard.
export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="et-nav">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <a
            key={it.href}
            href={it.href}
            aria-current={it.current ? "page" : undefined}
            className="et-nav-item"
          >
            <span className="relative">
              <Icon size={22} aria-hidden="true" />
              {it.badge ? (
                <span
                  className="absolute -right-2.5 -top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full px-1 text-[10px] font-semibold text-white"
                  style={{ background: "#e5484d" }}
                >
                  {it.badge}
                </span>
              ) : null}
            </span>
            <span>{it.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
