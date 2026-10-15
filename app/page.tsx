import Link from "next/link";
import { ArrowLink } from "@/components/ArrowLink";
import { Container } from "@/components/Container";
import { Findings } from "@/components/Findings";
import { AdaptiveDemo } from "@/components/home/AdaptiveDemo";
import { FeedbackBox } from "@/components/home/FeedbackBox";
import { Hero } from "@/components/home/Hero";
import { MetricsStrip } from "@/components/home/MetricsStrip";
import { ResearchIndex } from "@/components/ResearchIndex";
import { Results } from "@/components/results/Results";
import { Section } from "@/components/Section";
import { SectionHeader } from "@/components/SectionHeader";
import { METRICS } from "@/lib/metrics";

// Light and dark bands alternate: the demo is the dark one.
export default function Home() {
  return (
    <>
      <Hero />
      <MetricsStrip />
      <AdaptiveDemo index={1} />

      <Section id="results" aria-labelledby="results-title">
        <Container>
          <SectionHeader
            id="results-title"
            reveal={false}
            title="Word error rate across generation steps."
            aside={`${METRICS.promptCount} prompts at every step count, scored with Whisper. Lower is better.`}
          />
          <div className="mt-12 lg:mt-16">
            <Results captionId="results-title" />
          </div>
          <div className="mt-8 flex justify-end">
            <Link
              href="/benchmarks#method"
              className="border-b border-current/25 pb-0.5 transition-colors duration-200 hover:border-current"
            >
              How these are measured
            </Link>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="analysis-title">
        <Container>
          <SectionHeader
            id="analysis-title"
            index={2}
            label="Analysis · 5 findings"
            title="What the numbers show, and what they don’t."
            aside="What changes with the step count, and what doesn’t."
          />
          <div className="mt-12 lg:mt-16">
            <Findings />
          </div>
          <div className="mt-8 flex justify-end">
            <ArrowLink href="/benchmarks#analysis">All findings and method notes</ArrowLink>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="research-title">
        <Container>
          <SectionHeader
            id="research-title"
            index={3}
            label="Research · Writing"
            title="Notes from the lab."
          />
          <div className="mt-12 lg:mt-16">
            <ResearchIndex />
          </div>
        </Container>
      </Section>

      <FeedbackBox index={4} />
    </>
  );
}
