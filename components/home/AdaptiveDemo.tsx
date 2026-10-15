"use client";

import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import {
  CONTENT_LABEL,
  DEMO,
  displayPeaks,
  LENGTH_LABEL,
  RUN_LABEL,
  pct1,
  secs,
} from "@/lib/metrics";
import { Container } from "../Container";
import { Section } from "../Section";
import { SectionHeader } from "../SectionHeader";
import { TranscriptDiff } from "../TranscriptDiff";
import { WaveformPlayer } from "../WaveformPlayer";
import { WordSlider } from "./WordSlider";

const ease = [0.22, 1, 0.36, 1] as const;
const worst = Math.max(...DEMO.clips.map((c) => c.wer));
const sampleKhz = DEMO.clips[0].sampleRate / 1000;

/**
 * One real prompt at every step count. Picking a step count swaps in that
 * clip's audio, waveform, transcript and scores.
 */
export function AdaptiveDemo({ index }: { index?: number }) {
  const [nfe, setNfe] = useState(DEMO.clips[0].nfe);
  const clip = DEMO.clips.find((c) => c.nfe === nfe)!;
  const { subs, dels, ins } = clip.errors;

  const readout = [
    { label: "Word error rate", value: pct1(clip.wer) },
    { label: "Char. error rate", value: pct1(clip.cer) },
    { label: "Word errors", value: `${subs + dels + ins}`, of: `/${clip.refWords}` },
    { label: "Clip length", value: secs(clip.durationS) },
  ];

  return (
    <Section tone="night" id="demo" aria-labelledby="demo-title">
      <Container>
        <SectionHeader
          id="demo-title"
          index={index}
          label="Featured · Real clips"
          title="One sentence, nine step counts."
          aside="Real, unedited dots.tts output. Pick a step count to hear it."
        />

        <div className="mt-12 overflow-hidden border border-night-rule bg-night lg:mt-16">
          <div className="flex flex-col gap-4 border-b border-night-rule px-4 py-6 md:px-10 md:py-8">
            <p className="meta text-night-muted">
              Prompt {DEMO.promptId} · {CONTENT_LABEL[DEMO.content]} · {LENGTH_LABEL[DEMO.length]}
            </p>
            <p className="max-w-[40ch] text-lede">“{DEMO.text}”</p>
          </div>

          <fieldset>
            <legend className="sr-only">Generation steps (NFE)</legend>
            <LayoutGroup id="demo-nfe">
              <div className="grid grid-cols-3 gap-px border-b border-night-rule bg-night-rule sm:grid-cols-9">
                {DEMO.clips.map((c) => {
                  const selected = c.nfe === nfe;
                  return (
                    <label
                      key={c.nfe}
                      className={`relative flex cursor-pointer flex-col gap-2 bg-night px-3 py-4 transition-colors duration-300 md:px-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-night-ink ${
                        selected
                          ? "text-night-ink"
                          : "text-night-muted hover:bg-night-raised hover:text-night-ink"
                      }`}
                    >
                      <input
                        type="radio"
                        name="demo-nfe"
                        value={c.nfe}
                        checked={selected}
                        onChange={() => setNfe(c.nfe)}
                        className="sr-only"
                      />
                      <span className="meta">NFE {c.nfe}</span>
                      <span className="font-mono text-[0.9375rem] tabular-nums">
                        <span className="sr-only">word error rate </span>
                        {pct1(c.wer)}
                      </span>
                      <span aria-hidden="true" className="block h-[3px] w-full bg-night-rule">
                        <span
                          className={`block h-full origin-left ${selected ? "bg-night-accent" : "bg-current opacity-60"}`}
                          style={{ transform: `scaleX(${worst ? c.wer / worst : 0})` }}
                        />
                      </span>
                      {selected ? (
                        <motion.span
                          layoutId="demo-nfe-bar"
                          aria-hidden="true"
                          className="absolute inset-x-0 bottom-0 h-px bg-night-ink"
                          transition={{ duration: 0.5, ease }}
                        />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </LayoutGroup>
          </fieldset>

          <div className="flex flex-col gap-10 px-4 py-8 md:px-10 md:py-12">
            <WaveformPlayer
              src={clip.src}
              bars={displayPeaks(clip.peaks)}
              duration={clip.durationS}
              label={`clip at ${clip.nfe} generation steps`}
              meta={[`NFE ${clip.nfe}`, `${sampleKhz} kHz WAV`]}
            />
            <TranscriptDiff ops={clip.alignment} tone="night" />
          </div>

          <dl className="grid grid-cols-2 gap-px border-t border-night-rule bg-night-rule md:grid-cols-4">
            {readout.map((item) => (
              <div key={item.label} className="flex flex-col gap-1 bg-night px-4 py-4 md:px-6">
                <dt className="meta text-night-muted">{item.label}</dt>
                <dd className="font-mono text-xl tabular-nums md:text-2xl">
                  {item.value}
                  {item.of ? (
                    <span className="text-sm text-night-muted md:text-base">{item.of}</span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="meta mt-6 flex flex-col gap-2 text-night-muted lg:flex-row lg:items-center lg:justify-between">
          <p>{RUN_LABEL[DEMO.run].short} · {DEMO.run}</p>
          <p>Underlined: misheard · Struck: missing</p>
        </div>

        <div className="mt-16 border-t border-night-rule pt-12 lg:mt-20 lg:pt-16">
          <WordSlider nfe={nfe} onChange={setNfe} />
        </div>
      </Container>
    </Section>
  );
}
