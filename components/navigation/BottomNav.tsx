"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, AlertTriangle, Route, Bot, Building2, Newspaper } from "lucide-react";

const TABS = [
  { href: "/map", icon: Map, label: "Map" },
  { href: "/report", icon: AlertTriangle, label: "Report" },
  { href: "/route", icon: Route, label: "Routes" },
  { href: "/assistant", icon: Bot, label: "AI Help" },
  { href: "/resources", icon: Building2, label: "Resources" },
  { href: "/news", icon: Newspaper, label: "News" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] bg-navy/95 backdrop-blur border-t border-white/10 flex pb-safe">
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
              active ? "text-teal" : "text-slate-400 hover:text-slate-200"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
