"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";

export interface LocationResult {
  lat: number;
  lng: number;
  name: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text: string };
  lat?: number;
  lng?: number;
}

interface Props {
  placeholder?: string;
  onSelect: (result: LocationResult) => void;
  dark?: boolean;
  className?: string;
  defaultValue?: string;
}

export default function LocationSearch({
  placeholder = "Search location...",
  onSelect,
  dark = false,
  className = "",
  defaultValue = "",
}: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { predictions?: Prediction[] };
      setSuggestions(data.predictions ?? []);
      setOpen((data.predictions ?? []).length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    setActiveIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(val), 300);
  };

  const selectPlace = (p: Prediction) => {
    setQuery(p.structured_formatting?.main_text ?? p.description);
    setOpen(false);
    setSuggestions([]);
    if (p.lat !== undefined && p.lng !== undefined) {
      onSelect({ lat: p.lat, lng: p.lng, name: p.structured_formatting?.main_text ?? p.description });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); selectPlace(suggestions[activeIdx]!); }
    if (e.key === "Escape") { setOpen(false); }
  };

  const inputClass = dark
    ? "bg-transparent text-white placeholder-slate-400 text-sm flex-1 outline-none min-w-0"
    : "bg-transparent text-slate-800 placeholder-slate-400 text-sm flex-1 outline-none min-w-0";

  const containerClass = dark
    ? "flex-1 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5"
    : `flex items-center gap-2 border-2 border-slate-200 rounded-lg px-3 py-2 focus-within:border-teal ${className}`;

  return (
    <div ref={containerRef} className={`relative ${dark ? "flex-1" : ""} ${className}`}>
      <div className={containerClass}>
        {loading ? (
          <Loader2 className={`w-4 h-4 shrink-0 animate-spin ${dark ? "text-slate-400" : "text-slate-400"}`} />
        ) : (
          <Search className={`w-4 h-4 shrink-0 ${dark ? "text-slate-400" : "text-slate-400"}`} />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={inputClass}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setSuggestions([]); setOpen(false); }}
            className="shrink-0 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 z-[2000] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((p, i) => (
            <li key={p.place_id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectPlace(p); }}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                  i === activeIdx ? "bg-teal/10" : ""
                }`}
              >
                <MapPin className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {p.structured_formatting?.main_text ?? p.description}
                  </p>
                  {p.structured_formatting?.secondary_text && (
                    <p className="text-xs text-slate-500 truncate">{p.structured_formatting.secondary_text}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
