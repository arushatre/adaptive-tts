"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment } from "react";
import { ArrowLink, PrimaryLink } from "../ArrowLink";
import { Container } from "../Container";
import { Kicker } from "../Kicker";
import { MetaLabel } from "../MetaLabel";
import {
  CLEAN_FIRST,
  CLEAN_LAST,
  METRICS,
  NFE_MAX,
  NFE_MIN,
  pct1,
  werOf,
} from "@/lib/metrics";
import { StepTable } from "./StepTable";

const HEADLINE = "Fewer steps, same result. We proved it.";
const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const words = HEADLINE.split(" ");
  // Reduced motion: render the final state immediately.
  const speed = useReducedMotion() ? 0 : 1;
  const after = (0.1 + words.length * 0.055) * speed;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate pt-16 pb-24 md:pt-24 lg:pt-28 lg:pb-32"
    >
      {/* Hairline grid texture, fading out toward the content below. */}
      <div
        aria-hidden="true"
        className="texture-grid pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_20%,transparent_65%)]"
      />
      <Container>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <Kicker index={0}>Adaptive compute for dots.tts</Kicker>
          <MetaLabel className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 animate-pulse-dot rounded-full bg-accent-strong"
            />
            WAT.ai · Research preview
          </MetaLabel>
        </div>

        <h1
          id="hero-title"
          className="mt-8 max-w-[12.5em] text-hero font-medium text-balance"
        >
          {words.map((word, i) => (
            <Fragment key={i}>
              {/* Each word rises out of its own mask. */}
              <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  className="inline-block"
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9 * speed, delay: (0.1 + i * 0.055) * speed, ease }}
                >
                  {word}
                </motion.span>
              </span>
              {i < words.length - 1 ? " " : ""}
            </Fragment>
          ))}
        </h1>

        <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-12">
          <motion.div
            className="flex flex-col items-start gap-10 lg:col-span-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 * speed, delay: after, ease }}
          >
            <p className="max-w-measure text-body md:text-xl md:leading-[1.5]">
              We ran dots.tts on {METRICS.promptCount} prompts at{" "}
              {METRICS.nfe.length} step counts. On prompts that fit the length limit,
              word error rate was {pct1(werOf(CLEAN_FIRST))} at {NFE_MIN} steps and{" "}
              {pct1(werOf(CLEAN_LAST))} at {NFE_MAX}.
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
              <PrimaryLink href="#demo">Hear the clips</PrimaryLink>
              <ArrowLink href="#results">See the results</ArrowLink>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-6 lg:col-start-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 * speed, delay: after * 0.6, ease }}
          >
            <StepTable />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
