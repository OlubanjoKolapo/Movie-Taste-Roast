import { useId } from "react";
import { useCountUp, useInView, useReducedMotion } from "../lib/hooks";
import { cx } from "./ui";

/** Match ring: 5px stroke on a white/8 track, amber gradient, fills from empty over 1.4s. */
export function ScoreRing({
  value,
  size = 168,
  savage = false,
  label = "Taste score",
  max = 100,
}: {
  value: number;
  size?: number;
  savage?: boolean;
  label?: string;
  max?: number;
}) {
  const id = useId();
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  const reduced = useReducedMotion();
  const shown = useCountUp(value, inView);
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = inView || reduced ? c * (1 - value / max) : c;
  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value} out of ${max}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={savage ? "#fb7185" : "#fcd34d"} />
            <stop offset="100%" stopColor={savage ? "#fbbf24" : "#f59e0b"} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cx(
            "leading-none font-black tracking-[-0.04em] tabular-nums",
            savage ? "bg-[linear-gradient(120deg,#fb7185,#fbbf24)] bg-clip-text text-transparent" : "text-white",
          )}
          style={{ fontSize: size * 0.34 }}
        >
          {shown}
        </span>
        <span className="mt-1 text-[12px] font-semibold text-zinc-500 tabular-nums">/{max}</span>
      </div>
    </div>
  );
}

/** Single criterion bar: 8px, amber gradient, fills from zero with a stagger. */
export function ScoreBar({ value, delay = 0, run }: { value: number; delay?: number; run: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#fcd34d)]"
        style={{
          width: run ? `${value}%` : "0%",
          transition: `width 1.1s cubic-bezier(.16,1,.3,1) ${delay}ms`,
        }}
      />
    </div>
  );
}
