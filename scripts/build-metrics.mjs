#!/usr/bin/env node
// Builds the site's data files from the scored clips CSV:
//   data/metrics_summary.json  corpus metrics by run, NFE, length and content
//   data/demo_clips.json       one prompt at every NFE: transcripts, word
//                              alignment and waveform peaks for the players
//
// Group metrics are corpus metrics, exactly as defined in wer_run_info.json:
//   WER = Σ(subs + dels + ins) / Σ ref_words
//   CER = Σ(per-clip uncapped CER × reference chars) / Σ reference chars
// The plain `wer` / `cer` columns are capped at 1.0 per clip and are NOT used.
// The script checks itself against the reference aggregates in
// wer_run_info.json and the analysis deliverable (summary.md), and exits
// non-zero without writing anything on any mismatch.
//
// Usage: npm run metrics

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = "data/raw/clips_arush.csv";
const RUN_INFO_PATH = "data/raw/wer_run_info.json";
const OUT_PATH = "data/metrics_summary.json";
const DEMO_OUT_PATH = "data/demo_clips.json";
const VERSIONS = ["no_intro", "full"];
const OFFICIAL = "no_intro";
const TOLERANCE = 5e-5; // "match to 4 decimals"

/** The fair run, and the prompts that never hit its length cap. */
const MAIN_RUN = "xvector_4090";
const CLEAN_LENGTHS = ["short", "medium"];
const LENGTHS = ["short", "medium", "long"];
const CONTENTS = ["plain", "numbers", "names_rare_words", "acronyms_abbreviations", "prosody", "phonetic"];

/** Demo prompt: medium length (never capped), errors that change with NFE. */
const DEMO_RUN = MAIN_RUN;
const DEMO_PROMPT = "p022";
const AUDIO_DIR = "public/audio";
const PEAK_BINS = 120;
// Peak level per bin (max |sample|), so the bars read like a waveform.

/** RFC 4180 parser: quoted fields may contain commas, quotes ("") and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  return body.map((r) => {
    if (r.length !== header.length) {
      throw new Error(`CSV row has ${r.length} fields, header has ${header.length}: ${r[0]}`);
    }
    return Object.fromEntries(header.map((h, i) => [h, r[i]]));
  });
}

const failures = [];
const fail = (msg) => failures.push(msg);

const int = (row, col) => {
  const v = Number.parseInt(row[col], 10);
  if (!Number.isFinite(v)) throw new Error(`Non-integer ${col} in ${row.file}: "${row[col]}"`);
  return v;
};
const num = (row, col) => {
  const v = Number.parseFloat(row[col]);
  if (!Number.isFinite(v)) throw new Error(`Non-numeric ${col} in ${row.file}: "${row[col]}"`);
  return v;
};
// Count code points, matching Python's len() used by the scoring run.
const chars = (s) => [...s].length;
const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
const wordErrors = (r, v) => int(r, `subs_${v}`) + int(r, `dels_${v}`) + int(r, `ins_${v}`);

const rows = parseCsv(readFileSync(join(ROOT, CSV_PATH), "utf8"));
const runInfo = JSON.parse(readFileSync(join(ROOT, RUN_INFO_PATH), "utf8"));

if (rows.length !== runInfo.clips) fail(`row count ${rows.length} ≠ run info clips ${runInfo.clips}`);

const runIds = [...new Set(rows.map((r) => r.run_id))].sort();
const nfes = [...new Set(rows.map((r) => int(r, "nfe")))].sort((a, b) => a - b);
const promptIds = [...new Set(rows.map((r) => r.prompt_id))].sort();
const promptCount = promptIds.length;

for (const r of rows) {
  if (!LENGTHS.includes(r.length)) fail(`unknown length "${r.length}" in ${r.file}`);
  if (!CONTENTS.includes(r.content)) fail(`unknown content "${r.content}" in ${r.file}`);
}

/** Corpus aggregates for a set of clips. */
function aggregate(clips) {
  const refWords = sum(clips, (r) => int(r, "ref_words"));
  const refChars = sum(clips, (r) => chars(r.ref_norm));
  const out = {
    clips: clips.length,
    rejectedClips: clips.filter((r) => r.asr_status !== "ok").length,
    refWords,
    refChars,
    wer: {},
    cer: {},
  };
  for (const v of VERSIONS) {
    const errors = sum(clips, (r) => wordErrors(r, v));
    const charErrors = sum(clips, (r) => num(r, `cer_${v}`) * chars(r.ref_norm));
    out.wer[v] = { value: refWords ? errors / refWords : 0, errors };
    out.cer[v] = { value: refChars ? charErrors / refChars : 0, errors: Math.round(charErrors) };
  }
  // Official-version detail: error types and cut-off endings.
  const v = OFFICIAL;
  out.errorTypes = {
    subs: sum(clips, (r) => int(r, `subs_${v}`)),
    dels: sum(clips, (r) => int(r, `dels_${v}`)),
    ins: sum(clips, (r) => int(r, `ins_${v}`)),
    trailingDels: sum(clips, (r) => int(r, `trailing_dels_${v}`)),
  };
  out.unfinishedClips = clips.filter((r) => int(r, `missing_end_words_${v}`) > 0).length;
  const heardErrors = sum(clips, (r) => int(r, "heard_errors"));
  const heardRefWords = sum(clips, (r) => int(r, "heard_ref_words"));
  out.werHeard = { value: heardRefWords ? heardErrors / heardRefWords : 0, errors: heardErrors, refWords: heardRefWords };
  return out;
}

/** Aggregate per NFE, checking every group has one clip per prompt. */
function byNfe(clips, label, expected) {
  return nfes.map((nfe) => {
    const group = clips.filter((r) => int(r, "nfe") === nfe);
    if (group.length !== expected) fail(`${label} NFE ${nfe}: ${group.length} clips, expected ${expected}`);
    return { nfe, ...aggregate(group) };
  });
}

/** Spread of the official WER across NFE, with every NFE that ties at each end. */
function werRange(groups) {
  const values = groups.map((g) => g.wer[OFFICIAL].value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    min,
    max,
    minNfe: groups.filter((g) => g.wer[OFFICIAL].value === min).map((g) => g.nfe),
    maxNfe: groups.filter((g) => g.wer[OFFICIAL].value === max).map((g) => g.nfe),
  };
}

const runs = runIds.map((id) => {
  const runClips = rows.filter((r) => r.run_id === id);
  const durations = runClips.map((r) => num(r, "duration_s"));
  const maxDurationS = Math.max(...durations);
  const atCap = (r) => num(r, "duration_s") === maxDurationS;
  const nfeGroups = byNfe(runClips, id, promptCount);
  return {
    id,
    ...aggregate(runClips),
    introClips: runClips.filter((r) => r.intro_text.trim() !== "").length,
    maxDurationS,
    clipsAtMaxDuration: runClips.filter(atCap).length,
    werRange: werRange(nfeGroups),
    byNfe: nfeGroups,
    byLength: LENGTHS.map((length) => {
      const group = runClips.filter((r) => r.length === length);
      return { length, ...aggregate(group), clipsAtMaxDuration: group.filter(atCap).length };
    }),
    byContent: CONTENTS.map((content) => ({
      content,
      ...aggregate(runClips.filter((r) => r.content === content)),
    })),
  };
});

// Clean set: the main run's short and medium prompts (no clip reaches the cap).
const mainRun = runs.find((r) => r.id === MAIN_RUN);
const mainClips = rows.filter((r) => r.run_id === MAIN_RUN);
const cleanClips = mainClips.filter((r) => CLEAN_LENGTHS.includes(r.length));
const cleanPrompts = new Set(cleanClips.map((r) => r.prompt_id)).size;
const cleanNfe = byNfe(cleanClips, "clean set", cleanPrompts);
const cleanMaxDurationS = Math.max(...cleanClips.map((r) => num(r, "duration_s")));
const cleanSet = {
  run: MAIN_RUN,
  lengths: CLEAN_LENGTHS,
  prompts: cleanPrompts,
  ...aggregate(cleanClips),
  maxDurationS: cleanMaxDurationS,
  werRange: werRange(cleanNfe),
  byNfe: cleanNfe,
  byContent: CONTENTS.map((content) => ({
    content,
    ...aggregate(cleanClips.filter((r) => r.content === content)),
  })),
};
if (cleanMaxDurationS >= mainRun.maxDurationS) fail(`clean set reaches the length cap (${cleanMaxDurationS} s)`);

// Per-clip grid for the main run: one row per prompt, one error count per NFE.
const clipGrid = {
  run: MAIN_RUN,
  nfe: nfes,
  prompts: promptIds.map((pid) => {
    const clips = mainClips.filter((r) => r.prompt_id === pid);
    const first = clips[0];
    return {
      id: pid,
      length: first.length,
      content: first.content,
      text: first.text,
      refWords: int(first, "ref_words"),
      errors: nfes.map((nfe) => {
        const c = clips.filter((r) => int(r, "nfe") === nfe);
        if (c.length !== 1) fail(`grid ${pid} NFE ${nfe}: ${c.length} clips`);
        if (int(c[0], "ref_words") !== int(first, "ref_words")) fail(`grid ${pid}: ref_words differ across NFE`);
        return wordErrors(c[0], OFFICIAL);
      }),
      atCap: nfes.map((nfe) => {
        const c = clips.find((r) => int(r, "nfe") === nfe);
        return num(c, "duration_s") === mainRun.maxDurationS;
      }),
    };
  }),
};

// ---- Demo clips: one prompt at every NFE ------------------------------------

/** Word-level Levenshtein alignment, as ops in reading order. */
function align(ref, hyp) {
  const n = ref.length;
  const m = hyp.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1), d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) {
      ops.push(ref[i - 1] === hyp[j - 1] ? { op: "ok", ref: ref[i - 1] } : { op: "sub", ref: ref[i - 1], hyp: hyp[j - 1] });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ op: "del", ref: ref[i - 1] });
      i--;
    } else {
      ops.push({ op: "ins", hyp: hyp[j - 1] });
      j--;
    }
  }
  return ops.reverse();
}

/** Mono 16-bit PCM WAV: sample rate, duration and peak level per bin. */
function readWav(path) {
  const buf = readFileSync(path);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${path} is not a WAV file`);
  }
  let fmt = null;
  let data = null;
  for (let off = 12; off + 8 <= buf.length; ) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") {
      fmt = {
        format: buf.readUInt16LE(off + 8),
        channels: buf.readUInt16LE(off + 10),
        rate: buf.readUInt32LE(off + 12),
        bits: buf.readUInt16LE(off + 22),
      };
    } else if (id === "data") {
      data = buf.subarray(off + 8, off + 8 + size);
    }
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`${path}: missing fmt or data chunk`);
  if (fmt.format !== 1 || fmt.channels !== 1 || fmt.bits !== 16) {
    throw new Error(`${path}: expected mono 16-bit PCM, got ${JSON.stringify(fmt)}`);
  }
  const samples = data.length / 2;
  const peak = [];
  for (let b = 0; b < PEAK_BINS; b++) {
    const start = Math.floor((b * samples) / PEAK_BINS);
    const end = Math.floor(((b + 1) * samples) / PEAK_BINS);
    let max = 0;
    for (let s = start; s < end; s++) max = Math.max(max, Math.abs(data.readInt16LE(s * 2)) / 32768);
    peak.push(max);
  }
  return { rate: fmt.rate, durationS: samples / fmt.rate, peak };
}

const demoRows = rows
  .filter((r) => r.run_id === DEMO_RUN && r.prompt_id === DEMO_PROMPT)
  .sort((a, b) => int(a, "nfe") - int(b, "nfe"));
if (demoRows.length !== nfes.length) fail(`demo ${DEMO_PROMPT}: ${demoRows.length} clips, expected ${nfes.length}`);

const demoAudio = demoRows.map((r) => readWav(join(ROOT, AUDIO_DIR, r.file)));
const loudest = Math.max(...demoAudio.flatMap((a) => a.peak));
const demoClips = demoRows.map((r, k) => {
  const audio = demoAudio[k];
  if (Math.abs(audio.durationS - num(r, "duration_s")) > 1e-6) {
    fail(`demo ${r.file}: WAV is ${audio.durationS} s, CSV says ${r.duration_s} s`);
  }
  if (r.intro_text.trim() !== "") fail(`demo ${r.file} has an intro; its transcript is not the scored text`);
  const ops = align(r.ref_norm.split(" ").filter(Boolean), r.hyp_norm.split(" ").filter(Boolean));
  const count = (op) => ops.filter((o) => o.op === op).length;
  const [subs, dels, ins] = ["sub", "del", "ins"].map(count);
  const total = subs + dels + ins;
  if (total !== wordErrors(r, OFFICIAL)) {
    fail(`demo ${r.file}: alignment has ${total} errors, CSV has ${wordErrors(r, OFFICIAL)}`);
  }
  const words = int(r, "ref_words");
  return {
    nfe: int(r, "nfe"),
    file: r.file,
    src: `/audio/${r.file}`,
    durationS: num(r, "duration_s"),
    sampleRate: audio.rate,
    transcript: r.transcript,
    refWords: words,
    // Counts as scored (jiwer); the alignment below only places them.
    errors: { subs: int(r, `subs_${OFFICIAL}`), dels: int(r, `dels_${OFFICIAL}`), ins: int(r, `ins_${OFFICIAL}`) },
    wer: wordErrors(r, OFFICIAL) / words,
    cer: num(r, `cer_${OFFICIAL}`),
    alignment: ops,
    peaks: audio.peak.map((x) => Math.round((x / loudest) * 1000) / 1000),
  };
});

// ---- Self-check against wer_run_info.json --------------------------------
const close = (a, b) => Math.abs(a - b) < TOLERANCE;

const overall = aggregate(rows);
for (const v of VERSIONS) {
  const ref = runInfo.corpus_wer[v];
  if (overall.wer[v].errors !== ref.errors || overall.refWords !== ref.ref_words || !close(overall.wer[v].value, ref.wer)) {
    fail(`corpus WER ${v}: got ${overall.wer[v].errors}/${overall.refWords}, expected ${ref.errors}/${ref.ref_words}`);
  }
}
{
  const ref = runInfo.corpus_wer_heard;
  if (overall.werHeard.errors !== ref.errors || overall.werHeard.refWords !== ref.heard_ref_words || !close(overall.werHeard.value, ref.wer)) {
    fail(`corpus wer_heard: got ${overall.werHeard.errors}/${overall.werHeard.refWords}, expected ${ref.errors}/${ref.heard_ref_words}`);
  }
}

let cerChecked = 0;
for (const run of runs) {
  for (const g of run.byNfe) {
    const ref = runInfo.corpus_cer["run_id x nfe"][`${run.id} nfe${g.nfe}`];
    if (!ref) {
      fail(`no reference CER for ${run.id} nfe${g.nfe}`);
      continue;
    }
    for (const v of VERSIONS) {
      const r = ref[v];
      if (!close(g.cer[v].value, r.cer) || g.refChars !== r.ref_chars || g.cer[v].errors !== r.char_errors || g.clips !== r.clips) {
        fail(`CER ${run.id} nfe${g.nfe} ${v}: got ${g.cer[v].value} (${g.cer[v].errors}/${g.refChars}), expected ${r.cer} (${r.char_errors}/${r.ref_chars})`);
      }
      cerChecked++;
    }
  }
}

// ---- Self-check against the analysis deliverable (summary.md) -------------
// Reference values copied from summary.md (2026-10-14), sections 4, 9, 10, 12.
const SUMMARY = {
  runWer: { orig_3090: 0.9661, xvector_4090: 0.2002 },
  runCer: { orig_3090: 0.9567, xvector_4090: 0.1799 },
  runWerHeard: { orig_3090: 0.255, xvector_4090: 0.0235 },
  runLengthWer: {
    orig_3090: { short: 0.4796, medium: 1.0586, long: 0.9896 },
    xvector_4090: { short: 0.0363, medium: 0.0348, long: 0.285 },
  },
  clean: {
    errors: [11, 16, 15, 15, 13, 19, 15, 15, 11],
    unfinished: [0, 1, 0, 1, 2, 2, 0, 0, 1],
    refWordsPerNfe: 411,
    clipsPerNfe: 36,
    total: { errors: 130, refWords: 3699, wer: 0.0351 },
  },
};
let summaryChecked = 0;
const near = (a, b) => Math.abs(a - b) < 5e-5 + 1e-12;
const round4 = (x) => Math.round(x * 1e4) / 1e4;
for (const run of runs) {
  const checks = [
    [`${run.id} WER`, round4(run.wer[OFFICIAL].value), SUMMARY.runWer[run.id]],
    [`${run.id} CER`, round4(run.cer[OFFICIAL].value), SUMMARY.runCer[run.id]],
    [`${run.id} wer_heard`, round4(run.werHeard.value), SUMMARY.runWerHeard[run.id]],
    ...run.byLength.map((g) => [`${run.id} ${g.length} WER`, round4(g.wer[OFFICIAL].value), SUMMARY.runLengthWer[run.id][g.length]]),
  ];
  for (const [label, got, want] of checks) {
    if (!near(got, want)) fail(`summary.md ${label}: got ${got}, expected ${want}`);
    summaryChecked++;
  }
}
cleanSet.byNfe.forEach((g, i) => {
  if (g.wer[OFFICIAL].errors !== SUMMARY.clean.errors[i]) fail(`clean NFE ${g.nfe}: ${g.wer[OFFICIAL].errors} errors, expected ${SUMMARY.clean.errors[i]}`);
  if (g.unfinishedClips !== SUMMARY.clean.unfinished[i]) fail(`clean NFE ${g.nfe}: ${g.unfinishedClips} unfinished, expected ${SUMMARY.clean.unfinished[i]}`);
  if (g.refWords !== SUMMARY.clean.refWordsPerNfe || g.clips !== SUMMARY.clean.clipsPerNfe) fail(`clean NFE ${g.nfe}: ${g.clips} clips / ${g.refWords} words`);
  summaryChecked += 3;
});
if (cleanSet.wer[OFFICIAL].errors !== SUMMARY.clean.total.errors || cleanSet.refWords !== SUMMARY.clean.total.refWords || round4(cleanSet.wer[OFFICIAL].value) !== SUMMARY.clean.total.wer) {
  fail(`clean total: ${cleanSet.wer[OFFICIAL].errors}/${cleanSet.refWords}`);
}
summaryChecked++;

// Group sums must add back up to the run totals.
for (const run of runs) {
  for (const key of ["byLength", "byContent", "byNfe"]) {
    const errs = sum(run[key], (g) => g.wer[OFFICIAL].errors);
    const words = sum(run[key], (g) => g.refWords);
    if (errs !== run.wer[OFFICIAL].errors || words !== run.refWords) fail(`${run.id} ${key} does not sum to the run total`);
  }
}
const gridErrors = sum(clipGrid.prompts, (p) => sum(p.errors, (e) => e));
if (gridErrors !== mainRun.wer[OFFICIAL].errors) fail(`clip grid errors ${gridErrors} ≠ run total ${mainRun.wer[OFFICIAL].errors}`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} check(s) failed. Nothing was written.\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

// ---- Write ---------------------------------------------------------------
const summary = {
  source: {
    csv: CSV_PATH,
    runInfo: RUN_INFO_PATH,
    rows: rows.length,
    checks: {
      corpusWer: `pass (${VERSIONS.join(", ")})`,
      corpusCerByRunNfe: `pass (${cerChecked}/${cerChecked})`,
      summaryMd: `pass (${summaryChecked}/${summaryChecked})`,
    },
  },
  asr: {
    package: runInfo.asr.package,
    packageVersion: runInfo.asr.faster_whisper_version,
    model: runInfo.asr.whisper_model,
    computeType: runInfo.asr.settings.compute_type,
    beamSize: runInfo.asr.settings.beam_size,
    temperature: runInfo.asr.settings.temperature,
    language: runInfo.asr.settings.language,
    rejection: runInfo.asr.rejection,
  },
  normalization: {
    base: runInfo.normalization.base,
    order: runInfo.normalization.order,
    customRules: runInfo.normalization.pre_rules.length + runInfo.normalization.post_rules.length,
  },
  jiwerVersion: runInfo.metrics.jiwer_version,
  officialVersion: runInfo.versions.official,
  introPhrase: runInfo.versions.intro_phrase_raw,
  nfe: nfes,
  promptCount,
  overall: { clips: overall.clips, rejectedClips: overall.rejectedClips, refWords: overall.refWords, wer: overall.wer, cer: overall.cer },
  cleanSet,
  runs,
  clipGrid,
};
const demo = {
  run: DEMO_RUN,
  promptId: DEMO_PROMPT,
  text: demoRows[0].text,
  length: demoRows[0].length,
  content: demoRows[0].content,
  peakBins: PEAK_BINS,
  clips: demoClips,
};
writeFileSync(join(ROOT, OUT_PATH), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(join(ROOT, DEMO_OUT_PATH), `${JSON.stringify(demo, null, 2)}\n`);

// ---- Terminal tables -------------------------------------------------------
const pct = (x) => `${(x * 100).toFixed(1)}%`.padStart(8);
console.log(`\nCorpus metrics by run and NFE (official version: ${summary.officialVersion})\n`);
console.log(`${"group".padEnd(14)}${"NFE".padStart(4)}${"WER".padStart(9)}${"WER full".padStart(10)}${"CER".padStart(9)}${"CER full".padStart(10)}${"clips".padStart(7)}${"silent".padStart(8)}`);
for (const [label, groups] of [...runs.map((r) => [r.id, r.byNfe]), ["clean set", cleanSet.byNfe]]) {
  console.log("-".repeat(71));
  for (const g of groups) {
    console.log(
      `${label.padEnd(14)}${String(g.nfe).padStart(4)} ${pct(g.wer.no_intro.value)}  ${pct(g.wer.full.value)} ${pct(g.cer.no_intro.value)}  ${pct(g.cer.full.value)}${String(g.clips).padStart(7)}${String(g.rejectedClips).padStart(8)}`,
    );
  }
}
console.log("-".repeat(71));
for (const run of runs) {
  console.log(
    `${run.id}: WER ${pct(run.wer.no_intro.value).trim()}, CER ${pct(run.cer.no_intro.value).trim()}; ${run.clips} clips, ${run.introClips} with intro, ${run.rejectedClips} silent, longest ${run.maxDurationS} s (${run.clipsAtMaxDuration} clips at that length)`,
  );
  console.log(`  by length: ${run.byLength.map((g) => `${g.length} ${pct(g.wer.no_intro.value).trim()} (${g.clipsAtMaxDuration} at cap)`).join(", ")}`);
}
console.log(
  `clean set (${MAIN_RUN} ${CLEAN_LENGTHS.join(" + ")}): WER ${pct(cleanSet.wer.no_intro.value).trim()}, CER ${pct(cleanSet.cer.no_intro.value).trim()}, ${cleanSet.clips} clips, longest ${cleanSet.maxDurationS} s; range ${pct(cleanSet.werRange.min).trim()} (NFE ${cleanSet.werRange.minNfe}) to ${pct(cleanSet.werRange.max).trim()} (NFE ${cleanSet.werRange.maxNfe})`,
);
console.log(`  by content: ${cleanSet.byContent.map((g) => `${g.content} ${pct(g.wer.no_intro.value).trim()}`).join(", ")}`);
console.log(`\nDemo ${DEMO_RUN} ${DEMO_PROMPT}: "${demo.text}"`);
for (const c of demoClips) {
  console.log(`  NFE ${String(c.nfe).padStart(2)}  WER ${pct(c.wer)}  CER ${pct(c.cer)}  S/D/I ${c.errors.subs}/${c.errors.dels}/${c.errors.ins}  ${c.durationS} s  ${c.transcript}`);
}
console.log(`\nOverall WER: ${pct(overall.wer.no_intro.value).trim()} no_intro, ${pct(overall.wer.full.value).trim()} full (${overall.refWords} reference words)`);
console.log(`✓ Checks passed: corpus WER (${VERSIONS.length} versions) and wer_heard, CER per run × NFE (${cerChecked}/${cerChecked}), summary.md (${summaryChecked}/${summaryChecked}), group sums, demo audio and alignment`);
console.log(`✓ Wrote ${OUT_PATH} and ${DEMO_OUT_PATH}\n`);
