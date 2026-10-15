"use client";

import { motion } from "motion/react";
import {
  CLEAN_SET_LABEL,
  CONTENT_LABEL,
  LENGTH_LABEL,
  MAIN_RUN,
  METRICS,
  ORIG_RUN,
  RUN_LABEL,
  cerOf,
  errorsOf,
  fmtInt,
  joinAnd,
  pct1,
  secs,
  werOf,
} from "@/lib/metrics";
import { Disclosure, PlusMinus } from "./Disclosure";

const ease = [0.22, 1, 0.36, 1] as const;
const clean = METRICS.cleanSet;
const range = clean.werRange;
const long = MAIN_RUN.byLength.find((g) => g.length === "long")!;
const shortMedium = MAIN_RUN.byLength.filter((g) => g.length !== "long");
const contentRanked = [...clean.byContent].sort((a, b) => werOf(b) - werOf(a));
const hardest = contentRanked[0];
const nextHardest = contentRanked[1];
const mainErrors = errorsOf(MAIN_RUN);
const trailingShare = MAIN_RUN.errorTypes.trailingDels / mainErrors;
const origFullWer = ORIG_RUN.byNfe.map((g) => g.wer.full.value);
const origWer = ORIG_RUN.byNfe.map(werOf);

/** Horizontal bar that grows from the left when its panel opens. */
function Bar({
  value,
  className = "bg-ink",
  delay = 0,
}: {
  /** 0–1 */
  value: number;
  className?: string;
  delay?: number;
}) {
  return (
    <span aria-hidden="true" className="block h-2 w-full bg-rule/70">
      <motion.span
        className={`block h-full origin-left ${className}`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: Math.min(1, value) }}
        transition={{ duration: 0.8, ease, delay }}
      />
    </span>
  );
}

type FindingId = "steps" | "length" | "errors" | "content" | "orig";
type Finding = {
  id: FindingId;
  label: string;
  title: string;
  takeaway: string;
  stat: string;
  statLabel: string;
};

const FINDINGS: Finding[] = [
  {
    id: "steps",
    label: "Generation steps",
    title: "How much the step count matters",
    takeaway: `Lowest at ${joinAnd(range.minNfe)} steps, highest at ${joinAnd(range.maxNfe)}. More steps don’t steadily help.`,
    stat: `${pct1(range.min)}–${pct1(range.max)}`,
    statLabel: "WER range, clean set",
  },
  {
    id: "length",
    label: "Length limit",
    title: "What the length limit does",
    takeaway: `Long prompts get cut off, so they score ${pct1(werOf(long))} against ${joinAnd(shortMedium.map((g) => pct1(werOf(g))))} for short and medium.`,
    stat: `${long.clipsAtMaxDuration}/${long.clips}`,
    statLabel: `Long clips cut at ${secs(MAIN_RUN.maxDurationS)}`,
  },
  {
    id: "errors",
    label: "Error types",
    title: "Where the word errors come from",
    takeaway: `Most errors are missing endings (${fmtInt(MAIN_RUN.errorTypes.trailingDels)} of ${fmtInt(mainErrors)}), not misheard words.`,
    stat: pct1(trailingShare),
    statLabel: "Of errors are cut-off endings",
  },
  {
    id: "content",
    label: "Prompt type",
    title: "Which prompt types are hardest",
    takeaway: `${CONTENT_LABEL[hardest.content]} are hardest; ${CONTENT_LABEL[nextHardest.content].toLowerCase()} come next at ${pct1(werOf(nextHardest))}.`,
    stat: pct1(werOf(hardest)),
    statLabel: `${CONTENT_LABEL[hardest.content]}, clean set`,
  },
  {
    id: "orig",
    label: "Setup issue",
    title: "Why the original setup doesn’t count",
    takeaway: `A setup bug cut most clips short, so its ${pct1(Math.min(...origWer))}–${pct1(Math.max(...origWer))} error rate says nothing about the model.`,
    stat: `${ORIG_RUN.clipsAtMaxDuration}/${ORIG_RUN.clips}`,
    statLabel: `Clips cut at ${secs(ORIG_RUN.maxDurationS)}`,
  },
];

/** Expandable list of analysis findings, each with its supporting data. */
export function Findings({
  defaultOpen = "steps",
  headingLevel = "h3",
}: {
  defaultOpen?: FindingId | null;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <div className="border-t border-ink">
      {FINDINGS.map((f, i) => (
        <Disclosure
          key={f.id}
          headingLevel={headingLevel}
          defaultOpen={f.id === defaultOpen}
          header={(open) => (
            <span className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 py-7 lg:grid-cols-12 lg:gap-y-2 lg:py-9">
              <span className="meta col-span-2 flex gap-3 text-muted lg:col-span-3 lg:row-start-1 lg:pt-3">
                <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-ink">{f.label}</span>
              </span>
              <span className="text-2xl tracking-[-0.02em] transition-transform duration-500 ease-out-soft group-hover:translate-x-1 md:text-[1.75rem] md:leading-tight lg:col-span-5 lg:col-start-4 lg:row-start-1">
                {f.title}
              </span>
              <span className="flex flex-col items-end gap-1 text-right lg:col-span-3 lg:col-start-9 lg:row-span-2 lg:row-start-1">
                <span className="font-mono text-3xl tracking-[-0.03em] whitespace-nowrap tabular-nums md:text-4xl">
                  {f.stat}
                </span>
                <span className="meta text-[0.6875rem] text-muted">{f.statLabel}</span>
              </span>
              <span className="col-span-2 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted lg:col-span-5 lg:col-start-4 lg:row-start-2">
                {f.takeaway}
              </span>
              <span className="col-span-2 flex justify-end lg:col-span-1 lg:col-start-12 lg:row-span-2 lg:row-start-1 lg:self-center">
                <span className="meta flex items-center gap-2 text-muted transition-colors group-hover:text-ink">
                  <span className="lg:sr-only">{open ? "Hide data" : "Show data"}</span>
                  <PlusMinus open={open} />
                </span>
              </span>
            </span>
          )}
        >
          <div className="pb-10 lg:grid lg:grid-cols-12 lg:gap-x-6">
            <div className="lg:col-span-9 lg:col-start-4">
              <FindingDetail id={f.id} />
            </div>
          </div>
        </Disclosure>
      ))}
    </div>
  );
}

function FindingDetail({ id }: { id: FindingId }) {
  switch (id) {
    case "steps":
      return <Steps />;
    case "length":
      return <Length />;
    case "errors":
      return <ErrorTypes />;
    case "content":
      return <Content />;
    case "orig":
      return <Orig />;
  }
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 max-w-measure text-[0.875rem] leading-relaxed text-muted">{children}</p>;
}

const th = "meta border-b border-ink py-2 pr-4 font-normal text-muted last:pr-0";
const td = "border-b border-rule py-3 pr-4 last:pr-0";

function Steps() {
  const top = range.max;
  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left">
          <caption className="sr-only">Clean set word error rate by generation steps. Lower is better.</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Steps (NFE)</th>
              <th scope="col" className={`${th} w-[42%]`}>Word error rate</th>
              <th scope="col" className={`${th} text-right`}>Word errors</th>
              <th scope="col" className={`${th} text-right`}>Char. error rate</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[0.875rem] tabular-nums">
            {clean.byNfe.map((g, i) => (
              <tr key={g.nfe}>
                <th scope="row" className={`${td} font-normal`}>{g.nfe}</th>
                <td className={td}>
                  <span className="flex items-center gap-3">
                    <span className="flex-1">
                      <Bar
                        value={werOf(g) / top}
                        delay={i * 0.04}
                        className={werOf(g) === range.min ? "bg-accent-strong" : "bg-ink"}
                      />
                    </span>
                    <span className="w-12 text-right">{pct1(werOf(g))}</span>
                  </span>
                </td>
                <td className={`${td} text-right`}>
                  {errorsOf(g)}
                  <span className="text-muted">/{fmtInt(g.refWords)}</span>
                </td>
                <td className={`${td} text-right`}>{pct1(cerOf(g))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        {CLEAN_SET_LABEL}: {clean.byNfe[0].clips} clips per step count, the same {fmtInt(clean.byNfe[0].refWords)}{" "}
        reference words each time, so the whole spread from lowest to highest is{" "}
        {Math.max(...clean.byNfe.map(errorsOf)) - Math.min(...clean.byNfe.map(errorsOf))} word errors. Bars are
        relative to the highest value.
      </Note>
    </>
  );
}

function Length() {
  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <caption className="sr-only">
            {RUN_LABEL[MAIN_RUN.id].short} by prompt length. Lower error rates are better.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Prompt length</th>
              <th scope="col" className={`${th} text-right`}>At the limit</th>
              <th scope="col" className={`${th} text-right`}>Unfinished</th>
              <th scope="col" className={`${th} text-right`}>Word error rate</th>
              <th scope="col" className={`${th} text-right`}>Char. error rate</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[0.875rem] tabular-nums">
            {MAIN_RUN.byLength.map((g) => (
              <tr key={g.length}>
                <th scope="row" className={`${td} font-sans text-[0.9375rem] font-normal`}>
                  {LENGTH_LABEL[g.length]}
                </th>
                <td className={`${td} text-right`}>
                  {g.clipsAtMaxDuration}
                  <span className="text-muted">/{g.clips}</span>
                </td>
                <td className={`${td} text-right`}>
                  {g.unfinishedClips}
                  <span className="text-muted">/{g.clips}</span>
                </td>
                <td className={`${td} text-right`}>{pct1(werOf(g))}</td>
                <td className={`${td} text-right`}>{pct1(cerOf(g))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        {RUN_LABEL[MAIN_RUN.id].short}, all step counts. “At the limit” means the clip is exactly{" "}
        {secs(MAIN_RUN.maxDurationS)} long; “unfinished” means the last words of the prompt are missing from the
        transcript. Counting only the part before the cut, this run’s word error rate is{" "}
        {pct1(MAIN_RUN.werHeard.value)}. This is why the clean set leaves long prompts out.
      </Note>
    </>
  );
}

const ERROR_ROWS = [
  { key: "subs", label: "Substituted", note: "Heard as a different word" },
  { key: "dels", label: "Missing", note: "Not in the transcript" },
  { key: "ins", label: "Added", note: "Extra words in the transcript" },
] as const;

function ErrorTypes() {
  const sets = [
    { name: `${RUN_LABEL[MAIN_RUN.id].short}, all prompts`, g: MAIN_RUN },
    { name: "Clean set", g: clean },
  ];
  return (
    <>
      <div className="grid gap-10 md:grid-cols-2">
        {sets.map(({ name, g }) => {
          const total = errorsOf(g);
          return (
            <div key={name} className="flex flex-col gap-4">
              <p className="meta text-muted">
                {name} · {fmtInt(total)} errors
              </p>
              <ul className="flex flex-col gap-4">
                {ERROR_ROWS.map((r, i) => {
                  const n = g.errorTypes[r.key];
                  return (
                    <li key={r.key} className="flex flex-col gap-1.5">
                      <span className="flex items-baseline justify-between gap-4 text-[0.9375rem]">
                        <span>
                          {r.label} <span className="text-[0.8125rem] text-muted">· {r.note}</span>
                        </span>
                        <span className="font-mono text-[0.875rem] tabular-nums">
                          {fmtInt(n)} <span className="text-muted">({pct1(n / total)})</span>
                        </span>
                      </span>
                      <Bar value={n / total} delay={i * 0.06} />
                    </li>
                  );
                })}
              </ul>
              <p className="text-[0.8125rem] leading-snug text-muted">
                Of the missing words, {fmtInt(g.errorTypes.trailingDels)} are at the very end of the clip.
              </p>
            </div>
          );
        })}
      </div>
      <Note>
        Counts from the word alignment of each transcript against its prompt, after normalization. Percentages
        are shares of all word errors in that set.
      </Note>
    </>
  );
}

function Content() {
  const top = werOf(hardest);
  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <caption className="sr-only">Clean set error rates by prompt type. Lower is better.</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Prompt type</th>
              <th scope="col" className={`${th} w-[38%]`}>Word error rate</th>
              <th scope="col" className={`${th} text-right`}>Word errors</th>
              <th scope="col" className={`${th} text-right`}>Char. error rate</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[0.875rem] tabular-nums">
            {contentRanked.map((g, i) => (
              <tr key={g.content}>
                <th scope="row" className={`${td} font-sans text-[0.9375rem] font-normal`}>
                  {CONTENT_LABEL[g.content]}
                </th>
                <td className={td}>
                  <span className="flex items-center gap-3">
                    <span className="flex-1">
                      <Bar value={top ? werOf(g) / top : 0} delay={i * 0.05} />
                    </span>
                    <span className="w-12 text-right">{pct1(werOf(g))}</span>
                  </span>
                </td>
                <td className={`${td} text-right`}>
                  {errorsOf(g)}
                  <span className="text-muted">/{fmtInt(g.refWords)}</span>
                </td>
                <td className={`${td} text-right`}>{pct1(cerOf(g))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        {CLEAN_SET_LABEL}, all step counts pooled. Character error rate is much lower than word error rate for
        names because a name that is nearly right (“thandiway” for “thandiwe”) still counts as a whole wrong word.
      </Note>
    </>
  );
}

function Orig() {
  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <caption className="sr-only">
            {RUN_LABEL[ORIG_RUN.id].title} by generation steps. Not a fair measurement of the model.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Steps (NFE)</th>
              <th scope="col" className={`${th} text-right`}>WER, intro removed</th>
              <th scope="col" className={`${th} text-right`}>WER, as recorded</th>
              <th scope="col" className={`${th} text-right`}>Char. error rate</th>
              <th scope="col" className={`${th} text-right`}>Silent clips</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[0.875rem] tabular-nums">
            {ORIG_RUN.byNfe.map((g, i) => (
              <tr key={g.nfe}>
                <th scope="row" className={`${td} font-normal`}>{g.nfe}</th>
                <td className={`${td} text-right`}>{pct1(werOf(g))}</td>
                <td className={`${td} text-right text-muted`}>{pct1(origFullWer[i])}</td>
                <td className={`${td} text-right`}>{pct1(cerOf(g))}</td>
                <td className={`${td} text-right`}>{g.rejectedClips}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        {ORIG_RUN.id}. The intro was “{METRICS.introPhrase}” “As recorded” counts it as added words; the official
        score removes it. Rates above 100% are possible because added words count as errors too. Silent clips
        are scored as fully wrong.
      </Note>
    </>
  );
}
