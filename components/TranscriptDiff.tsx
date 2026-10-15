import type { AlignOp } from "@/lib/metrics";

type Chunk =
  | { kind: "ok"; words: string[] }
  | { kind: "err"; ref: string[]; hyp: string[] };

/** Groups runs of errors so "valladolid → vaya dalid" reads as one change. */
function chunk(ops: AlignOp[]): Chunk[] {
  const out: Chunk[] = [];
  for (const o of ops) {
    const last = out[out.length - 1];
    if (o.op === "ok") {
      if (last?.kind === "ok") last.words.push(o.ref);
      else out.push({ kind: "ok", words: [o.ref] });
      continue;
    }
    const ref = o.op === "ins" ? [] : [o.ref];
    const hyp = o.op === "del" ? [] : [o.hyp];
    if (last?.kind === "err") {
      last.ref.push(...ref);
      last.hyp.push(...hyp);
    } else {
      out.push({ kind: "err", ref, hyp });
    }
  }
  return out;
}

/**
 * Two aligned lines: what the prompt says and what Whisper heard, both as
 * scored (normalized). Changed words are underlined in both lines; words the
 * transcript is missing are struck through. Inherits text color.
 */
export function TranscriptDiff({
  ops,
  tone = "paper",
  className = "",
}: {
  ops: AlignOp[];
  tone?: "paper" | "night";
  className?: string;
}) {
  const chunks = chunk(ops);
  const mark =
    tone === "night"
      ? "underline decoration-night-accent decoration-2 underline-offset-[0.22em]"
      : "underline decoration-accent-strong decoration-2 underline-offset-[0.22em]";
  const changes = chunks.filter((c) => c.kind === "err");

  return (
    <dl className={`grid gap-x-6 gap-y-3 sm:grid-cols-[8.5rem_1fr] ${className}`}>
      <dt className="meta pt-1 opacity-70">Prompt</dt>
      <dd className="text-[1.0625rem] leading-relaxed">
        {chunks.map((c, i) =>
          c.kind === "ok" ? (
            <span key={i}>{c.words.join(" ")} </span>
          ) : c.ref.length ? (
            <span key={i}>
              <span className={mark}>{c.ref.join(" ")}</span>{" "}
            </span>
          ) : null,
        )}
      </dd>
      <dt className="meta pt-1 opacity-70">Whisper heard</dt>
      <dd className="text-[1.0625rem] leading-relaxed">
        {chunks.map((c, i) =>
          c.kind === "ok" ? (
            <span key={i}>{c.words.join(" ")} </span>
          ) : (
            <span key={i}>
              {c.hyp.length ? (
                <span className={mark}>{c.hyp.join(" ")}</span>
              ) : (
                <s className="opacity-50">{c.ref.join(" ")}</s>
              )}{" "}
            </span>
          ),
        )}
      </dd>
      <dt className="sr-only">Changes</dt>
      <dd className="meta opacity-70 sm:col-start-2">
        {changes.length === 0
          ? "Every word matches"
          : changes
              .map((c) =>
                c.hyp.length === 0
                  ? `“${c.ref.join(" ")}” missing`
                  : c.ref.length === 0
                    ? `“${c.hyp.join(" ")}” added`
                    : `“${c.ref.join(" ")}” → “${c.hyp.join(" ")}”`,
              )
              .join(" · ")}
      </dd>
    </dl>
  );
}
