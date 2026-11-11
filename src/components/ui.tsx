import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { resize } from "../data/catalogue";
import { linkProps } from "../lib/router";
import type { Title } from "../lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- buttons ---------- */

type Variant = "primary" | "soft" | "outline" | "quiet";
type Size = "sm" | "md" | "lg" | "xl";
const VARIANT: Record<Variant, string> = {
  primary: "bg-amber-400 text-zinc-950 shadow-sm hover:bg-amber-300",
  soft: "bg-white/[0.11] text-zinc-100 hover:bg-white/[0.17]",
  outline: "border border-amber-400/35 bg-white/[0.035] text-amber-300 hover:border-white/25 hover:bg-white/[0.07]",
  quiet: "text-zinc-400 hover:text-white",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-[15px]",
  xl: "h-14 px-8 text-[16px]",
};
export const btn = (variant: Variant = "primary", size: Size = "md", extra = "") =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-[11px] font-semibold transition-colors duration-200 ease-expo disabled:opacity-50 select-none whitespace-nowrap",
    VARIANT[variant],
    variant !== "quiet" && SIZE[size],
    variant === "quiet" && "h-10 px-2 text-[14px]",
    extra,
  );

export function LinkButton({ to, variant, size, className, children }: { to: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  const external = /^https?:/.test(to);
  return (
    <a
      className={btn(variant, size, className)}
      {...(external ? { href: to, target: "_blank", rel: "noopener" } : linkProps(to))}
    >
      {children}
    </a>
  );
}

export const iconBtn = "inline-flex size-10 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white";

/* ---------- brand ---------- */

export function Wordmark({ size = 17, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={cx("font-extrabold tracking-[-0.02em] text-white", className)} style={{ fontSize: size }}>
      movieroast<span className="text-amber-400">.</span>
    </span>
  );
}

export function MovieTonightMark({ className = "" }: { className?: string }) {
  return (
    <span className={cx("font-extrabold text-white", className)}>
      movietonight<span className="text-amber-400">.</span>
    </span>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[12px] leading-none font-extrabold tracking-[0.18em] text-amber-400 uppercase", className)}>{children}</p>;
}

export function Mascot(props: { size?: number; state?: "idle" | "thinking" | "answering"; heat?: string; follow?: boolean; className?: string }) {
  const { size = 96, className, ...rest } = props;
  return <mt-concierge size={size} className={className} {...rest} aria-hidden="true" />;
}

/* ---------- segmented toggle & tabs ---------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full font-semibold transition-colors duration-200",
            size === "sm" ? "h-8 px-3.5 text-[12px]" : "h-10 px-5 text-[14px]",
            value === o.value ? "bg-amber-400 text-zinc-950" : "text-zinc-400 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange, label }: { value: T; tabs: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar flex gap-6 overflow-x-auto border-b border-white/[0.08]">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "-mb-px h-11 shrink-0 border-b-2 text-[14px] font-semibold transition-colors",
            value === t.value ? "border-amber-400 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- posters ---------- */

export function Poster({
  title,
  className = "",
  rank,
  badge,
  selected,
  size = "w342",
  lazy = true,
  hoverRing = false,
}: {
  title: Pick<Title, "title" | "poster" | "year">;
  className?: string;
  rank?: number;
  badge?: ReactNode;
  selected?: boolean;
  size?: "w92" | "w185" | "w342" | "w500";
  lazy?: boolean;
  hoverRing?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = title.poster ? resize(title.poster, size) : "";
  return (
    <div
      className={cx(
        "relative aspect-[2/3] overflow-hidden rounded-md bg-zinc-900 ring-1 transition-[box-shadow,transform] duration-300 ease-expo",
        selected ? "ring-2 ring-amber-400" : "ring-white/10",
        hoverRing && !selected && "group-hover:ring-amber-300/60",
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={`${title.title} poster`}
          width={342}
          height={513}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full flex-col justify-end bg-[radial-gradient(120%_90%_at_0%_0%,rgba(252,187,0,0.16),transparent_60%),#141416] p-2.5">
          <span className="line-clamp-4 text-[13px] leading-tight font-extrabold text-balance text-white">{title.title}</span>
          {title.year ? <span className="mt-1 text-[11px] text-zinc-500 tabular-nums">{title.year}</span> : null}
        </div>
      )}
      {rank !== undefined && (
        <span className="absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white tabular-nums ring-1 ring-white/15">
          {rank}
        </span>
      )}
      {badge && (
        <span className="absolute right-1.5 bottom-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-bold text-amber-300 tabular-nums">
          {badge}
        </span>
      )}
      {selected && (
        <span className="absolute top-1.5 right-1.5 flex size-6 animate-pop items-center justify-center rounded-full bg-amber-400 text-zinc-950 shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

/* ---------- film grain ---------- */

export function Grain() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed -inset-[10%] z-[60] animate-grain opacity-[0.07] mix-blend-overlay">
      <svg className="size-full">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
