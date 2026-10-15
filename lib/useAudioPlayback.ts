"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Only one clip plays at a time across the page. */
let active: HTMLAudioElement | null = null;

/**
 * Plays a real audio file and reports 0–1 progress, with the same shape as
 * useMockPlayback. `duration` (seconds, from the data) is used for seeking
 * before the file's metadata has loaded. Changing `src` while playing keeps
 * playing, from the start of the new clip.
 */
export function useAudioPlayback(src: string | undefined, duration: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  // A new clip starts at 0 (state reset during render, not in an effect).
  if (src !== prevSrc) {
    setPrevSrc(src);
    setProgress(0);
  }

  const play = useCallback((a: HTMLAudioElement) => {
    if (active && active !== a) active.pause();
    active = a;
    if (a.ended) a.currentTime = 0;
    a.play().catch(() => setPlaying(false));
  }, []);

  useEffect(() => {
    if (!src) return;
    const a = new Audio();
    a.preload = "none";
    a.src = src;
    audioRef.current = a;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setProgress(1);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    if (resumeRef.current) play(a);
    return () => {
      resumeRef.current = !a.paused;
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      if (active === a) active = null;
      audioRef.current = null;
    };
  }, [src, play]);

  // Follow the playhead while playing.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const a = audioRef.current;
      if (a) {
        const total = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : duration;
        setProgress(Math.min(1, a.currentTime / total));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) play(a);
    else a.pause();
  }, [play]);

  const seek = useCallback(
    (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      const a = audioRef.current;
      if (a) {
        const total = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : duration;
        a.currentTime = clamped * total;
      }
      setProgress(clamped);
    },
    [duration],
  );

  return { progress, playing, toggle, seek };
}
