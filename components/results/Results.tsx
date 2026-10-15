"use client";

import { LayoutGroup, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import {
  MAIN_RUN,
  METRICS,
  ORIG_RUN,
  RUN_LABEL,
  cerOf,
  errorsOf,
  fmtInt,
  pct1,
  secs,
  werOf,
  type NfeGroup,
} from "@/lib/metrics";

type SeriesId = "clean" | "main" | "orig";
type Series = {
  id: SeriesId;
  title: string;
  tag: string;
  runId: string;
  clips: number;
  groups: NfeGroup[];
  /** Mark the lowest word error rate (meaningless for the broken run). */
  markBest: boolean;
};

const SERIES: Series[] = [
  {
    id: "clean",
    title: "Clean set",
    tag: "Fair measure",
    runId: MAIN_RUN.id,
    clips: METRICS.cleanSet.clips,
    groups: METRICS.cleanSet.byNfe,
    markBest: true,
  },
  {
    id: "main",
    title: "All prompts",
    tag: "Includes cut-off clips",
    runId: MAIN_RUN.id,
    clips: MAIN_RUN.clips,
    groups: MAIN_RUN.byNfe,
    markBest: true,
  },
  {
    id: "orig",
    title: RUN_LABEL[ORIG_RUN.id].short,
    tag: "Setup issue",
    runId: ORIG_RUN.id,
    clips: ORIG_RUN.clips,
    groups: ORIG_RUN.byNfe,
    markBest: false,
  },
];

const NFE = METRICS.nfe;
const X_MIN = NFE[0];
const X_MAX = NFE[NFE.length - 1];
const allWer = SERIES.flatMap((s) => s.groups.map(werOf));
/** 0% up to the next 20% step above the highest value. Never truncated. */
const Y_MAX = Math.ceil((Math.max(...allWer) * 100) / 20) * 0.2;
const Y_TICKS = Array.from({ length: Math.round(Y_MAX / 0.2) + 1 }, (_, i) => i * 0.2);

const x = (nfe: number) => ((nfe - X_MIN) / (X_MAX - X_MIN)) * 100;
const y = (v: number) => (1 - v / Y_MAX) * 100;
const ease = [0.22, 1, 0.36, 1] as const;
const range = (s: Series) => {
  const v = s.groups.map(werOf);
  return `${pct1(Math.min(...v))}–${pct1(Math.max(...v))}`;
};

const notes: Record<SeriesId, string> = {
  clean: `Short and medium prompts only. None reaches the ${secs(MAIN_RUN.maxDurationS)} length limit, so this is the fair measure.`,
  main: `Adds the long prompts, which get cut off at ${secs(MAIN_RUN.maxDurationS)}. ${pct1(MAIN_RUN.errorTypes.trailingDels / errorsOf(MAIN_RUN))} of these errors are missing endings.`,
  orig: `A setup bug added a spoken intro and cut ${ORIG_RUN.clipsAtMaxDuration} of ${ORIG_RUN.clips} clips off at ${secs(ORIG_RUN.maxDurationS)}. Not a fair measure; shown for completeness.`,
};

export function Results({ captionId }: { captionId: string }) {
  const [active, setActive] = useState<SeriesId>("clean");
  const [hover, setHover] = useState<number | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const series = SERIES.find((s) => s.id === active)!;
  const best = Math.min(...series.groups.map(werOf));
  const werTop = Math.max(...series.groups.map(werOf));
  const cerTop = Math.max(...series.groups.map(cerOf));

  const select = (i: number) => {
    const next = (i + SERIES.length) % SERIES.length;
    setActive(SERIES[next].id);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const moves: Record<string, number> = {
      ArrowRight: i + 1,
      ArrowDown: i + 1,
      ArrowLeft: i - 1,
      ArrowUp: i - 1,
      Home: 0,
      End: SERIES.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nfe = X_MIN + ((e.clientX - rect.left) / rect.width) * (X_MAX - X_MIN);
    let nearest = 0;
    NFE.forEach((n, i) => {
      if (Math.abs(n - nfe) < Math.abs(NFE[nearest] - nfe)) nearest = i;
    });
    setHover(nearest);
  };

  const chartSummary = SERIES.map((s) => `${s.title}: ${range(s)}`).join("; ");

  return (
    <div className="flex flex-col gap-12">
      {/* Selector: which clips the chart highlights and the table lists. */}
      <div>
        <LayoutGroup id={`${baseId}-sets`}>
          <div
            role="tablist"
            aria-label="Clip set"
            aria-orientation="horizontal"
            className="grid gap-px border border-rule bg-rule md:grid-cols-3"
          >
            {SERIES.map((s, i) => {
              const on = s.id === active;
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${s.id}`}
                  aria-selected={on}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(s.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`group relative flex cursor-pointer flex-col gap-3 p-5 text-left transition-colors duration-200 focus-visible:-outline-offset-4 md:p-6 ${
                    on ? "bg-accent text-ink" : "bg-paper text-ink/70 hover:bg-paper-hover hover:text-ink"
                  }`}
                >
                  {on ? (
                    <motion.span
                      layoutId={`${baseId}-set-bar`}
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-[3px] bg-accent-strong"
                      transition={{ duration: 0.45, ease }}
                    />
                  ) : null}
                  <span className="meta flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`grid size-3 place-items-center rounded-full border transition-colors ${on ? "border-accent-strong bg-paper" : "border-current"}`}
                      >
                        {on ? <span className="size-1.5 rounded-full bg-accent-strong" /> : null}
                      </span>
                      {String(i + 1).padStart(2, "0")} · {s.tag}
                    </span>
                    <LineSwatch id={s.id} />
                  </span>
                  <span className="text-xl tracking-[-0.02em] md:text-2xl">{s.title}</span>
                  <span className={`meta mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 tabular-nums ${on ? "border-accent-strong/40" : "border-rule"}`}>
                    <span>{fmtInt(s.clips)} clips</span>
                    <span>WER {range(s)}</span>
                    <span className="normal-case opacity-70">{s.runId}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${active}`} className="flex flex-col gap-12">
        <figure className="flex flex-col gap-4">
          <div className="meta flex min-h-[1.4em] flex-wrap items-baseline justify-end gap-x-6 gap-y-1 text-muted">
            <span className="tabular-nums text-ink">
              {hover === null
                ? ""
                : `NFE ${NFE[hover]} · ${SERIES.map((s) => `${s.title} ${pct1(werOf(s.groups[hover]))}`).join(" · ")}`}
            </span>
          </div>

          <div className="grid grid-cols-[2.75rem_1fr_5.5rem] md:grid-cols-[3rem_1fr_8rem]">
            <div aria-hidden="true" className="relative h-64 md:h-80">
              {Y_TICKS.map((t) => (
                <span
                  key={t}
                  className="meta absolute right-2 -translate-y-1/2 text-[0.6875rem] text-muted tabular-nums"
                  style={{ top: `${y(t)}%` }}
                >
                  {Math.round(t * 100)}%
                </span>
              ))}
            </div>

            <div
              className="relative h-64 touch-none md:h-80"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHover(null)}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible"
                role="img"
                aria-label={`Word error rate by generation steps, NFE ${X_MIN} to ${X_MAX}. ${chartSummary}. Values for the selected set are in the table below.`}
              >
                {Y_TICKS.map((t) => (
                  <line
                    key={t}
                    x1={0}
                    x2={100}
                    y1={y(t)}
                    y2={y(t)}
                    className={t === 0 ? "stroke-ink" : "stroke-rule"}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {NFE.map((n, i) => (
                  <line
                    key={n}
                    x1={x(n)}
                    x2={x(n)}
                    y1={0}
                    y2={100}
                    className={hover === i ? "stroke-ink/50" : "stroke-grid-faint"}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {SERIES.map((s) => (
                  <polyline
                    key={s.id}
                    points={s.groups.map((g) => `${x(g.nfe)},${y(werOf(g))}`).join(" ")}
                    fill="none"
                    className={`transition-[stroke,opacity] duration-300 ${s.id === active ? "stroke-ink" : "stroke-muted opacity-40"}`}
                    strokeWidth={s.id === active ? 2 : 1.25}
                    strokeDasharray={s.id === "orig" ? "4 4" : undefined}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              {SERIES.map((s) =>
                s.groups.map((g, i) => (
                  <span
                    key={`${s.id}-${g.nfe}`}
                    aria-hidden="true"
                    className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${
                      s.id === active ? "size-[7px] bg-ink" : "size-[5px] bg-muted opacity-40"
                    } ${hover === i ? "scale-150" : ""}`}
                    style={{ left: `${x(g.nfe)}%`, top: `${y(werOf(g))}%` }}
                  />
                )),
              )}
            </div>

            <div aria-hidden="true" className="relative h-64 md:h-80">
              {SERIES.map((s) => {
                const last = s.groups[s.groups.length - 1];
                return (
                  <span
                    key={s.id}
                    className={`absolute left-3 -translate-y-1/2 text-[0.75rem] leading-tight transition-colors md:text-[0.8125rem] ${
                      s.id === active ? "font-medium text-ink" : "text-muted"
                    }`}
                    style={{ top: `${y(werOf(last))}%` }}
                  >
                    {s.title}
                  </span>
                );
              })}
            </div>

            <span aria-hidden="true" />
            <div aria-hidden="true" className="relative mt-2 h-4">
              {NFE.map((n) => (
                <span
                  key={n}
                  className="meta absolute -translate-x-1/2 text-[0.6875rem] text-muted tabular-nums"
                  style={{ left: `${x(n)}%` }}
                >
                  {n}
                </span>
              ))}
            </div>
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span className="meta mt-3 text-[0.6875rem] text-muted">Generation steps (NFE)</span>
          </div>
        </figure>

        <div className="flex flex-col gap-4">
          <p className="meta text-muted">
            {series.title}
          </p>
          <div role="region" aria-labelledby={captionId} tabIndex={0} className="relative overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <caption className="sr-only">
                {series.title}: word and character error rate at each generation step count. Lower is better.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="meta border-b border-ink py-3 pr-4 font-normal text-muted">
                    Generation steps (NFE)
                  </th>
                  <th scope="col" className="meta w-[30%] border-b border-ink py-3 pr-4 font-normal text-muted">
                    Word error rate
                  </th>
                  <th scope="col" className="meta w-[20%] border-b border-ink py-3 pr-4 font-normal text-muted">
                    Character error rate
                  </th>
                  <th scope="col" className="meta border-b border-ink py-3 pr-4 text-right font-normal text-muted">
                    Word errors
                  </th>
                  <th scope="col" className="meta border-b border-ink py-3 pr-2 text-right font-normal text-muted">
                    Clips
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-[0.9375rem] tabular-nums">
                {series.groups.map((g, i) => {
                  const lead = series.markBest && werOf(g) === best;
                  return (
                    <tr
                      key={`${active}-${g.nfe}`}
                      className={`border-b border-rule transition-colors duration-200 ${lead ? "bg-accent" : "hover:bg-paper-hover"}`}
                    >
                      <th scope="row" className="py-4 pr-4 pl-2 font-normal">
                        <span className="flex items-center gap-4">
                          <span className="w-6 text-lg">{g.nfe}</span>
                          <StepGauge steps={g.nfe} />
                          {lead ? <span className="meta text-[0.625rem] text-ink/70">Lowest</span> : null}
                        </span>
                      </th>
                      <td className="py-4 pr-4">
                        <ValueBar value={werOf(g)} top={werTop} delay={i * 0.035} strong />
                      </td>
                      <td className="py-4 pr-4">
                        <ValueBar value={cerOf(g)} top={cerTop} delay={i * 0.035 + 0.05} />
                      </td>
                      <td className="py-4 pr-4 text-right">
                        {fmtInt(errorsOf(g))}
                        <span className="text-muted">/{fmtInt(g.refWords)}</span>
                      </td>
                      <td className="py-4 pr-2 text-right">
                        {g.clips}
                        {g.rejectedClips ? <span className="text-muted"> ({g.rejectedClips} silent)</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 max-w-measure text-[0.9375rem] leading-relaxed text-muted">{notes[active]}</p>
        </div>
      </div>
    </div>
  );
}

/** One tick per possible step, filled up to this row's step count. */
function StepGauge({ steps }: { steps: number }) {
  return (
    <span aria-hidden="true" className="hidden items-end gap-[2px] sm:flex">
      {Array.from({ length: X_MAX }, (_, k) => (
        <span key={k} className={`block h-3 w-[2px] ${k < steps ? "bg-ink" : "bg-rule"}`} />
      ))}
    </span>
  );
}

/** Value with a bar relative to the set's highest value. */
function ValueBar({
  value,
  top,
  delay,
  strong = false,
}: {
  value: number;
  top: number;
  delay: number;
  strong?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      <span className={`w-16 shrink-0 text-right ${strong ? "" : "text-ink/80"}`}>{pct1(value)}</span>
      <span aria-hidden="true" className="block h-1.5 flex-1 bg-rule/70">
        <motion.span
          className={`block h-full origin-left ${strong ? "bg-ink" : "bg-muted"}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: top ? value / top : 0 }}
          transition={{ duration: 0.6, ease, delay }}
        />
      </span>
    </span>
  );
}

/** Tiny line sample matching the chart: solid for the main run, dashed for the original setup. */
function LineSwatch({ id }: { id: SeriesId }) {
  return (
    <svg aria-hidden="true" width="28" height="6" className="shrink-0">
      <line
        x1="0"
        x2="28"
        y1="3"
        y2="3"
        stroke="currentColor"
        strokeWidth={id === "clean" ? 2 : 1.25}
        strokeDasharray={id === "orig" ? "4 4" : undefined}
      />
    </svg>
  );
}
