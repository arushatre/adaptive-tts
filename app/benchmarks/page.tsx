import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { Findings } from "@/components/Findings";
import { MethodList } from "@/components/MethodList";
import { PageIntro } from "@/components/PageIntro";
import { Results } from "@/components/results/Results";
import { SectionHeader } from "@/components/SectionHeader";
import { METRICS, fmtInt } from "@/lib/metrics";

export const metadata: Metadata = { title: "Benchmarks" };

export default function BenchmarksPage() {
  return (
    <>
      <PageIntro
        label="Benchmarks · Evaluation"
        title="How dots.tts holds up across generation steps."
        badge={null}
      >
        Word and character error rates for all {fmtInt(METRICS.overall.clips)} clips in the step
        sweep, transcribed with Whisper {METRICS.asr.model}. Lower is better for both. Every number
        on this page is computed from the scored clips, and every finding opens into its data.
      </PageIntro>

      <section id="results" aria-labelledby="results-title" className="pb-24 lg:pb-36">
        <Container>
          <h2 id="results-title" className="meta mb-6 text-muted">
            Word error rate across generation steps
          </h2>
          <Results captionId="results-title" />
        </Container>
      </section>

      <section id="analysis" aria-labelledby="analysis-title" className="pb-24 lg:pb-36">
        <Container>
          <SectionHeader
            id="analysis-title"
            label="Analysis · 5 findings"
            title="What the numbers show, and what they don’t."
            aside="How much the step count matters, what the length limit does to the scores, which prompts are hardest, and why one run doesn’t count."
          />
          <div className="mt-12 lg:mt-16">
            <Findings />
          </div>
        </Container>
      </section>

      <section id="method" aria-labelledby="method-title" className="pb-24 lg:pb-36">
        <Container>
          <SectionHeader
            id="method-title"
            label="Method"
            title="Where every number comes from."
            aside="Shared by the results, the findings and the audio samples. If a figure on this site doesn’t trace back to one of these, it’s a bug."
          />
          <div className="mt-12 lg:mt-16">
            <MethodList />
          </div>
        </Container>
      </section>
    </>
  );
}
