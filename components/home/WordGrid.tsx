"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { DEMO, joinAnd, pct1, wordCells, type WordCell } from "@/lib/metrics";

type Cell = WordCell;

const CLIPS = DEMO.clips;
const COLUMNS = CLIPS.map((c) => wordCells(c.alignment));
const WORD_COUNT = COLUMNS[0].length;

// Row labels in the prompt's own spelling ("Chichén", not "chichen"), falling
// back to the normalized words if the two ever disagree in length.
const written = DEMO.text
  .split(/\s+/)
  .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
  .filter(Boolean);
const normalized = CLIPS[0].alignment.flatMap((o) => (o.op === "ins" ? [] : [o.ref]));
const LABELS =
  written.length === WORD_COUNT && COLUMNS.every((c) => c.length === WORD_COUNT) ? written : normalized;

const mistakes = (i: number) => {
  const { subs, dels, ins } = CLIPS[i].errors;
  return subs + dels + ins;
};
const fewest = Math.min(...CLIPS.map((_, i) => mistakes(i)));
const fewestNfe = CLIPS.filter((_, i) => mistakes(i) === fewest).map((c) => c.nfe);
const hasMissing = COLUMNS.some((c) => c.some((w) => w.status === "missing"));
const hasExtra = COLUMNS.some((c) => c.some((w) => w.extra.length));
const ease = [0.22, 1, 0.36, 1] as const;

const fill: Record<Cell["status"], string> = {
  ok: "bg-ink",
  changed: "bg-accent-strong",
  missing: "border border-ink/30",
};
const EXTRA_RING = "ring-2 ring-accent-strong ring-offset-1 ring-offset-paper";

type Hover = { col: number; row: number | null } | null;

function describeCell(col: number, row: number) {
  const nfe = CLIPS[col].nfe;
  const w = COLUMNS[col][row];
  const word = LABELS[row];
  const base =
    w.status === "ok"
      ? `“${word}” heard right`
      : w.status === "missing"
        ? `“${word}” missing`
        : `“${word}” heard as “${w.heard}”`;
  const extra = w.extra.length
    ? ` · extra ${w.extra.length === 1 ? "word" : "words"} “${w.extra.join(" ")}”`
    : "";
  return `${nfe} steps · ${base}${extra}`;
}

function describeColumn(col: number) {
  const c = CLIPS[col];
  return `${c.nfe} steps · ${mistakes(col)} ${mistakes(col) === 1 ? "mistake" : "mistakes"} · words ${pct1(c.wer)} wrong · letters ${pct1(c.cer)} wrong`;
}

const summary = CLIPS.map(
  (c, i) => `${c.nfe} steps: ${mistakes(i)} ${mistakes(i) === 1 ? "mistake" : "mistakes"}, word error rate ${pct1(c.wer)}`,
).join("; ");

/**
 * Fig. 01: one real prompt at every step count. Rows are the prompt's words,
 * columns the step counts; each square shows whether Whisper heard that word.
 */
export function WordGrid() {
  const [hover, setHover] = useState<Hover>(null);
  const dim = (col: number, row: number | null) =>
    hover !== null && hover.col !== col && (hover.row === null || hover.row !== row);

  const grid = { gridTemplateColumns: `minmax(0, max-content) repeat(${CLIPS.length}, minmax(0, 1fr))` };

  return (
    <figure className="flex flex-col gap-5">
      <figcaption className="text-[0.9375rem] leading-relaxed text-muted">“{DEMO.text}”</figcaption>

      <div
        role="img"
        aria-label={`Each word of the sentence at ${CLIPS.length} step counts. ${summary}.`}
        className="grid items-center gap-x-1 gap-y-1 border-y border-rule py-5 sm:gap-x-2"
        style={grid}
        onPointerLeave={() => setHover(null)}
      >
        {/* Column headers: step counts. */}
        <span aria-hidden="true" className="meta pr-3 text-[0.6875rem] text-muted">
          Steps
        </span>
        {CLIPS.map((c, col) => (
          <span
            key={c.nfe}
            aria-hidden="true"
            onPointerEnter={() => setHover({ col, row: null })}
            className={`pb-2 text-center font-mono text-[0.6875rem] tabular-nums transition-colors duration-200 ${
              hover?.col === col ? "text-ink" : "text-muted"
            }`}
          >
            {c.nfe}
          </span>
        ))}

        {/* One row per word. */}
        {LABELS.map((label, row) => (
          <Row key={row} row={row} label={label} hover={hover} setHover={setHover} dim={dim} />
        ))}

        {/* Totals per step count. */}
        <span aria-hidden="true" className="meta mt-3 border-t border-rule pt-3 pr-3 text-[0.6875rem] text-muted">
          Mistakes
        </span>
        {CLIPS.map((c, col) => (
          <span
            key={c.nfe}
            aria-hidden="true"
            onPointerEnter={() => setHover({ col, row: null })}
            className={`mt-3 border-t border-rule pt-3 text-center font-mono text-[0.8125rem] tabular-nums transition-colors duration-200 ${
              mistakes(col) === fewest ? "font-medium text-ink" : "text-muted"
            } ${hover?.col === col ? "text-ink" : ""}`}
          >
            {mistakes(col)}
          </span>
        ))}
        <span aria-hidden="true" className="meta pr-3 text-[0.6875rem] text-muted">
          Error %
        </span>
        {CLIPS.map((c, col) => (
          <span
            key={c.nfe}
            aria-hidden="true"
            onPointerEnter={() => setHover({ col, row: null })}
            className={`text-center font-mono text-[0.625rem] tabular-nums transition-colors duration-200 sm:text-[0.6875rem] ${
              hover?.col === col || mistakes(col) === fewest ? "text-ink" : "text-muted"
            }`}
          >
            {(c.wer * 100).toFixed(1)}
          </span>
        ))}
      </div>

      <div className="meta flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <span className="min-h-[1.4em] text-ink">
          {hover === null
            ? `${fewest === 0 ? "Every word right" : "Fewest mistakes"} at ${joinAnd(fewestNfe)} steps`
            : hover.row === null
              ? describeColumn(hover.col)
              : describeCell(hover.col, hover.row)}
        </span>
        <span aria-hidden="true" className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-muted">
          <Swatch className="bg-ink">Right</Swatch>
          <Swatch className="bg-accent-strong">Misheard</Swatch>
          {hasExtra ? <Swatch className={`bg-ink ${EXTRA_RING}`}>Extra word</Swatch> : null}
          {hasMissing ? <Swatch className="border border-ink/30">Missing</Swatch> : null}
        </span>
      </div>
    </figure>
  );
}

function Row({
  row,
  label,
  hover,
  setHover,
  dim,
}: {
  row: number;
  label: string;
  hover: Hover;
  setHover: (h: Hover) => void;
  dim: (col: number, row: number | null) => boolean;
}) {
  const active = hover?.row === row;
  return (
    <>
      <span
        aria-hidden="true"
        className={`truncate pr-3 text-[0.8125rem] leading-none transition-colors duration-200 ${
          active ? "text-ink" : "text-muted"
        }`}
      >
        {label}
      </span>
      {COLUMNS.map((cells, col) => {
        const w = cells[row];
        return (
          <span
            key={col}
            aria-hidden="true"
            className={`flex justify-center py-px transition-opacity duration-200 ${dim(col, row) ? "opacity-25" : "opacity-100"}`}
            onPointerEnter={() => setHover({ col, row })}
          >
            <motion.span
              className={`block aspect-square w-full max-w-4 rounded-[2px] lg:max-w-5 ${fill[w.status]} ${
                w.extra.length ? EXTRA_RING : ""
              }`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.35 + col * 0.06 + row * 0.008 }}
            />
          </span>
        );
      })}
    </>
  );
}

function Swatch({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block size-2.5 rounded-[2px] ${className}`} />
      {children}
    </span>
  );
}
