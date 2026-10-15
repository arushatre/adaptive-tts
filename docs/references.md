# References

Pulled from Mobbin on 2026-10-02. These are for layout and pattern only. Nothing here is a visual target. Everything is rebuilt with our tokens (see `CLAUDE.md`).

## Minimal editorial hero

**SSENSE: editorial feature hero** · https://mobbin.com/sites/sections/4de98a06-dbff-4e54-83c6-a301c519bba0
- Layout: a single oversized headline at regular weight, then one short standfirst, then one small CTA. No image.
- Hierarchy: the headline does all the work, and the CTA is deliberately tiny.
- Borrow: the "headline, one line of prose, one quiet link" rhythm. Skip: the all-caps headline, centered alignment and serif standfirst. We left-align in sentence case.

**Retool: "State of engineering time" report** · https://mobbin.com/sites/sections/4e8c7583-5be1-4673-89c5-417432ec6784
- Layout: the headline sits above two narrow prose columns at roughly 45ch.
- Borrow: the narrow prose measure under a wide headline. Skip: the colored canvas and decorative dial.

## Audio / TTS demo

**ElevenLabs: TTS API demo card** · https://mobbin.com/sites/sections/81b76dd7-5da7-4ac6-9292-c87381d07dc0
- Layout: an intro row (headline left, paragraph right) above a large framed demo region, with the text sample in the center and controls along the bottom edge.
- Borrow: the demo as its own framed band directly under the intro, with the sentence as the primary object and controls attached below it.
- Skip: rounded nested cards, pill tabs, flags and avatars. We flatten to one dark section with thin rules.

**ElevenLabs: voice list + text panel** · https://mobbin.com/sites/sections/495e17c2-16b4-4441-99a7-ff12b562e1b6
- Layout: a two-pane demo with selectable options (voices) on the left and text with a play control on the right.
- Borrow: the option list pattern, where each option shows a name and a one-line descriptor. This maps to our schedule toggles (`ADAPTIVE · steps predicted per frame`).

## Leaderboard / comparison table

**Contra Labs: "Best performing models"** · https://mobbin.com/sites/sections/02d9a4e4-1ba1-43d3-a178-de39ac3d5713
- Layout: an uppercase mono section label over a rule, a one-paragraph method note, and rank rows with thin dividers and right-aligned mono scores. A "Methods & standards →" link closes it.
- Borrow: almost the whole structure. No box around the table, rank in muted mono, score right-aligned, and a method note plus link under it. This is the closest match to our "numbers are part of the brand" rule.
- Skip: the bar chart and model logos.

**Mistral: model pricing table** · https://mobbin.com/sites/sections/ce1133d7-b1b2-4c31-ba77-389595ba042d
- Borrow: the idea of a whole-row tinted highlight. We use it on exactly one row (the top model) with our accent. Skip: zebra striping.

## Research / blog index

**OpenAI: Index** · https://mobbin.com/sites/sections/1e4d6891-db02-4b62-8ae8-8addb56aa87e
- Layout: a big page title, a year in the left column, and entries in the right column (title, then date and category in muted text). Lots of empty space.
- Borrow: the asymmetric two-column row, with metadata on the left and title/summary on the right. That gives the rows a consistent left rail.

**Wellfound: "From the blog" rows** · https://mobbin.com/sites/sections/d0e43e21-88cf-4864-8483-e96bd9dda641
- Layout: full-width rows of category, title, summary and arrow, with the arrow at the far right.
- Borrow: the full row as the hit target with the arrow at the row end. Skip: the colored circular arrow buttons. Ours is a text arrow that shifts on hover.

## Summary of what we take
1. Left-aligned, regular-weight oversized headline with narrow prose and a single text link (SSENSE, Retool).
2. The demo as one framed band, with the sentence as the hero object and options as labelled rows (ElevenLabs, flattened).
3. A boxless table with mono numbers, a muted rank, one highlighted row and a method note (Contra, Mistral).
4. Index rows with a mono metadata rail on the left and content on the right, where the whole row links (OpenAI, Wellfound).

## Round 2: detail and disclosure (2026-10-04)

**Superhuman: plan comparison accordion** · https://mobbin.com/sites/sections/3604d03f-77d9-4de5-adb4-96524850e7fe
- Borrow: a table row that expands in place into a panel of sub-rows, with only a thin chevron as the control. This became the expandable leaderboard rows.

**Lightship: "All specifications" accordion** · https://mobbin.com/sites/sections/e86b17db-e10c-4ecf-af91-d1e36eff40c3
- Borrow: plain ruled rows with a `+` at the far right and a quiet tinted panel when open. Used for the findings and the method notes.

**IntegratedBio: publications list** · https://mobbin.com/sites/sections/593eb726-d6e4-4872-a1d5-51fb4d4a9893
- Borrow: mono dates beside titles, with the row as the hit target. Skip: the green arrow buttons. Ours is a fill that sweeps in behind the row.

**Andon Labs (site, not Mobbin)**: announcement bar above the nav, nav dropdowns, an "evaluated on" credibility strip, "Join the Lab" with open roles. We took the structure and kept our tokens.

## Round 3: real clips and results (2026-10-15)

**Aqua: "Whisper hallucinates" transcript comparison** · https://mobbin.com/sites/sections/63ca4a59-9c14-4a29-82f1-79509365ccfa
- Borrow: labelled rows (source on the left, sentence on the right) with only the changed words marked inline. Used for the "Prompt / Whisper heard" diff under every clip.
- Skip: the green/red highlight pills. We underline changed words in the single accent and strike missing ones.

**Telepathic Instruments: sound sampler rows** · https://mobbin.com/sites/sections/a42431a9-054a-4390-818e-8e9e71d0e876
- Borrow: numbered, ruled rows each with its own play control. Used for the nine step-count rows on /listen.
- Skip: the dark textured background and neon CTA.
