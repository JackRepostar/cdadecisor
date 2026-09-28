"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui";
import type { Route } from "next";

type NavItem = { href: Route; label: string; badge?: number | null };

export function TopNav({
  memberName,
  memberColor,
  navItems,
}: {
  memberName: string;
  memberColor: string;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-navy to-navy-soft font-display text-[15px] font-semibold text-gold-soft">
            CdA
          </span>
          <span className="font-display text-lg font-semibold">CdaDecisor</span>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full border border-line bg-paper-raised py-1 pl-1 pr-3 text-[13px]"
          >
            <Avatar name={memberName} color={memberColor} size={24} />
            <span className="max-w-[38vw] truncate sm:max-w-none">{memberName}</span>
            <svg viewBox="0 0 20 20" width="12" height="12" className="flex-none text-ink-soft">
              <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 min-w-[170px] rounded-xl border border-line bg-paper-raised p-1.5 shadow-lg">
              <div className="px-2.5 py-2 text-[12.5px] font-semibold">{memberName}</div>
              <Link
                href="/profilo"
                onClick={() => setMenuOpen(false)}
                className="block w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-ink hover:bg-pending-bg"
              >
                Profilo
              </Link>
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-ink hover:bg-pending-bg"
                >
                  Esci
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <nav className="mb-5 flex gap-1 rounded-xl border border-line bg-paper-raised p-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-semibold ${
                active ? "bg-navy text-gold-soft" : "text-ink-soft"
              }`}
            >
              {item.label}
              {typeof item.badge === "number" && item.badge > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active ? "bg-white/20" : "bg-gold-soft text-navy"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
