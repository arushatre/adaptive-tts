// Typed access to the generated benchmark data. Every number on the site
// comes from these two files (built by `npm run metrics` from data/raw/).
import demoJson from "@/data/demo_clips.json";
import summaryJson from "@/data/metrics_summary.json";

export type Version = "no_intro" | "full";
type Rate = { value: number; errors: number };

export type Group = {
  clips: number;
  rejectedClips: number;
  refWords: number;
  refChars: number;
  wer: Record<Version, Rate>;
  cer: Record<Version, Rate>;
  errorTypes: { subs: number; dels: number; ins: number; trailingDels: number };
  unfinishedClips: number;
  werHeard: { value: number; errors: number; refWords: number };
};
export type NfeGroup = Group & { nfe: number };
export type LengthId = "short" | "medium" | "long";
export type ContentId =
  | "plain"
  | "numbers"
  | "names_rare_words"
  | "acronyms_abbreviations"
  | "prosody"
  | "phonetic";
export type WerRange = { min: number; max: number; minNfe: number[]; maxNfe: number[] };

export type Run = Group & {
  id: RunId;
  introClips: number;
  maxDurationS: number;
  clipsAtMaxDuration: number;
  werRange: WerRange;
  byNfe: NfeGroup[];
  byLength: (Group & { length: LengthId; clipsAtMaxDuration: number })[];
  byContent: (Group & { content: ContentId })[];
};
export type RunId = "orig_3090" | "xvector_4090";

export type MetricsSummary = {
  source: { csv: string; runInfo: string; rows: number };
  asr: {
    package: string;
    packageVersion: string;
    model: string;
    computeType: string;
    beamSize: number;
    temperature: number;
    language: string;
    rejection: string;
  };
  normalization: { base: string; order: string; customRules: number };
  jiwerVersion: string;
  officialVersion: Version;
  introPhrase: string;
  nfe: number[];
  promptCount: number;
  overall: { clips: number; rejectedClips: number; refWords: number };
  cleanSet: Group & {
    run: RunId;
    lengths: LengthId[];
    prompts: number;
    maxDurationS: number;
    werRange: WerRange;
    byNfe: NfeGroup[];
    byContent: (Group & { content: ContentId })[];
  };
  runs: Run[];
  clipGrid: {
    run: RunId;
    nfe: number[];
    prompts: {
      id: string;
      length: LengthId;
      content: ContentId;
      text: string;
      refWords: number;
      errors: number[];
      atCap: boolean[];
    }[];
  };
};

export type AlignOp =
  | { op: "ok"; ref: string }
  | { op: "sub"; ref: string; hyp: string }
  | { op: "del"; ref: string }
  | { op: "ins"; hyp: string };

export type DemoClip = {
  nfe: number;
  file: string;
  src: string;
  durationS: number;
  sampleRate: number;
  transcript: string;
  refWords: number;
  errors: { subs: number; dels: number; ins: number };
  wer: number;
  cer: number;
  alignment: AlignOp[];
  peaks: number[];
};

export type DemoData = {
  run: RunId;
  promptId: string;
  text: string;
  length: LengthId;
  content: ContentId;
  peakBins: number;
  clips: DemoClip[];
};

export const METRICS = summaryJson as MetricsSummary;
export const DEMO = demoJson as DemoData;

const V = METRICS.officialVersion;
export const OFFICIAL: Version = V;

export const runById = (id: RunId) => METRICS.runs.find((r) => r.id === id)!;
export const MAIN_RUN = runById(METRICS.cleanSet.run);
export const ORIG_RUN = METRICS.runs.find((r) => r.id !== METRICS.cleanSet.run)!;

/** Reader-facing names. The ID is shown smaller beside the title. */
export const RUN_LABEL: Record<RunId, { title: string; short: string }> = {
  xvector_4090: { title: "X-vector voice conditioning", short: "X-vector run" },
  orig_3090: { title: "Original setup (reference-audio prompt)", short: "Original setup" },
};

export const LENGTH_LABEL: Record<LengthId, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};

export const CONTENT_LABEL: Record<ContentId, string> = {
  plain: "Plain sentences",
  numbers: "Numbers",
  names_rare_words: "Names & rare words",
  acronyms_abbreviations: "Acronyms & abbreviations",
  prosody: "Prosody",
  phonetic: "Tongue twisters",
};

/** 0.0351 → "3.5%". One decimal, never clamped. */
export const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;
/** Seconds as data shows them: 12.8 → "12.8 s". */
export const secs = (s: number) => `${s} s`;
export const fmtInt = (n: number) => n.toLocaleString("en-US");
/** [4, 32] → "4 and 32"; [4, 6, 8] → "4, 6 and 8". */
export const joinAnd = (xs: (string | number)[]) =>
  xs.length <= 1 ? String(xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

export const werOf = (g: Group) => g.wer[V].value;
export const cerOf = (g: Group) => g.cer[V].value;
export const errorsOf = (g: Group) => g.wer[V].errors;

const firstNfe = (groups: NfeGroup[]) => groups[0];
const lastNfe = (groups: NfeGroup[]) => groups[groups.length - 1];
export const CLEAN_FIRST = firstNfe(METRICS.cleanSet.byNfe);
export const CLEAN_LAST = lastNfe(METRICS.cleanSet.byNfe);
export const NFE_MIN = METRICS.nfe[0];
export const NFE_MAX = METRICS.nfe[METRICS.nfe.length - 1];

/** Prompts per content type, from the clip grid. */
export const promptsPerContent = (content: ContentId) =>
  METRICS.clipGrid.prompts.filter((p) => p.content === content).length;

export const CLEAN_SET_LABEL = `${RUN_LABEL[METRICS.cleanSet.run].short}, ${joinAnd(
  METRICS.cleanSet.lengths.map((l) => LENGTH_LABEL[l].toLowerCase()),
)} prompts`;

/** Method notes for /benchmarks#method, built from the run info. */
export const METHOD_NOTES = [
  {
    label: "Clips",
    summary: `${fmtInt(METRICS.source.rows)} clips: ${METRICS.runs.length} runs × ${METRICS.promptCount} prompts × ${METRICS.nfe.length} step counts.`,
    detail: `Each prompt was generated once at every step count (NFE ${joinAnd(METRICS.nfe)}). The prompts cover ${Object.keys(CONTENT_LABEL).length} types (${joinAnd(
      (Object.keys(CONTENT_LABEL) as ContentId[]).map((c) => CONTENT_LABEL[c].toLowerCase()),
    )}) at three lengths. ${METRICS.overall.rejectedClips} clips were silent; they stay in every score as fully wrong.`,
  },
  {
    label: "Transcription",
    summary: `Whisper ${METRICS.asr.model} via ${METRICS.asr.package} ${METRICS.asr.packageVersion}, language “${METRICS.asr.language}”.`,
    detail: `${METRICS.asr.computeType} weights, beam size ${METRICS.asr.beamSize}, temperature ${METRICS.asr.temperature}. Silence rule: ${METRICS.asr.rejection}. Whisper ${METRICS.asr.model} is not the most accurate Whisper model, so compare step counts with each other rather than reading the absolute numbers as final.`,
  },
  {
    label: "Normalization",
    summary: `${METRICS.normalization.base}, plus ${METRICS.normalization.customRules} format-only rules.`,
    detail: `Applied to both the prompt and the transcript before scoring, in this order: ${METRICS.normalization.order}. The custom rules only reconcile written and spoken forms (for example “Jan.” and “January”).`,
  },
  {
    label: "Word error rate",
    summary: "Total word errors ÷ total reference words, pooled over the clips in a group.",
    detail: `Errors are substitutions, deletions and insertions from a word alignment (jiwer ${METRICS.jiwerVersion}). Pooling means long prompts weigh more than short ones; it is not the average of per-clip rates. It can go above 100% when the audio contains extra words. Lower is better.`,
  },
  {
    label: "Character error rate",
    summary: "Total character errors ÷ total reference characters, spaces included.",
    detail: "Computed the same way as word error rate, one character at a time. It gives partial credit for a name that is nearly right, where word error rate counts the whole word as wrong. Lower is better.",
  },
  {
    label: "Clean set",
    summary: `${CLEAN_SET_LABEL}: ${fmtInt(METRICS.cleanSet.clips)} clips that never reach the length limit.`,
    detail: `Every long prompt in the ${RUN_LABEL[MAIN_RUN.id].short.toLowerCase()} stops at the ${secs(MAIN_RUN.maxDurationS)} generation limit, so its score mostly counts the missing ending. The ${METRICS.cleanSet.prompts} short and medium prompts end by ${secs(METRICS.cleanSet.maxDurationS)} at the latest, so their scores reflect what the model said, not where it was cut.`,
  },
  {
    label: "Runs",
    summary: `${RUN_LABEL[MAIN_RUN.id].title} is the fair measurement; the original setup is shown for completeness.`,
    detail: `The original setup (${ORIG_RUN.id}) prompted the model with reference audio whose transcript didn’t match, so ${ORIG_RUN.introClips} of ${ORIG_RUN.clips} clips start with an unintended intro (“${METRICS.introPhrase}”) and ${ORIG_RUN.clipsAtMaxDuration} stop at the ${secs(ORIG_RUN.maxDurationS)} limit. The intro is removed before scoring; the cut-off endings can’t be. The x-vector run (${MAIN_RUN.id}) conditions on a speaker embedding instead and has no intro.`,
  },
] as const;

/** Match a prompt word's capitalization: ("Valladolid", "vaya dalid") → "Vaya Dalid". */
export const caseLike = (original: string, heard: string) =>
  /^\p{Lu}/u.test(original)
    ? heard.replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toUpperCase())
    : heard;

export type WordCell = {
  status: "ok" | "changed" | "missing";
  /** What Whisper heard in place of the word (changed words only). */
  heard?: string;
  /** Extra words Whisper heard just before this word (insertions). */
  extra: string[];
};

/**
 * One cell per prompt word, straight from the word alignment. Each inserted
 * word is attached to the next prompt word (or the last one, at the end), so
 * every word error in the score belongs to exactly one cell.
 */
export function wordCells(ops: AlignOp[]): WordCell[] {
  const cells: WordCell[] = [];
  let pending: string[] = [];
  for (const o of ops) {
    if (o.op === "ins") {
      pending.push(o.hyp);
      continue;
    }
    cells.push(
      o.op === "ok"
        ? { status: "ok", extra: pending }
        : o.op === "sub"
          ? { status: "changed", heard: o.hyp, extra: pending }
          : { status: "missing", extra: pending },
    );
    pending = [];
  }
  if (pending.length && cells.length) cells[cells.length - 1].extra.push(...pending);
  return cells;
}

export type WordStatus = {
  word: string;
  status: "ok" | "changed" | "missing";
  /** What Whisper heard in place of this word (changed words only). */
  heard?: string;
  /** Extra words Whisper heard right after this one. */
  added?: string;
};

/**
 * Per-reference-word status from a clip's alignment. Runs of errors are
 * grouped, so "valladolid" → "vaya dalid" marks one changed word.
 */
export function wordStatuses(ops: AlignOp[]): WordStatus[] {
  const out: WordStatus[] = [];
  let i = 0;
  while (i < ops.length) {
    const o = ops[i];
    if (o.op === "ok") {
      out.push({ word: o.ref, status: "ok" });
      i++;
      continue;
    }
    const ref: string[] = [];
    const hyp: string[] = [];
    while (i < ops.length && ops[i].op !== "ok") {
      const e = ops[i];
      if (e.op === "sub" || e.op === "del") ref.push(e.ref);
      if (e.op === "sub" || e.op === "ins") hyp.push(e.hyp);
      i++;
    }
    if (ref.length === 0) {
      // Pure insertion: attach to the previous word.
      const prev = out[out.length - 1];
      if (prev) prev.added = [prev.added, ...hyp].filter(Boolean).join(" ");
      continue;
    }
    for (const w of ref) {
      out.push(hyp.length ? { word: w, status: "changed", heard: hyp.join(" ") } : { word: w, status: "missing" });
    }
  }
  return out;
}

/**
 * Bar heights for the waveform players. Peaks are stored linearly (0–1 of
 * the loudest bin); a square-root scale keeps quieter syllables visible.
 */
export const displayPeaks = (peaks: number[]) => peaks.map((p) => Math.sqrt(p));
