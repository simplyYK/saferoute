"use client";
import { Shield, Search } from "lucide-react";
import Link from "next/link";
import SOSButton from "@/components/shared/SOSButton";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import { useState, type ReactNode } from "react";

interface TopBarProps {
  onSearch?: (query: string) => void;
  extraActions?: ReactNode;
}

export default function TopBar({ onSearch, extraActions }: TopBarProps) {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] bg-navy/95 backdrop-blur border-b border-white/10 flex items-center gap-2 px-3 py-2 h-14">
      <Link href="/" className="flex items-center gap-1.5 shrink-0">
        <Shield className="w-5 h-5 text-teal" />
        <span className="font-bold text-white text-sm hidden sm:block">SafeRoute</span>
      </Link>

      <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-transparent text-white placeholder-slate-400 text-sm flex-1 outline-none min-w-0"
        />
      </form>

      {extraActions}
      <LanguageSwitcher compact />
      <SOSButton />
    </header>
  );
}
