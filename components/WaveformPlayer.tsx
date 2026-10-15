"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { formatTime } from "@/lib/speech";
import { useAudioPlayback } from "@/lib/useAudioPlayback";
import { useMockPlayback } from "@/lib/useMockPlayback";

type Controlled = {
  progress: number;
  playing: boolean;
  onToggle: () => void;
  onSeek?: (progress: number) => void;
};

type WaveformPlayerProps = {
  bars: number[];
  /** Seconds. */
  duration: number;
  /** Real audio file. Without it, playback is simulated over `duration`. */
  src?: string;
  /** Accessible name, e.g. "Adaptive schedule". */
  label: string;
  /** Mono metadata, e.g. ["Sample 01", "Full steps"]. */
  meta?: string[];
  /** "center" draws a waveform; "bottom" draws a per-frame bar chart. */
  align?: "center" | "bottom";
  /** Dashed line at full height, e.g. the fixed step budget. */
  ceiling?: boolean;
  /** Hover readout for one bar, e.g. "Frame 041 · 14 steps · delayed". */
  describe?: (index: number) => string;
  className?: string;
} & (Controlled | Partial<Record<keyof Controlled, undefined>>);

const BAR_PITCH = 4; // viewBox units per bar
const HEIGHT = 40;
const CEILING_GAP = 2; // keeps full-height bars just under the ceiling line

/**
 * Signature element: play button, symmetric bar waveform, mono metadata.
 * Inherits text color, so it works on the light canvas and the dark band.
 * Uncontrolled by default; pass progress/playing/onToggle to drive it.
 */
export function WaveformPlayer(props: WaveformPlayerProps) {
  const {
    bars,
    src,
    duration,
    label,
    meta,
    align = "center",
    ceiling = false,
    describe,
    className = "",
  } = props;
  const [hover, setHover] = useState<number | null>(null);
  const mock = useMockPlayback(duration);
  const audio = useAudioPlayback(src, duration);
  const internal = src ? audio : mock;
  const progress = props.progress ?? internal.progress;
  const playing = props.playing ?? internal.playing;
  const onToggle = props.onToggle ?? internal.toggle;
  const onSeek = props.onSeek ?? (props.progress === undefined ? internal.seek : undefined);
  const reduceMotion = useReducedMotion();

  const playedBars = progress * bars.length;

  const onPointerMove = describe
    ? (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        setHover(Math.min(bars.length - 1, Math.max(0, Math.floor(x * bars.length))));
      }
    : undefined;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="meta flex items-baseline justify-between gap-4 opacity-70">
        <span className="min-w-0 truncate">
          {hover !== null && describe ? (
            <span className="text-current">{describe(hover)}</span>
          ) : (
            meta?.join(" · ")
          )}
        </span>
        <span className="shrink-0 tabular-nums">
          {formatTime(progress * duration)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${playing ? "Pause" : "Play"} ${label}`}
          className="grid size-11 shrink-0 place-items-center rounded-[6px] border border-current/30 transition-[border-color,background-color,transform] duration-300 ease-out-soft hover:border-current hover:bg-current/[0.06] active:scale-95"
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>

        <div
          className="relative h-12 flex-1 rounded-[2px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-current"
          onPointerMove={onPointerMove}
          onPointerLeave={describe ? () => setHover(null) : undefined}
        >
          <svg
            viewBox={`0 0 ${bars.length * BAR_PITCH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="size-full"
            aria-hidden="true"
          >
            {bars.map((h, i) => {
              const height =
                align === "bottom"
                  ? Math.max(1, h * (HEIGHT - CEILING_GAP))
                  : Math.max(1, h * HEIGHT);
              const y = align === "bottom" ? HEIGHT - height : (HEIGHT - height) / 2;
              return (
                <motion.rect
                  key={i}
                  x={i * BAR_PITCH + 1}
                  width={BAR_PITCH / 2}
                  fill="currentColor"
                  initial={false}
                  animate={{ height, y }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.003 }
                  }
                  opacity={
                    hover === i
                      ? 1
                      : (i < playedBars ? 1 : 0.3) * (h < 0.1 ? 0.5 : 1)
                  }
                />
              );
            })}
            {ceiling ? (
              <line
                x1={0}
                x2={bars.length * BAR_PITCH}
                y1={1}
                y2={1}
                stroke="currentColor"
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {hover !== null ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1 -bottom-1 w-px bg-current/50"
              style={{ left: `${((hover + 0.5) / bars.length) * 100}%` }}
            />
          ) : null}
          {onSeek ? (
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(progress * 1000)}
              onChange={(e) => onSeek(Number(e.target.value) / 1000)}
              aria-label={`Seek ${label}`}
              aria-valuetext={`${formatTime(progress * duration)} of ${formatTime(duration)}`}
              className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <path d="M1 1.2v11.6L11 7z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <path d="M1.5 1h3v12h-3zM7.5 1h3v12h-3z" fill="currentColor" />
    </svg>
  );
}
