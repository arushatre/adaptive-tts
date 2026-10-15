"use client";

import { Fragment } from "react";
import { DEMO, caseLike, pct1, wordCells, type WordCell } from "@/lib/metrics";

const CLIPS = DEMO.clips;

// The prompt split into tokens that keep their punctuation ("Thandiwe,"),
// each with the bare word used to match it to an alignment cell.
const TOKENS = DEMO.text.split(/\s+/).map((raw) => {
  const m = raw.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u)!;
  return { lead: m[1], word: m[2], trail: m[3] };
});
const WORD_COUNT = TOKENS.filter((t) => t.word).length;
/** Alignment cell index for each token (-1 for punctuation-only tokens). */
const CELL_INDEX = TOKENS.reduce<number[]>((acc, t) => {
  const prev = acc.reduce((m, v) => Math.max(m, v), -1);
  acc.push(t.word ? prev + 1 : -1);
  return acc;
}, []);
const CELLS = CLIPS.map((c) => wordCells(c.alignment));
const ALIGNED = CELLS.every((c) => c.length === WORD_COUNT);

const mistakesOf = (i: number) => {
  const { subs, dels, ins } = CLIPS[i].errors;
  return subs + dels + ins;
};

function Word({ word, cell }: { word: string; cell: WordCell }) {
  const extra = cell.extra.length ? caseLike(word, cell.extra.join(" ")) : "";
  if (cell.status === "missing") {
    return (
      <>
        {extra ? <Heard text={extra} was={null} /> : null}
        {extra ? " " : null}
        <del className="text-night-muted decoration-night-accent decoration-2">
          <span className="sr-only">missing: </span>
          {word}
        </del>
      </>
    );
  }
  if (cell.status === "changed") {
    const heard = [extra, caseLike(word, cell.heard ?? "")].filter(Boolean).join(" ");
    return <Heard text={heard} was={word} />;
  }
  return (
    <>
      {extra ? <Heard text={extra} was={null} /> : null}
      {extra ? " " : null}
      {word}
    </>
  );
}

function Heard({ text, was }: { text: string; was: string | null }) {
  return (
    <mark
      title={was ? `Prompt said “${was}”` : "Extra word"}
      className="rounded-[3px] bg-night-accent px-1 text-night transition-colors duration-200"
    >
      {text}
      <span className="sr-only">{was ? ` (prompt said ${was})` : " (extra word)"}</span>
    </mark>
  );
}

/**
 * The prompt as Whisper heard it at the chosen step count. Misheard and extra
 * words are highlighted in place. Controlled by the demo's step count.
 */
export function WordSlider({ nfe, onChange }: { nfe: number; onChange: (nfe: number) => void }) {
  const i = Math.max(0, CLIPS.findIndex((c) => c.nfe === nfe));
  const cells = CELLS[i];
  const mistakes = mistakesOf(i);

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-[40ch] text-lede" aria-live="polite">
        {ALIGNED
          ? TOKENS.map((t, k) => (
              <Fragment key={k}>
                {t.lead}
                {t.word ? <Word word={t.word} cell={cells[CELL_INDEX[k]]} /> : null}
                {t.trail}
                {k < TOKENS.length - 1 ? " " : ""}
              </Fragment>
            ))
          : CLIPS[i].transcript}
      </p>

      <div className="flex flex-col gap-3">
        <input
          type="range"
          min={0}
          max={CLIPS.length - 1}
          step={1}
          value={i}
          onChange={(e) => onChange(CLIPS[Number(e.target.value)].nfe)}
          aria-label="Generation steps"
          aria-valuetext={`${CLIPS[i].nfe} steps`}
          className="range-night w-full"
        />
        <div aria-hidden="true" className="flex justify-between">
          {CLIPS.map((c) => (
            <button
              key={c.nfe}
              type="button"
              tabIndex={-1}
              onClick={() => onChange(c.nfe)}
              className={`w-[18px] cursor-pointer text-center font-mono text-[0.75rem] tabular-nums transition-colors duration-200 ${
                c.nfe === nfe ? "text-night-ink" : "text-night-muted hover:text-night-ink"
              }`}
            >
              {c.nfe}
            </button>
          ))}
        </div>
      </div>

      <p className="meta text-night-muted">
        <span className="text-night-ink">{CLIPS[i].nfe} steps</span>
        {" · "}
        {mistakes === 0
          ? "every word right"
          : `${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"} · ${pct1(CLIPS[i].wer)} of words wrong`}
      </p>
    </div>
  );
}
