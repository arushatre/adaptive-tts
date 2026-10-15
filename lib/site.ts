import { METRICS } from "./metrics";

export const NAV_LINKS = [
  { href: "/listen", label: "Listen" },
  { href: "/research", label: "Research" },
  {
    href: "/benchmarks",
    label: "Benchmarks",
    children: [
      { href: "/benchmarks#results", label: "Results", meta: `WER & CER · ${METRICS.nfe.length} step counts` },
      { href: "/benchmarks#analysis", label: "Analysis", meta: "Findings, each with its data" },
      { href: "/benchmarks#method", label: "Method", meta: "How every number is measured" },
    ],
  },
  { href: "/about", label: "About us" },
] as const;

export const CONTACT_EMAIL = "hello@adaptive-tts.example";

export const MODEL_STATUS = {
  model: "adaptive-tts v0.3",
  lastEval: "Sep 28, 2026",
};

/** Announcement bar above the nav. Points at the newest post. */
export const ANNOUNCEMENT = {
  label: "New note",
  text: "From fewer steps to faster wall-clock",
  href: "/research",
};
