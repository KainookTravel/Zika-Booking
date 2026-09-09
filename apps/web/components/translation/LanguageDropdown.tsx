"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguageStore, ALL_LANGUAGES, POPULAR_LANGUAGES, type Language } from "@/stores/language";

interface LanguageDropdownProps {
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export function LanguageDropdown({
  className,
  buttonClassName,
  dropdownClassName,
}: LanguageDropdownProps) {
  const currentLanguage = useLanguageStore((s) => s.currentLanguage);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedLang =
    ALL_LANGUAGES.find((l) => l.code === currentLanguage) ||
    ALL_LANGUAGES[0] ||
    { code: "en", name: "English", nativeName: "English" };

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? ALL_LANGUAGES.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.nativeName.toLowerCase().includes(query) ||
          l.code.toLowerCase().includes(query)
      )
    : ALL_LANGUAGES;

  const handleSelectLanguage = (langCode: string) => {
    setLanguage(langCode);
    setOpen(false);
    setSearch("");
  };

  const renderLanguageItem = (lang: Language) => {
    const isSelected = lang.code === selectedLang.code;
    return (
      <button
        key={lang.code}
        type="button"
        onClick={() => handleSelectLanguage(lang.code)}
        className={cn(
          "flex w-full items-center justify-between px-3.5 py-2 text-sm transition-all",
          isSelected
            ? "bg-slate-50 text-slate-900 font-semibold"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <div className="flex flex-col items-start text-left">
          <span className="text-sm leading-tight text-slate-800">{lang.nativeName}</span>
          <span className="text-xs text-slate-400">{lang.name}</span>
        </div>
        {isSelected && <Check className="h-4 w-4 text-[#1D8D2B] shrink-0" />}
      </button>
    );
  };

  return (
    <div className={cn("relative notranslate", className)} ref={ref} translate="no">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Select language"
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-all",
          open
            ? "border-[#0c2614] bg-[#0c2614] text-white"
            : "border-slate-200 bg-white text-slate-600 hover:border-[#1D8D2B] hover:text-[#0c2614]",
          buttonClassName
        )}
      >
        <Globe className={cn("h-4 w-4 shrink-0", open ? "text-white" : "text-slate-500")} />
        <span className="uppercase tracking-wide">{selectedLang.code}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-64 animate-slide-in-up rounded-2xl border border-slate-100 bg-white py-2 shadow-[0_8px_30px_rgba(0,0,0,0.1)]",
            dropdownClassName
          )}
        >
          <div className="px-3 pb-2 pt-1">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 130+ languages…"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-[#1D8D2B]"
            />
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {query ? (
              <div>
                {filtered.map(renderLanguageItem)}
                {filtered.length === 0 && (
                  <p className="px-4 py-3 text-sm text-slate-400">No languages found</p>
                )}
              </div>
            ) : (
              <>
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Popular
                  </div>
                  {POPULAR_LANGUAGES.map(renderLanguageItem)}
                </div>
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    All Languages (A–Z)
                  </div>
                  {ALL_LANGUAGES.map(renderLanguageItem)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
