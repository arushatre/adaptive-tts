@AGENTS.md

# CLAUDE.md: dots.tts adaptive compute site

Public site for a **WAT.ai** student research team studying **adaptive compute scheduling for dots.tts**, a text-to-speech model. The research question: how does output quality change with **NFE** (number of function evaluations, i.e. generation steps)? Fewer steps is faster, but quality may drop. Team code: GitHub org `Adaptive-Compute-For-TTS`. Deployed on Vercel.

The site is **evidence-first**: real benchmarks and data are the visual content. Anything without real content behind it gets cut, not decorated.

You are working as a senior engineer with strong UI/UX judgment: plan before building, keep diffs small and reviewable, never invent data, treat restraint as a design skill.

---

## Non-negotiable rules

1. **Git:** never run `git add`, `git commit`, `git push`, or stage anything unless the user explicitly asks in chat for that specific action. The user reviews and pushes. Never add `Co-Authored-By`, "Generated with", or any Claude/Anthropic attribution to commits or PR text.
2. **Dependencies:** never install a package without asking first. Nothing for charts is installed; draw charts as hand-built SVG unless the user approves a library.
3. **Data honesty:** never invent, estimate, round-trip-by-hand or hardcode a number. Every number on the site comes from a generated data file (see Data). If a number isn't in the data, it doesn't go on the page.
4. **Checkpoints:** when a task has STOP markers or asks for a plan, stop there and wait for the user. Plan first for anything non-trivial: list every file you'll create, change or delete, and any new dependency.
5. **Don't redesign:** extend the existing tokens and primitives below. No new colors, fonts or radii without approval.
6. **Don't touch the user's data files** in `data/raw/` (no renaming, editing or deleting). Read them; write derived files elsewhere.
7. **Placeholder content is a bug.** Much of the current site is placeholder (see Content status). When you touch a section, check whether its content is real; flag anything that isn't instead of polishing it.

---

## Stack and repo map

- Next.js **16** (App Router, TypeScript, all routes static), React 19, Tailwind CSS **v4** (no `tailwind.config`; tokens live in `app/globals.css` under `@theme`), `motion` for animation. **No shadcn/ui, no chart or table library.**
- Next 16 has breaking changes vs. older versions: read `node_modules/next/dist/docs/` before using an API you're unsure of (see AGENTS.md).
- `app/` routes: `/` (`page.tsx`), `/listen`, `/research`, `/benchmarks`, `/about`. Shared shell in `app/layout.tsx` (Nav, Footer, `GridRails`, `Providers` with `MotionConfig reducedMotion="user"`).
- `components/`: layout primitives (`Section`, `Container`, `SectionHeader`, `Kicker`, `MetaLabel`, `GridRails`), links (`ArrowLink`, `PrimaryLink` in `ArrowLink.tsx`), `Disclosure`/`Collapse`/`PlusMinus`, `Reveal`, `WaveformPlayer`, and content components (`Leaderboard`, `Findings`, `Pipeline`, `MethodList`, `ResearchIndex`, `SampleList`, `TeamGrid`).
- `components/home/`: homepage sections (`Hero`, `MetricsStrip`, `AdaptiveDemo`, `StepMask`, `ArchitectureBreakdown`, `FeedbackBox`).
- `lib/content.ts`, `lib/site.ts`: copy and **placeholder** data. `lib/speech.ts`, `lib/useMockPlayback.ts`: mock audio model (no real audio).
- `data/raw/`: the team's real benchmark data (read-only). `@/*` path alias and `resolveJsonModule` are enabled, so typed JSON imports work.
- Several components are shared across routes (`Leaderboard`, `Findings` → `/benchmarks`; `Pipeline` → `/about`). Before deleting a component, grep for every import.

---

## Data

### Files (`data/raw/`, read-only)
| File | Contents |
|---|---|
| `clips_arush.csv` | **Scored** clips: 972 rows = 2 runs × 54 prompts × 9 NFE values. 38 columns. |
| `wer_run_info.json` | How WER/CER were computed (faster-whisper `small`, int8, beam 5, temp 0, English; Whisper EnglishTextNormalizer + custom rules; jiwer 4.0.0) and **reference aggregates** to check against. |

- Runs: `orig_3090`, `xvector_4090`. NFE values: 4, 6, 8, 10, 12, 16, 20, 24, 32.
- Grouping columns: `run_id`, `nfe`, `prompt_id`, `length` (short/medium/long), `content` (plain, numbers, names_rare_words, acronyms_abbreviations, prosody, phonetic).
- Headline-metric inputs: `subs_{v}`, `dels_{v}`, `ins_{v}`, `ref_words`, `cer_{v}`, `ref_norm`, where `{v}` is `no_intro` or `full`. Also `heard_errors`, `heard_ref_words`, `wer_heard`.
- Detail/debug only (never headline): `transcript`, `hyp_norm`, `intro_text`, `trailing_dels_*`, `missing_end_words*`, `duration_s`, `asr_status`, `file`, `repo_path`, `text`, and the per-clip `wer`, `cer`, `wer_uncapped`, `cer_uncapped`.
- No speaker-similarity (SIM) or latency column exists. If one is added later, confirm with the user before showing it.

### Metric definitions (verified to reproduce `wer_run_info.json` exactly)
- **Group WER is corpus WER**: `Σ(subs_v + dels_v + ins_v) / Σ ref_words` over the clips in the group. It is **not** the mean of per-clip WER.
- **Group CER is corpus CER**: `Σ(cer_v × len(ref_norm)) / Σ len(ref_norm)`, using the uncapped per-clip `cer_full` / `cer_no_intro` (reference length counts spaces).
- **Do not aggregate the plain `wer` / `cer` columns.** They are capped at 1.0 per clip and give wrong group numbers.
- **Official version is `no_intro`**; `full` counts the accidental intro phrase as inserted words. For `xvector_4090` the two are identical (no intro).
- Corpus WER can exceed 100% (insertions). Show it as computed; don't clamp.
- Any script that aggregates this data must check itself against `wer_run_info.json`: `corpus_cer["run_id x nfe"]` (both versions, all 18 groups) and `corpus_wer` (both versions) must match to 4 decimals, or the script exits non-zero.
- Display: WER/CER as a percentage with one decimal; tabular figures; numeric columns right-aligned; state the direction ("lower is better").

### Known data issues
- **`orig_3090` is not a fair measurement of the model.** Its reference audio didn't match its transcript, so the model spoke an unintended intro phrase ("Hey, Adam here…") that used up the ~9.12 s clip cap and cut most target sentences off. Even with the intro removed (`no_intro`), its WER stays around 90–109% because the sentence endings are missing. Never show `orig_3090` numbers without a short plain-language note, and don't put it on the same chart scale as `xvector_4090` without the user's approval.
- **4 clips were rejected as silent** (`asr_status` ≠ `ok`, all in `orig_3090`). Per the run info they stay in the data scored as WER = CER = 1.0 with every word a deletion. Keep them; mention them where clip counts appear.
- `xvector_4090` is **not monotonic** in NFE (e.g. NFE 20 is worse than 12). Show the data as is; never smooth, interpolate or imply a trend the data doesn't have.

### Pipeline
Raw CSV → a checked build script in `scripts/` → generated JSON in `data/` (e.g. `data/metrics_summary.json`) → typed import in components. Components read only the generated JSON, never `data/raw/` and never literals.

---

## Content status (as of Oct 2026)

Placeholder unless replaced with real data:
- Homepage `Hero` copy and status line, `MetricsStrip`, `AdaptiveDemo`/`StepMask`, the Leaderboard section, `ArchitectureBreakdown`, `Findings`, `ResearchIndex`. All are driven by made-up constants (`STEP_BUDGET`, `PREDICTOR`, `LEADERBOARD`, `METRICS`, `POSTS`, etc. in `lib/content.ts`).
- `lib/site.ts`: `ANNOUNCEMENT` (nav bar), `MODEL_STATUS` (footer), `CONTACT_EMAIL` (`hello@adaptive-tts.example` is not a real inbox, so `FeedbackBox` mailtos go nowhere).
- `metadata.description` in `app/layout.tsx`; the "Adaptive TTS" wordmark/name (the real project is WAT.ai / dots.tts; confirm naming with the user).
- `/about` team photos and bios (labelled as placeholders on the page).

Real: the benchmark data in `data/raw/`.

---

## Design system (as implemented)

Direction: an editorial research-lab site (reference points: andonlabs.com, proximal.ai), with structural hairline grid lines and high-contrast sections. Take the vibe, never copy either site.

**Color tokens** (`app/globals.css`; use the Tailwind names, never raw hex):
- Light canvas: `paper` #e7e4dc · `ink` #15181b · `muted` #565c61 · `rule` #cdc8bd · `paper-hover` · `sunk` (open panels).
- Accent (the only one): `accent` #d2cab9 (bone) and `accent-strong` #8c826f. Reserved for **primary CTAs, active indicators and key data points**. Nowhere else.
- Dark bands: `night` #111214 · `night-raised` · `night-ink` · `night-muted` · `night-rule` · `night-mark` · `night-accent`.
- `grid` / `grid-faint`: neutral hairlines for rails and textures.

**Type:** Geist (sans) and Geist Mono. Scale tokens: `text-hero` (44→96px, -0.05em), `text-h2` (36→52px, -0.04em), `text-lede`, `text-body` (18px), `text-meta` (12px mono uppercase +0.1em, via the `meta` utility). Display headings use `font-medium`; row titles use `font-normal`. Tables and figures use `tabular-nums`.

**Spacing and layout:** `Container` (max 82rem with the `gutter` utility, 24/48/64px). `section-y` = 96px → 128px at lg. Sections are full-width with a 1px top rule (`Section`, `tone="paper" | "night"`) and registration marks where rules cross the `GridRails`. Headers use a 3/9 asymmetric split (`SectionHeader`: kicker rail left, title and aside right). Prose measure `max-w-measure` (42rem).

**Surfaces:** radius 0–6px, 1px borders, no shadows, no nested cards, no gradients/glass. Background shifts (paper ↔ night) only mark major sections. Textures: `texture-grid` (hero), `texture-dots` (night bands).

**Interaction:** hover = hairline/border highlight or `paper-hover` fill, `transition-colors duration-200`; selected/active = accent. Motion is restrained and must respect `prefers-reduced-motion` (`MotionConfig` handles Motion; CSS transitions are disabled globally under reduce). Every interactive element needs a visible focus state (global `:focus-visible` outline). Tabs follow the ARIA pattern in `ArchitectureBreakdown` (roving tabindex, arrow/Home/End).

**Data sections** (results, tables, charts): the data is the hero.
- Real `<table>` with `<caption>` and `th scope`. On mobile the table scrolls inside its own `overflow-x-auto` container; the page body never scrolls sideways.
- Charts: SVG, plain-language axis labels with real tick values, direct line labels where they fit, `role="img"` with a summarizing `aria-label`, and the table as the data alternative. No entrance animation.
- In data sections, skip the site's decorative habits: no kicker eyebrow above the heading, no `→` appended to links, no fade-up reveal, no cards around the table.
- Copy: plain sentence case that says exactly what the reader sees. Reader-facing names ("Generation steps (NFE)", "Word error rate"), never column names.

**Don't (anywhere):** gradient blobs, glassmorphism, glowing 3D waves, default 3-column feature cards, badges everywhere, animating every section, AI-generated imagery. Litmus test: remove shadows, gradients, icons and animation; if the page falls apart, the composition is weak. Before finishing any UI task, remove one more thing that isn't pulling its weight.

---

## Verification (every change)

```bash
npx tsc --noEmit
npm run lint
npm run build      # must pass with zero errors and warnings
npm run dev        # http://localhost:3000 (the user often already has it running; reuse it)
```

- Render in the browser pane at **1440, 1024, 768 and 390px**. Check hierarchy, line length, overflow (`scrollWidth === clientWidth`), cramped spacing and readable numbers. Fix, then re-check; iterate at least twice.
- Screenshots in a hidden browser pane can catch animations mid-flight (rAF pauses). Confirm against the DOM before calling something broken.
- Spot-check numbers on the page against the generated JSON and the build script's terminal output.
- Final report: every file created, changed or deleted, what was verified, and anything uncertain.

---

## Tools and UI workflow

The site's outline is fixed: nav, footer, section structure, tokens, type and primitives stay as they are, and new work slots into that frame. For any new section or component, research comes before code, in this order:

1. **Mobbin MCP (required).** 2–3 searches by visual job (`search_sections` for web sections, `search_screens` for app-like UI), e.g. "minimal results table with tabular numbers", not "modern" or "clean". Pick 1–2 references and note what to borrow (structure, spacing, interaction) and what to skip. Borrow structure, never a brand's look. Cite each `mobbin_url` in your plan and in `docs/references.md`.
2. **21st.dev (optional; not installed, ask first).** A component quarry, not an art director. Show 3–5 candidates, take only the interaction, restyle to tokens and cut about 30% of the decoration. An installed component never brings its own colors, radii, shadows or fonts.
3. **Design pass.** Apply the design system and data-section rules above, then render, critique and subtract (see Verification).
