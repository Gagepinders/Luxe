"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type ResultItem = { id: string; label: string; sublabel?: string; href: string };
type Results = {
  customers: ResultItem[];
  properties: ResultItem[];
  quotes: ResultItem[];
  jobs: ResultItem[];
  invoices: ResultItem[];
};

const GROUP_LABELS: Record<keyof Results, string> = {
  customers: "Customers",
  properties: "Properties",
  quotes: "Quotes",
  jobs: "Jobs",
  invoices: "Invoices",
};

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results);
        setOpen(true);
      } catch {
        setResults(null);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const groups = results
    ? (Object.keys(GROUP_LABELS) as (keyof Results)[]).filter((k) => results[k].length > 0)
    : [];

  return (
    <div ref={containerRef} className="relative px-3 pb-2">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-forest-100/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search everything…"
          className="w-full rounded-lg border border-white/10 !bg-white/10 pl-8 pr-7 py-1.5 text-xs !text-white placeholder:text-forest-100/40 focus:outline-none focus:ring-1 focus:ring-gold-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-forest-100/40 hover:text-white"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && results && (
        <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg bg-white shadow-xl">
          {groups.length === 0 ? (
            <p className="px-3 py-3 text-xs text-forest-950/50">No matches.</p>
          ) : (
            groups.map((key) => (
              <div key={key} className="border-b border-border-subtle last:border-0">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-forest-950/40">
                  {GROUP_LABELS[key]}
                </p>
                {results[key].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.href)}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-muted"
                  >
                    <span className="block truncate font-medium text-forest-950">{item.label}</span>
                    {item.sublabel && (
                      <span className="block truncate text-xs text-forest-950/50">{item.sublabel}</span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
