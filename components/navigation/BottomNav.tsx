"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Map, Route, FileWarning, Radio } from "lucide-react";
import { motion } from "framer-motion";

const TABS = [
  { href: "/map",   icon: Map,         label: "Situation" },
  { href: "/route", icon: Route,       label: "Navigate"  },
  { href: "/intel", icon: Radio,       label: "Intel"     },
  { href: "/report",icon: FileWarning, label: "Report"    },
] satisfies { href: string; icon: React.ComponentType<{ className?: string }>; label: string }[];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] flex pb-safe"
      style={{
        background: "linear-gradient(to top, rgba(10,15,30,0.99), rgba(13,20,36,0.97))",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(14,165,233,0.1)",
      }}
    >
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href === "/map" && pathname === "/map");
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-all relative group ${
              active ? "text-teal" : "text-slate-500 hover:text-slate-300"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {/* Active indicator */}
            {active && (
              <motion.div
                layoutId="sentinel-nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full"
                style={{ background: "linear-gradient(90deg, #0EA5E9, #38BDF8)" }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            {/* Icon container */}
            <motion.div
              animate={{ scale: active ? 1.15 : 1, y: active ? -1 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`relative ${active ? "drop-shadow-[0_0_6px_rgba(14,165,233,0.6)]" : ""}`}
            >
              <Icon className="w-5 h-5" />
              {/* Hover glow */}
              {!active && (
                <div className="absolute inset-0 bg-teal/0 group-hover:bg-teal/10 rounded-full transition-colors blur-sm" />
              )}
            </motion.div>

            <span className={`text-[10px] font-semibold tracking-wide uppercase ${active ? "text-teal" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
