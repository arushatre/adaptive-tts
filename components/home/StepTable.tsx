"use client";

import { useState } from "react";
import { DEMO, METRICS, caseLike, joinAnd, pct1, wordCells, werOf } from "@/lib/metrics";

const CLEAN = METRICS.cleanSet;

// The prompt's own words ("Chichén"), matched one-to-one with alignment cells.
const WRITTEN = DEMO.text
  .split(/\s+/)
  .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
  .filter(Boolean);

type Slip = { text: string; kind: "changed" | "missing" | "extra"; was?: string };

/** What went wrong in the demo sentence at one step count, in reading order. */
function slipsAt(nfe: number): { mistakes: number; slips: Slip[] } | null {
  const clip = DEMO.clips.find((c) => c.nfe === nfe);
  if (!clip) return null;
  const cells = wordCells(clip.alignment);
  const words = WRITTEN.length === cells.length ? WRITTEN : null;
  const slips: Slip[] = [];
  cells.forEach((c, i) => {
    const word = words?.[i] ?? "";
    const extra = c.extra.join(" ");
    if (c.status === "changed") {
      slips.push({ text: caseLike(word, [extra, c.heard].filter(Boolean).join(" ")), kind: "changed", was: word });
    } else {
      if (extra) slips.push({ text: caseLike(word, extra), kind: "extra" });
      if (c.status === "missing") slips.push({ text: word, kind: "missing" });
    }
  });
  const { subs, dels, ins } = clip.errors;
  return { mistakes: subs + dels + ins, slips };
}

const ROWS = CLEAN.byNfe.map((g) => ({ nfe: g.nfe, wer: werOf(g), clips: g.clips, sentence: slipsAt(g.nfe) }));
/** Bars run from 0 to the next whole percent above the highest value. */
const SCALE = Math.ceil(Math.max(...ROWS.map((r) => r.wer)) * 100) / 100;
const range = CLEAN.werRange;

function readout(i: number | null) {
  if (i === null) {
    return `Lowest ${pct1(range.min)} at ${joinAnd(range.minNfe)} steps · highest ${pct1(range.max)} at ${joinAnd(range.maxNfe)}`;
  }
  const r = ROWS[i];
  const s = r.sentence;
  const sentence = !s
    ? ""
    : s.mistakes === 0
      ? " · Chichén Itzá sentence: every word right"
      : ` · Chichén Itzá sentence: ${s.mistakes} ${s.mistakes === 1 ? "mistake" : "mistakes"}`;
  return `${r.nfe} steps · ${pct1(r.wer)} of words wrong across ${r.clips} clips${sentence}`;
}

/**
 * Fig. 01: each row is one step count. Left, the share of words Whisper got
 * wrong across the short and medium prompts; right, what it got wrong in the
 * Chichén Itzá sentence. Moving down the rows highlights one at a time.
 */
export function StepTable() {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <figure className="flex flex-col gap-4">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">
          Words wrong at each generation step count, across {CLEAN.prompts} short and medium prompts, and the
          mistakes in one example sentence. Lower is better.
        </caption>
        <colgroup>
          <col className="w-[3.75rem] sm:w-[4.5rem]" />
          <col className="w-[36%]" />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b border-ink">
            <th scope="col" className="meta pb-2.5 font-normal text-muted">
              Steps
            </th>
            <th scope="col" className="meta pb-2.5 pr-4 font-normal whitespace-nowrap text-muted">
              Words wrong<span className="hidden min-[82rem]:inline"> · {CLEAN.prompts} prompts</span>
            </th>
            <th scope="col" className="meta pb-2.5 font-normal text-muted">
              Misheard in{" "}
              <span className="normal-case tracking-normal" title={DEMO.text}>
                “Chichén Itzá”
              </span>
            </th>
          </tr>
        </thead>
        <tbody onPointerLeave={() => setHover(null)}>
          {ROWS.map((r, i) => {
            const on = hover === i;
            return (
              <tr
                key={r.nfe}
                onPointerEnter={() => setHover(i)}
                className={`border-b border-rule transition-colors duration-150 ${on ? "bg-paper-hover" : ""}`}
              >
                <th
                  scope="row"
                  className={`py-1 pl-1 font-mono sm:py-1.5 text-[0.8125rem] font-normal tabular-nums transition-colors duration-150 ${
                    on ? "text-ink" : "text-muted"
                  }`}
                >
                  {r.nfe}
                </th>
                <td className="py-1 pr-4 sm:py-1.5">
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className="block h-1.5 flex-1 bg-rule/70">
                      <span
                        className={`block h-full transition-colors duration-150 ${
                          on ? "bg-ink" : hover === null ? "bg-ink/70" : "bg-ink/30"
                        }`}
                        style={{ width: `${(r.wer / SCALE) * 100}%` }}
                      />
                    </span>
                    <span
                      className={`w-11 shrink-0 text-right font-mono text-[0.8125rem] tabular-nums transition-colors duration-150 ${
                        on ? "text-ink" : "text-ink/75"
                      }`}
                    >
                      {pct1(r.wer)}
                    </span>
                  </span>
                </td>
                <td className="py-1 text-[0.75rem] leading-snug sm:py-1.5 xl:text-[0.8125rem]">
                  {!r.sentence ? (
                    <span className="text-muted">—</span>
                  ) : r.sentence.mistakes === 0 ? (
                    <span className="text-muted">All Correct</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {r.sentence.slips.map((s, k) =>
                        s.kind === "missing" ? (
                          <del key={k} className="text-muted">
                            <span className="sr-only">missing: </span>
                            {s.text}
                          </del>
                        ) : (
                          <mark
                            key={k}
                            title={s.kind === "changed" ? `Should be “${s.was}”` : "Extra word"}
                            className={`rounded-[3px] px-1 text-ink transition-colors duration-150 ${
                              on ? "bg-accent-strong/45" : "bg-accent"
                            }`}
                          >
                            {s.text}
                            <span className="sr-only">
                              {s.kind === "changed" ? ` (should be ${s.was})` : " (extra word)"}
                            </span>
                          </mark>
                        ),
                      )}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <figcaption className="meta min-h-[1.4em] text-muted" aria-live="polite">
        <span className={hover === null ? "" : "text-ink"}>{readout(hover)}</span>
      </figcaption>
    </figure>
  );
}
