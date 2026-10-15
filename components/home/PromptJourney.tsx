"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { DEMO, pct1, wordStatuses, type WordStatus } from "@/lib/metrics";

const ROWS = DEMO.clips.map((c) => ({ clip: c, words: wordStatuses(c.alignment) }));
const best = Math.min(...DEMO.clips.map((c) => c.wer));
const bestNfe = DEMO.clips.filter((c) => c.wer === best).map((c) => c.nfe);
const ease = [0.22, 1, 0.36, 1] as const;

const tone: Record<WordStatus["status"], string> = {
  ok: "bg-ink",
  changed: "bg-accent-strong",
  missing: "bg-ink/15",
};

function describe(nfe: number, w: WordStatus) {
  if (w.status === "ok") return `NFE ${nfe} · “${w.word}”`;
  if (w.status === "missing") return `NFE ${nfe} · “${w.word}” missing`;
  return `NFE ${nfe} · “${w.word}” → “${w.heard}”`;
}

/**
 * Fig. 01: one real prompt at every step count. Each line is one clip,
 * each segment one word of the prompt; misheard words take the accent.
 */
export function PromptJourney() {
  const [hover, setHover] = useState<{ row: number; word: number } | null>(null);

  return (
    <figure className="flex flex-col gap-8">
      <p className="meta text-muted">Fig. 01 · One sentence, {DEMO.clips.length} step counts</p>

      <div
        role="img"
        aria-label={`Prompt ${DEMO.promptId} at each step count. Word error rate: ${DEMO.clips
          .map((c) => `NFE ${c.nfe} ${pct1(c.wer)}`)
          .join(", ")}.`}
        className="flex flex-col gap-2.5"
        onPointerLeave={() => setHover(null)}
      >
        {ROWS.map(({ clip, words }, r) => (
          <div
            key={clip.nfe}
            aria-hidden="true"
            className="grid grid-cols-[2rem_1fr_3rem] items-center gap-5"
          >
            <span className="font-mono text-[0.6875rem] text-muted tabular-nums">{clip.nfe}</span>
            <span className="flex gap-1">
              {words.map((w, i) => (
                <span
                  key={i}
                  className="flex h-5 items-center"
                  style={{ flexGrow: [...w.word].length, flexBasis: 0 }}
                  onPointerEnter={() => setHover({ row: r, word: i })}
                >
                  <motion.span
                    className={`block h-[6px] w-full origin-left rounded-full transition-opacity duration-300 ${tone[w.status]} ${
                      hover && hover.row !== r && hover.word !== i ? "opacity-20" : "opacity-100"
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease, delay: 0.4 + r * 0.12 + i * 0.015 }}
                  />
                </span>
              ))}
            </span>
            <span
              className={`text-right font-mono text-[0.6875rem] tabular-nums ${
                clip.wer === best ? "text-ink" : "text-muted"
              }`}
            >
              {pct1(clip.wer)}
            </span>
          </div>
        ))}
      </div>

      <figcaption className="meta flex min-h-[1.4em] flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-rule pt-4 text-muted">
        {hover ? (
          <span className="text-ink">{describe(ROWS[hover.row].clip.nfe, ROWS[hover.row].words[hover.word])}</span>
        ) : (
          <span>
            {best === 0 ? "Every word right" : "Lowest error"} at NFE {bestNfe.join(" and ")}
          </span>
        )}
        <span className="flex gap-5">
          <span>
            <span aria-hidden="true" className="mr-2 inline-block h-[3px] w-3 rounded-full bg-ink align-middle" />
            Heard right
          </span>
          <span>
            <span aria-hidden="true" className="mr-2 inline-block h-[3px] w-3 rounded-full bg-accent-strong align-middle" />
            Misheard
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
