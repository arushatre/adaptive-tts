"use client";

import { DEMO, displayPeaks, pct1, secs } from "@/lib/metrics";
import { Disclosure, PlusMinus } from "./Disclosure";
import { TranscriptDiff } from "./TranscriptDiff";
import { WaveformPlayer } from "./WaveformPlayer";

const sampleKhz = DEMO.clips[0].sampleRate / 1000;

/** Every clip of the demo prompt, one row per step count, with real audio. */
export function SampleList() {
  return (
    <ul className="border-t border-ink">
      {DEMO.clips.map((c, i) => (
        <li key={c.nfe} className="border-b border-rule">
          <div className="pt-8 pb-6">
            <WaveformPlayer
              src={c.src}
              bars={displayPeaks(c.peaks)}
              duration={c.durationS}
              label={`clip at ${c.nfe} generation steps`}
              meta={[`${String(i + 1).padStart(2, "0")} · NFE ${c.nfe}`, `WER ${pct1(c.wer)}`, `CER ${pct1(c.cer)}`]}
            />
          </div>
          <Disclosure
            rule="top"
            header={(open) => (
              <span className="meta flex items-center justify-between gap-4 py-3 text-muted transition-colors group-hover:text-ink">
                <span>
                  {c.errors.subs + c.errors.dels + c.errors.ins} of {c.refWords} words wrong
                </span>
                <span className="flex items-center gap-2">
                  {open ? "Hide" : "Transcript"}
                  <PlusMinus open={open} />
                </span>
              </span>
            )}
          >
            <div className="grid gap-8 pt-2 pb-8 md:grid-cols-12">
              <TranscriptDiff ops={c.alignment} className="md:col-span-8" />
              <dl className="grid grid-cols-[1fr_auto] content-start gap-x-6 gap-y-2 font-mono text-[0.8125rem] tabular-nums md:col-span-3 md:col-start-10">
                <dt className="font-sans text-muted">Substituted</dt>
                <dd className="text-right">{c.errors.subs}</dd>
                <dt className="font-sans text-muted">Missing</dt>
                <dd className="text-right">{c.errors.dels}</dd>
                <dt className="font-sans text-muted">Added</dt>
                <dd className="text-right">{c.errors.ins}</dd>
                <dt className="font-sans text-muted">Length</dt>
                <dd className="text-right">{secs(c.durationS)}</dd>
                <dt className="font-sans text-muted">Audio</dt>
                <dd className="text-right">{sampleKhz} kHz WAV</dd>
              </dl>
              <p className="text-[0.875rem] leading-relaxed text-muted md:col-span-8">
                Raw transcript: “{c.transcript}”
              </p>
            </div>
          </Disclosure>
        </li>
      ))}
    </ul>
  );
}
