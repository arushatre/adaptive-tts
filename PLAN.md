# Plan: publish dots.tts benchmark results on the homepage

Status: **Phase 2 in progress.** Decisions from the user (2026-10-15) override anything below that conflicts:

- **Keep every existing homepage section** (placeholders included). Nothing is removed. The new Results section is inserted directly after the Hero.
- **Keep placeholder leftovers** (announcement bar, footer model line, page description, contact email) as they are for now.
- **Hero:** replace only the headline and paragraph. Headline chosen by the user: "Fewer steps, same result. We proved it." (see the wording concern raised at the checkpoint). Keep the hero figure.
- **Chart:** one shared 0–120% axis, both runs; `orig_3090` dashed and labelled.
- **Run names:** each run gets a plain-language title readable by the public, with its ID shown smaller beside it.
- **21st.dev:** skipped.
- Unused-file deletion and the "remove a section" steps no longer apply.

---

## 1. Site audit

- **Framework:** Next.js 16.3.8 App Router, React 19, TypeScript, all routes static. Homepage is `app/page.tsx`; its sections are in `components/home/` and `components/`.
- **Tokens:** Tailwind v4 with no config file. Every token is in `app/globals.css` under `@theme` (paper/ink/night colors, one bone accent, `text-hero`/`text-h2`/`text-meta` scale, `section-y`, `gutter`, `rail-box`). Fonts: Geist and Geist Mono via `next/font`.
- **Libraries:** `motion` only. **No chart or table library, and no shadcn/ui.** `resolveJsonModule` is on, so typed JSON imports work.
- **21st.dev:** not connected in this session.

### Homepage sections

| # | Section | Status | Why |
|---|---|---|---|
| — | Nav (`Nav`) | **REAL** structure. **PLACEHOLDER** announcement bar | `ANNOUNCEMENT` points to a post that doesn't exist |
| 0 | `Hero` | **PLACEHOLDER** copy and figure | Headline/paragraph describe a made-up predictor; `StepMask` draws an invented schedule; status line says "Placeholder data" |
| — | `MetricsStrip` | **PLACEHOLDER** | 3.1×, 7.8/32, −0.04 MOS, 1.8 ms: all invented (`STEP_BUDGET`, `PREDICTOR`) |
| 01 | `AdaptiveDemo` | **PLACEHOLDER** | Mock playback, invented step schedules |
| 02 | Benchmark / `Leaderboard` | **PLACEHOLDER** | Invented methods and MOS/WER/latency |
| 03 | `ArchitectureBreakdown` | **PLACEHOLDER** | Invented components and figures |
| 04 | Analysis / `Findings` | **PLACEHOLDER** | Invented listening tests and segment stats |
| 05 | Research / `ResearchIndex` | **PLACEHOLDER** | Posts that don't exist |
| 06 | `FeedbackBox` | **REAL** feature, **broken target** | Works, but sends mail to `hello@adaptive-tts.example`, which isn't a real inbox |
| — | Footer | **REAL** structure. **PLACEHOLDER** `MODEL_STATUS` line, "Latest notes" | Invented model version and posts |

Outside the sections: `metadata.description` in `app/layout.tsx` (invented speedup claim) and the "Adaptive TTS" wordmark (the real project is WAT.ai / dots.tts).

---

## 2. Data audit (`data/raw/clips_arush.csv`, `wer_run_info.json`)

- **972 rows = 2 runs × 54 prompts × 9 NFE values.** Runs: `orig_3090`, `xvector_4090`. NFE: 4, 6, 8, 10, 12, 16, 20, 24, 32. 38 columns.
- **Headline-metric inputs:** `subs_{v}`, `dels_{v}`, `ins_{v}`, `ref_words`; `cer_{v}` with `ref_norm` (`{v}` = `no_intro` | `full`). Also available: `heard_errors`, `heard_ref_words`, `wer_heard`.
- **Grouping:** `run_id`, `nfe`, `prompt_id`, `length` (short/medium/long, 324 each), `content` (6 types, 162 each).
- **Detail/debug:** `transcript`, `hyp_norm`, `intro_text`, `ref_norm`, `trailing_dels_*`, `missing_end_words*`, `heard_*`, `duration_s`, `asr_status`, `file`, `repo_path`, `text`, `wer_version`, and the per-clip `wer`, `cer`, `wer_uncapped`, `cer_uncapped`, `wer_full`, `cer_full`, `wer_no_intro`, `cer_no_intro`.
- **Missing values:** `transcript`/`hyp_norm` are empty for 4 clips (the silent ones). `wer_heard` is empty for 276 clips where no reference word was heard (as documented). `intro_text` is empty for 491 clips (no intro). Nothing else is missing.
- **Non-`ok` `asr_status`:** 4 clips, all `orig_3090` (p018 NFE 8, p034 NFE 8, p036 NFE 6, p045 NFE 8), rejected as silent. As documented, they are scored WER = CER = 1.0 with every word deleted.
- **No SIM, latency or other team metric columns exist.** SIM is out of scope.

### Metric definition (checked)
Using corpus metrics as defined in `wer_run_info.json`, the CSV reproduces the JSON exactly:
- **Overall WER:** `no_intro` 12,712 / 21,798 = 0.583173; `full` 15,452 / 21,798 = 0.708872. Exact match.
- **CER per run × NFE:** both versions, all 18 groups. Exact match (difference 0).
- The plain `wer`/`cer` columns are capped at 1.0 per clip; averaging them gives wrong group numbers, so they are not used.

### `orig_3090`: with vs without intro
Both versions are in the CSV (`*_full` = transcript as is; `*_no_intro` = intro phrase removed; `no_intro` is official). 481 of 486 clips contain the intro, and **445 of 486 clips hit the 9.12 s length cap** (`xvector_4090` clips run to 12.8 s). Removing the intro only partly helps:

| NFE | 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 |
|---|---|---|---|---|---|---|---|---|---|
| WER, intro removed | 98.3% | 95.9% | 91.8% | 90.8% | 92.4% | 108.7% | 98.3% | 102.2% | 91.2% |
| WER, as recorded | 126.9% | 121.1% | 117.6% | 115.4% | 115.8% | 135.2% | 121.5% | 124.8% | 117.7% |

Removing the intro still leaves the sentences cut off, so `orig_3090` stays unusable as a quality measurement. For reference, `xvector_4090` sits at 17.9–23.9% WER and is not monotonic in NFE (best at 12, worst at 20). These are preview numbers from the plan check; the build script will print the official table for sign-off.

---

## 3. Plan

### Homepage after the change
**Keep:** Nav, Hero (new real copy, no figure), **Results (new)**, FeedbackBox, Footer.
**Remove from the homepage:** MetricsStrip, AdaptiveDemo, Benchmark/Leaderboard, ArchitectureBreakdown, Analysis/Findings, Research/ResearchIndex.

- No component file gets deleted in this task. `Leaderboard`, `Findings` and `ResearchIndex` are still used by `/benchmarks` and `/research`. Files that become unused: `MetricsStrip`, `AdaptiveDemo`, `StepMask`, `ArchitectureBreakdown`. I'll list them in the final summary and delete them only if you say so.
- The site outline (rails, section rules, 3/9 header grid, tokens, type, nav, footer) is unchanged. The page just has fewer sections.

### Summary JSON: `data/metrics_summary.json` (generated, never hand-edited)
```jsonc
{
  "source": {
    "csv": "data/raw/clips_arush.csv",
    "runInfo": "data/raw/wer_run_info.json",
    "rows": 972,
    "generatedAt": "2026-10-15T…Z",
    "checks": { "corpusWer": "pass", "corpusCerByRunNfe": "pass (18/18)" }
  },
  "asr": { "model": "faster-whisper small", "language": "en" },   // copied from run info
  "officialVersion": "no_intro",
  "nfe": [4, 6, 8, 10, 12, 16, 20, 24, 32],
  "promptCount": 54,
  "runs": [
    {
      "id": "xvector_4090",
      "clips": 486, "rejectedClips": 0, "introClips": 0,
      "clipsAtLengthCap": 172, "maxDurationS": 12.8,
      "byNfe": [
        {
          "nfe": 4, "clips": 54, "rejectedClips": 0,
          "refWords": 1211, "refChars": 6679,
          "wer": { "no_intro": { "value": 0.2180, "errors": 264 }, "full": { … } },
          "cer": { "no_intro": { "value": 0.2026, "errors": 1353 }, "full": { … } }
        }
        // … one entry per NFE
      ]
    },
    { "id": "orig_3090", … }
  ]
}
```
Values are stored unrounded; formatting happens at render time. (The numbers in the example are illustrative of the shape only. The real ones come from the script.)

### Metrics: table vs chart
- **Chart = word error rate (intro removed) vs NFE**, one line per run. WER is the team's headline metric and the one the research question is about. One metric per chart keeps it readable.
- **Table = NFE · word error rate · character error rate · clips scored.** CER corroborates WER without the word-boundary noise, and clips scored shows the denominator (including the 4 silent clips in `orig_3090`). Everything is the official `no_intro` version.
- The as-recorded (`full`) WER appears only in the `orig_3090` note context, not as a column (open question 3).
- **Chart scale:** the y-axis starts at 0% (a truncated axis would exaggerate small differences) and runs to the next 20% above the maximum (0–120%). `xvector_4090` is the solid ink line; `orig_3090` is a dashed muted line labelled "setup issue, see note". At this scale `xvector_4090` looks nearly flat, which is honest: across NFE it only moves between 17.9% and 23.9%. The table carries the exact values.
- **X-axis:** linear in NFE (steps are a quantity, so spacing must reflect it), with a tick at each tested value.

### Wireframes

Desktop (1440; content inside the existing rails, 3/9 header grid):
```
│ ───────────────────────────────────────────────────────────────────────── │  section rule
│ (empty rail)   │ Word error rate across generation steps                   │  h2, no eyebrow
│                │ One line of plain intro. Lower is better.                 │
│                │                                                            │
│                │  120% ┤                                                    │
│                │       │   ╌╌╌╌orig_3090 (setup issue, see note)╌╌╌         │  SVG chart,
│                │   60% ┤                                                    │  cols 4–12
│                │       │ ──────────────────────────── xvector_4090          │
│                │    0% ┼──┬──┬──┬──┬──┬────┬────┬────┬───────┬            │
│                │        4  6  8  10 12   16   20   24      32             │
│                │        Generation steps (NFE)                              │
│                │                                                            │
│                │  xvector_4090 │ orig_3090        ← tab switcher (hairline, │
│                │  ──────────────                     underline marks active) │
│                │  Steps (NFE)   Word error rate   Char. error rate   Clips  │
│                │  4                     21.8%             20.3%        54   │  tabular, right-aligned
│                │  …  (9 rows, thin rules)                                   │
│                │  Note on orig_3090 (always visible, 1–2 sentences)         │
│                │  Method line: pooled errors ÷ reference words · Whisper    │
```
Mobile (390): everything stacks in one column. Chart full width (about 342 × 240px) with all NFE ticks (labels at 11px mono fit; 4 and 6 are about 24px apart). Tabs above the table. The table sits in its own `overflow-x-auto` container (4 columns fit at 390, but the container guarantees the body never scrolls sideways). Note and method line follow.

### Copy (sentence case; every number is rendered from the JSON, never typed)
- **Hero headline:** "How many generation steps does dots.tts need?"
- **Hero paragraph:** "WAT.ai's adaptive compute team measures how dots.tts speech quality changes with the number of generation steps (NFE). Fewer steps run faster; the question is what they cost in accuracy. Below are word and character error rates for {promptCount} prompts at {nfe.length} step counts, from {min} to {max}."
- **Hero kicker:** "Adaptive compute for TTS". **Status line:** "WAT.ai · Research preview" (drops "Placeholder data"). **CTA:** "See the results" → `#results`.
- **Results heading:** "Word error rate across generation steps"
- **Intro line:** "Errors in Whisper transcriptions of {promptCount} prompts per run, pooled across clips (total word errors ÷ total reference words). Lower is better."
- **Column headers:** "Generation steps (NFE)", "Word error rate", "Character error rate", "Clips scored". The table caption states "Lower is better" for both rates.
- **`orig_3090` note:** "orig_3090 doesn't measure the model fairly. Its reference audio didn't match its transcript, so the model first spoke an unrelated intro that used up the {capS} s clip limit in {clipsAtCap} of {clips} clips and cut the target sentences short. The intro is already removed from these scores; {rejected} silent clips count as fully wrong."
- **Method line (small, muted):** "Transcribed with {asr.model}; text normalized before scoring. Full method in wer_run_info.json." (Shown only if you want it. Open question 6.)

### Files
| Action | File |
|---|---|
| Create | `scripts/build-metrics.mjs`: Node, no dependencies; RFC 4180 CSV parser (the transcripts contain quoted commas); self-check against `wer_run_info.json`, exits non-zero on mismatch; prints a terminal table |
| Create | `data/metrics_summary.json` (generated) |
| Create | `lib/metrics.ts`: types for the JSON, typed import, formatting helpers (`pct1`) |
| Create | `components/results/ResultsSection.tsx`: server component composing the section |
| Create | `components/results/WerChart.tsx`: server component, pure SVG, no animation |
| Create | `components/results/ResultsTable.tsx`: `"use client"`, ARIA tabs (same pattern as `ArchitectureBreakdown`) and the table |
| Modify | `package.json`: add `"metrics": "node scripts/build-metrics.mjs"` (script only, no dependencies) |
| Modify | `app/page.tsx`: new section order |
| Modify | `components/home/Hero.tsx`: real copy from the JSON, drop `StepMask` |
| Modify | `components/SectionHeader.tsx`: make `label` optional (empty rail when omitted). The grid is unchanged |
| Modify | `docs/references.md`: add this round's Mobbin references |
| Modify (only if approved) | `lib/site.ts` (`ANNOUNCEMENT`, `MODEL_STATUS`, `CONTACT_EMAIL`), `app/layout.tsx` (`metadata.description`) |
| Delete | none (see unused files above) |

### Mobbin references (this round)
- **Contra Labs, "Best performing models":** https://mobbin.com/sites/sections/02d9a4e4-1ba1-43d3-a178-de39ac3d5713. Borrow: switcher sits directly above the data; boxless table with thin rules and right-aligned mono numbers; method link at the end. Skip: the boxed chart and model logos.
- **Zaro, line chart:** https://mobbin.com/sites/sections/c5d267e3-9260-4dbc-ab8b-f215cbe80909. Borrow: thin 1px lines, faint vertical guides at each x value, mono tick labels, no chart frame. Skip: curved interpolation (we draw straight segments between measured points) and the separate legend (we label lines directly).
- **Aqua, "Proven on industry benchmarks":** https://mobbin.com/sites/sections/2e54223a-941c-425e-8f0b-f756a93f52d8. Borrow: "Lower is better" stated in plain words right under the chart. Skip: the bar chart, the bordered box and the checklist.
- **Aside, benchmark list:** https://mobbin.com/sites/sections/4f0a6897-50b7-4b01-a168-b355fb8421e3. Borrow: switching runs in place without leaving the section. Skip: the pill-shaped segmented control (ours matches the site's existing hairline tab style).
- Considered and rejected: Manus and Base (data wrapped in rounded, shaded cards: the generic tell the brief rules out).

---

## 4. Self-review against the design guidance (what I changed)

1. **Pill segmented control → hairline tabs.** My first draft copied Aside's pill toggle; it reads as generic generated UI. Switched to the underline-on-hairline tab already used by the demo, so it's the site's own pattern.
2. **Legend → direct labels.** A legend box is a template default; labelling the line ends removes a lookup.
3. **Dropped the "Fig. 01" eyebrow and the chart frame.** The guidance bans eyebrow labels in data sections, and a frame would make it a card.
4. **Side-by-side run tables → tabs defaulting to `xvector_4090`.** Side by side invited direct comparison with a broken run; the tab plus the always-visible note keeps `orig_3090` honest without hiding it.
5. **Hero figure removed instead of replaced.** No real figure exists yet; an empty right column is better than a decorative one. The Proximal-style text-only hero is already in the reference set.
6. **Smoothing avoided.** Straight segments between measured NFE points only; no curve, no area fill, no trend line.
7. **"Remove one more thing" candidate:** the method line under the table. It's the first thing I'd cut, so it's an open question.

---

## 5. Risks and open questions

1. **Run names.** Readers won't know what `xvector_4090` / `orig_3090` mean. Give me plain names (e.g. what "xvector" and "orig" refer to). Until then the page shows the IDs in mono. I won't guess.
2. **Hero copy:** approve or edit the headline and paragraph above.
3. **As-recorded WER for `orig_3090`:** leave it out (my recommendation; the intro-removed score is official) or add it as an extra column in that tab?
4. **Chart scale:** one shared 0–120% axis (recommended, honest; `xvector_4090` looks nearly flat) vs. showing `orig_3090` in the table only (your task asks for both lines).
5. **Placeholders outside sections** (announcement bar, footer model line, page description, `CONTACT_EMAIL`, "Adaptive TTS" name): fix now (send real values), hide, or leave for later? `FeedbackBox` currently mails a fake address.
6. **Method line:** keep or cut?
7. **Unused component files:** delete `MetricsStrip`, `AdaptiveDemo`, `StepMask`, `ArchitectureBreakdown` now, or keep them?
8. **21st.dev:** not connected. Set it up (`npx @21st-dev/cli init --client claude --write`) to search for a table/chart pattern, or skip? This section is small and the site already has the primitives, so I'd skip it here.
9. **Determinism:** `generatedAt` changes on every run, so the JSON shows a diff each time. Fine for review; I can drop it if you prefer a stable file.
