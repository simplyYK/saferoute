"use client";
import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/appStore";

type Translations = Record<string, string>;
const cache: Record<string, Translations> = {};

async function loadTranslations(lang: string): Promise<Translations> {
  if (cache[lang]) return cache[lang];
  try {
    const res = await fetch(`/locales/${lang}.json`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    cache[lang] = data;
    return data;
  } catch {
    if (lang !== "en") return loadTranslations("en");
    return {};
  }
}

export function useLanguage() {
  const { language, setLanguage: setStoreLang } = useAppStore();
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadTranslations(language).then((t) => {
      setTranslations(t);
      setLoading(false);
    });
    if (typeof document !== "undefined") {
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, String(v));
        });
      }
      return text;
    },
    [translations]
  );

  const setLanguage = useCallback(
    (lang: string) => {
      setStoreLang(lang);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("saferoute_language", lang);
      }
    },
    [setStoreLang]
  );

  return { t, language, setLanguage, loading };
}
