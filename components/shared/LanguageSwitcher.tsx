"use client";
import { useLanguage } from "@/hooks/useLanguage";

const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "uk", label: "УК", name: "Українська" },
  { code: "ar", label: "عر", name: "العربية" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "es", label: "ES", name: "Español" },
  { code: "my", label: "BI", name: "ဗမာ" },
];

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className="text-xs bg-transparent border border-white/20 rounded-lg px-2 py-1 text-white min-h-[36px] cursor-pointer"
      aria-label="Select language"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} className="text-slate-900 bg-white">
          {compact ? l.label : l.name}
        </option>
      ))}
    </select>
  );
}
