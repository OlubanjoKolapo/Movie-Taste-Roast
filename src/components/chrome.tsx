import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CATALOGUE, resize } from "../data/catalogue";
import { canGoBack, goBack, linkProps } from "../lib/router";
import { MOVIETONIGHT_URL } from "../lib/links";
import { cx, iconBtn, Mascot, MovieTonightMark, Wordmark } from "./ui";

/* ---------- header ---------- */

export function Header({ back = false, right, marketing = false }: { back?: boolean; right?: ReactNode; marketing?: boolean }) {
  // The transparent marketing header turns solid once content scrolls under it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!marketing) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [marketing]);
  return (
    <header
      className={cx(
        "top-0 z-40 w-full transition-[background-color,border-color] duration-300",
        marketing
          ? cx("fixed border-b", scrolled ? "border-white/[0.08] bg-black/90 backdrop-blur-xl" : "border-transparent bg-gradient-to-b from-black/80 to-transparent")
          : "sticky border-b border-white/[0.08] bg-black/90 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        {back && (
          <button type="button" aria-label="Back" onClick={() => goBack("/")} className={cx(iconBtn, "-ml-2")}>
            <ArrowLeft className="size-5" />
          </button>
        )}
        <a {...linkProps("/")} className="rounded-md py-1" aria-label="movieroast home">
          <Wordmark />
        </a>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

export const showBack = () => canGoBack();

/* ---------- deterministic poster sets ---------- */

function seededShuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- hero poster wall ---------- */

export function PosterWall() {
  const host = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => {
    const pool = seededShuffle(CATALOGUE.filter((t) => t.poster), 7);
    return Array.from({ length: 7 }, (_, c) => pool.slice(c * 8, c * 8 + 8));
  }, []);

  // The vignette follows the cursor like a projector beam. CSS vars, one rAF per frame.
  useEffect(() => {
    const el = host.current?.parentElement;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={host} aria-hidden="true" className="poster-stage pointer-events-none absolute inset-0 overflow-hidden">
      <div className="poster-plane absolute -top-[30%] -bottom-[10%] left-1/2 grid w-[clamp(860px,92vw,1380px)] -translate-x-1/2 grid-cols-7 gap-3 sm:gap-4">
        {columns.map((col, i) => (
          <div key={i} className="overflow-hidden">
            <div
              className={cx("flex flex-col gap-3 sm:gap-4", i % 2 ? "animate-col-down" : "animate-col-up")}
              style={{ animationDuration: `${70 + (i % 3) * 18}s` }}
            >
              {[...col, ...col].map((t, j) => (
                <img
                  key={j}
                  src={resize(t.poster, "w185")}
                  alt=""
                  width={185}
                  height={278}
                  decoding="async"
                  className="aspect-[2/3] w-full rounded-lg object-cover opacity-[0.55] ring-1 ring-white/10"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mx,50%)_var(--my,42%),rgba(5,5,6,0.25)_0%,rgba(5,5,6,0.78)_26%,#050506_64%)] transition-[background] duration-300" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-page to-transparent" />
    </div>
  );
}

/* ---------- footer: the credits roll ---------- */

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  const external = /^https?:/.test(to);
  return (
    <a
      {...(external ? { href: to, target: "_blank", rel: "noopener" } : linkProps(to))}
      className="group inline-flex items-center gap-2 py-1.5 text-[14px] text-zinc-400 transition-colors hover:text-white"
    >
      <span className="h-px w-0 bg-amber-400 transition-[width] duration-300 ease-expo group-hover:w-4" />
      {children}
    </a>
  );
}

export function Footer() {
  const strip = useMemo(() => seededShuffle(CATALOGUE.filter((t) => t.poster), 21).slice(0, 18), []);
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-deep">
      <div aria-hidden="true" className="overflow-hidden py-6">
        <div className="flex w-max animate-credits gap-3">
          {[...strip, ...strip].map((t, i) => (
            <img
              key={i}
              src={resize(t.poster, "w92")}
              alt=""
              width={72}
              height={108}
              loading="lazy"
              className="h-[108px] w-[72px] rounded-md object-cover opacity-40 grayscale"
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pt-12 sm:px-8">
        <div className="flex items-center gap-4">
          <Mascot size={56} />
          <p className="max-w-sm text-[15px] text-pretty text-zinc-400">Honest about your taste. Then helpful about tonight.</p>
        </div>
        <a
          {...linkProps("/roast")}
          className="group mt-10 block max-w-4xl text-[clamp(2.25rem,6vw,4.5rem)] leading-[0.95] font-black tracking-[-0.035em] text-balance text-white transition-colors hover:text-amber-300"
        >
          Think your taste can take it?
          <ArrowRight className="ml-3 inline size-[0.7em] align-[-0.05em] transition-transform duration-300 ease-expo group-hover:translate-x-1.5" />
        </a>

        <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <p className="mb-3 text-[12px] font-extrabold tracking-[0.16em] text-zinc-600 uppercase">Movie Roast</p>
            <FooterLink to="/roast">Roast my taste</FooterLink>
            <br />
            <FooterLink to="/#criteria">How it judges</FooterLink>
          </div>
          <div>
            <p className="mb-3 text-[12px] font-extrabold tracking-[0.16em] text-zinc-600 uppercase">MovieTonight</p>
            <FooterLink to={MOVIETONIGHT_URL}>One confident pick tonight</FooterLink>
            <br />
            <FooterLink to={MOVIETONIGHT_URL}>Create an account</FooterLink>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="mb-3 text-[12px] font-extrabold tracking-[0.16em] text-zinc-600 uppercase">Made by</p>
            <a href={MOVIETONIGHT_URL} target="_blank" rel="noopener" className="text-[15px]">
              <span className="text-zinc-500">by </span>
              <MovieTonightMark />
            </a>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none mt-10 -mb-[3.2vw] text-center text-[15.5vw] leading-[0.8] font-black tracking-[-0.06em] whitespace-nowrap select-none">
        <span className="bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.02))] bg-clip-text text-transparent">movieroast</span>
        <span className="text-amber-400/70">.</span>
      </div>

      <div className="relative border-t border-white/[0.06] bg-deep">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-[12px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} MovieTonight. Roasts are jokes about taste, not people.</p>
          <p>Data & imagery from TMDb. This product uses the TMDb API but is not endorsed by TMDb.</p>
        </div>
      </div>
    </footer>
  );
}
