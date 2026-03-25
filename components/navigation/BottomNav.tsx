"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Map, AlertTriangle, Route, Bot, Building2, Newspaper, Globe } from "lucide-react";

// Tabs always shown on both mobile and desktop
const CORE_TABS = [
  { href: "/map",       icon: Map,           label: "Navigate" },
  { href: "/report",    icon: AlertTriangle, label: "Report"   },
  { href: "/route",     icon: Route,         label: "Routes"   },
  { href: "/assistant", icon: Bot,           label: "AI Help"  },
  { href: "/resources", icon: Building2,     label: "Resources"},
  { href: "/news",      icon: Newspaper,     label: "News"     },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const check = () => setDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // On desktop, prepend the Intel (Globe) tab
  const tabs = useMemo(() => {
    if (!desktop) return CORE_TABS;
    return [
      { href: "/globe", icon: Globe, label: "Intel" } as const,
      ...CORE_TABS,
    ];
  }, [desktop]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] bg-navy/95 backdrop-blur border-t border-white/10 flex pb-safe overflow-x-auto">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] min-w-[48px] transition-colors ${
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
