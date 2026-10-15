"use client";

import { METHOD_NOTES } from "@/lib/metrics";
import { Disclosure, PlusMinus } from "./Disclosure";

/** Method notes as an accordion: label, one-line summary, full detail. */
export function MethodList() {
  return (
    <div className="border-t border-ink">
      {METHOD_NOTES.map((m, i) => (
        <Disclosure
          key={m.label}
          header={(open) => (
            <span className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-2 py-6 lg:grid-cols-12">
              <span className="meta flex gap-3 text-muted lg:col-span-3">
                <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-ink">{m.label}</span>
              </span>
              <span className="col-start-1 text-lg tracking-[-0.01em] transition-transform duration-500 ease-out-soft group-hover:translate-x-1 lg:col-span-8 lg:col-start-4">
                {m.summary}
              </span>
              <span className="col-start-2 row-start-1 flex justify-end text-muted transition-colors group-hover:text-ink lg:col-span-1 lg:col-start-12">
                <PlusMinus open={open} />
              </span>
            </span>
          )}
        >
          <div className="pb-8 lg:grid lg:grid-cols-12 lg:gap-x-6">
            <p className="max-w-measure text-[0.9375rem] leading-relaxed text-muted lg:col-span-8 lg:col-start-4">
              {m.detail}
            </p>
          </div>
        </Disclosure>
      ))}
    </div>
  );
}
