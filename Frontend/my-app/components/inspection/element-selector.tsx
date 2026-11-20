"use client";

import { useState } from "react";
import type { InspectedElement } from "@/lib/snapshots";

type Props = {
  elements: InspectedElement[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

export default function ElementSelector({ elements, selectedIds, onChange, disabled }: Props) {
  const [search, setSearch] = useState("");

  // simple text filter over the fields the tester can see
  const query = search.trim().toLowerCase();
  const visible = elements.filter((el) =>
    [el.displayName, el.tagName, el.role, el.htmlId].some((v) => v?.toLowerCase().includes(query))
  );

  function toggle(id: number) {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  }

  return (
    <section className="rounded-3xl border border-hero/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-hero">Observed elements</h2>
          <p className="text-sm text-hero-muted">
            {selectedIds.length} of {elements.length} selected
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(elements.map((el) => el.id))}
            className="site-link rounded-full border border-hero/20 px-4 py-2 text-sm font-medium text-hero hover:bg-hero/5 disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([])}
            className="site-link rounded-full border border-hero/20 px-4 py-2 text-sm font-medium text-hero hover:bg-hero/5 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <label htmlFor="element-search" className="sr-only">Filter elements</label>
      <input
        id="element-search"
        type="search"
        placeholder="Filter by name, tag, role or id…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full rounded-xl border border-hero/20 bg-white px-4 py-2 text-sm text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue"
      />

      {elements.length === 0 && (
        <p className="mt-4 text-sm text-hero-muted">No interactive elements were found on this page.</p>
      )}

      <ul className="mt-4 divide-y divide-hero/10">
        {visible.map((el) => (
          <li key={el.id} className="py-3">
            <div className="flex items-start gap-3">
              <input
                id={"element-" + el.id}
                type="checkbox"
                disabled={disabled}
                checked={selectedIds.includes(el.id)}
                onChange={() => toggle(el.id)}
                className="mt-1 size-4 accent-hero-blue"
              />
              <div className="min-w-0 flex-1">
                <label htmlFor={"element-" + el.id} className="flex flex-wrap items-center gap-2 text-sm font-medium text-hero">
                  {el.displayName}
                  <span className="rounded bg-hero/5 px-2 py-0.5 font-mono text-xs text-hero-muted">
                    {"<" + el.tagName + ">"}{el.role && " · " + el.role}
                  </span>
                  {el.disabled && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">disabled</span>
                  )}
                  {el.formName && (
                    <span className="rounded bg-hero/5 px-2 py-0.5 text-xs text-hero-muted">form: {el.formName}</span>
                  )}
                </label>

                {el.recommendedLocator ? (
                  <code className="mt-1 block truncate text-xs text-green-800">{el.recommendedLocator.code}</code>
                ) : (
                  <p className="mt-1 text-xs text-hero-orange">No unique locator found for this element.</p>
                )}

                {el.locators.length > 0 && (
                  <details className="mt-1 text-xs text-hero-muted">
                    <summary className="cursor-pointer">All locator candidates ({el.locators.length})</summary>
                    <ul className="mt-1 space-y-1">
                      {el.locators.map((loc) => (
                        <li key={loc.strategy + loc.code} className="flex flex-wrap gap-2">
                          <span className="w-20 shrink-0">{loc.strategy}</span>
                          <code className="break-all">{loc.code}</code>
                          <span className={loc.matchesElement ? "text-green-700" : "text-hero-orange"}>
                            {loc.matchCount} match{loc.matchCount === 1 ? "" : "es"}
                            {loc.recommended && " · recommended"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {elements.length > 0 && visible.length === 0 && (
        <p className="mt-2 text-sm text-hero-muted">No element matches “{search}”.</p>
      )}
    </section>
  );
}
