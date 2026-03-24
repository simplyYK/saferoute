"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Map,
  AlertTriangle,
  Route,
  Bot,
  Building2,
  Newspaper,
  Globe,
} from "lucide-react";

const REST_TABS = [
  { href: "/map", icon: Map, label: "Map" },
  { href: "/report", icon: AlertTriangle, label: "Report" },
  { href: "/route", icon: Route, label: "Routes" },
  { href: "/assistant", icon: Bot, label: "AI Help" },
  { href: "/resources", icon: Building2, label: "Resources" },
  { href: "/news", icon: Newspaper, label: "News" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = () => setDesktop(window.innerWidth >= 1024);
    mq();
    window.addEventListener("resize", mq);
    return () => window.removeEventListener("resize", mq);
  }, []);

  const tabs = useMemo(() => {
    const globeTab = {
      href: desktop ? "/globe" : "/map",
      icon: Globe,
      label: "Globe" as const,
    };
    if (desktop) {
      return [globeTab, ...REST_TABS];
    }
    return [globeTab, ...REST_TABS.filter((t) => t.href !== "/map")];
  }, [desktop]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] bg-navy/95 backdrop-blur border-t border-white/10 flex pb-safe">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active =
          pathname === href ||
          (label === "Globe" && !desktop && pathname === "/globe");
        return (
          <Link
            key={label === "Globe" ? "nav-globe" : href}
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
