import { ArrowRight, Check, Copy, Share2, Swords } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Footer, Header } from "../components/chrome";
import { Dialog } from "../components/Dialog";
import { ScoreBar, ScoreRing } from "../components/ScoreRing";
import { ShareSheet } from "../components/ShareSheet";
import { Eyebrow, LinkButton, Mascot, MovieTonightMark, Poster, Segmented, btn, cx } from "../components/ui";
import { aiRoast, cachedAiRoast } from "../lib/ai";
import { useInView, useReducedMotion } from "../lib/hooks";
import { movieTonightFix } from "../lib/links";
import { HEAT_COPY, roast as runEngine } from "../lib/roast";
import { navigate } from "../lib/router";
import { decodeSlug, encodeSlug, shareBase } from "../lib/slug";
import { resolveKeys } from "../lib/titles";
import type { Heat, Pick, Roast } from "../lib/types";
import { markMine } from "./PickPage";

const isMine = (slug: string) => {
  try {
    return (JSON.parse(localStorage.getItem("mr:mine") ?? "[]") as string[]).includes(slug);
  } catch {
    return false;
  }
};
const possessive = (name: string) => (name.endsWith("s") ? `${name}’` : `${name}’s`);

/* ---------- the roasting moment ---------- */

function Roasting({ picks, heat, name }: { picks: Pick[]; heat: Heat; name?: string }) {
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();
  const rated = picks.some((p) => p.rating);
  const steps = [
    rated ? "Reading your ratings" : "Reading your picks",
    picks.some((p) => p.title.tags.includes("comfort")) ? "Judging your comfort rewatches" : "Counting the obvious choices",
    heat === "savage" ? "Sharpening the knives. All of them." : heat === "mild" ? "Choosing kind words" : "Sharpening the knives",
  ];
  useEffect(() => {
    const timers = [700, 1450, 2200].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-page px-6" role="status" aria-live="polite">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_42%,rgba(252,187,0,0.12),transparent_70%)]" />
      <Mascot size={120} state="thinking" heat={heat} />
      <h1 className="relative mt-8 text-center text-[clamp(1.75rem,5vw,2.5rem)] leading-tight font-black tracking-[-0.03em] text-white">
        Roasting {name ? possessive(name) : "your"} taste…
      </h1>
      <div className="relative mt-8 flex gap-2">
        {picks.slice(0, 6).map((p, i) => (
          <div
            key={p.title.key}
            className="w-12 sm:w-14"
            style={reduced ? undefined : { animation: `fadeIn .4s cubic-bezier(.16,1,.3,1) ${i * 90}ms both` }}
          >
            <Poster title={p.title} size="w92" lazy={false} selected={step > 0 && i % 3 === (step - 1) % 3} />
          </div>
        ))}
      </div>
      <ul className="relative mt-9 w-full max-w-xs space-y-3">
        {steps.map((s, i) => (
          <li
            key={s}
            className={cx("flex items-center gap-3 text-[15px] font-semibold transition-all duration-500 ease-expo", step >= i ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0")}
          >
            <span className={cx("flex size-6 shrink-0 items-center justify-center rounded-full transition-colors", step > i ? "bg-amber-400 text-zinc-950" : "bg-white/[0.08]")}>
              {step > i ? <Check className="size-3.5" strokeWidth={3} /> : <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />}
            </span>
            <span className={step > i ? "text-zinc-300" : "text-white"}>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- invite ---------- */

function InviteDialog({ open, onClose, slug, roast, name }: { open: boolean; onClose: () => void; slug: string; roast: Roast; name?: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${shareBase()}/?challenge=${slug}`;
  const text = `I got ${roast.score}/100 on Movie Roast (${roast.type}). Think your movie taste is better? Prove it:`;
  return (
    <Dialog open={open} onClose={onClose} title="Roast a friend">
      <div className="pb-2">
        <div className="flex items-center gap-3">
          <Mascot size={52} state="answering" />
          <p className="text-[15px] leading-relaxed text-pretty text-zinc-300">
            Send them this. They pick five, we do the rest. Then you compare scores{name ? "" : " and argue"}.
          </p>
        </div>
        <div className="mt-5 rounded-xl border border-white/12 bg-white/[0.04] p-4">
          <p className="text-[14px] leading-relaxed text-zinc-200">{text}</p>
          <p className="mt-2 truncate text-[13px] font-semibold text-amber-300">{link}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            className={btn("primary", "lg")}
            data-autofocus
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${text} ${link}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              } catch {
                /* ignore */
              }
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy invite"}
          </button>
          <button
            type="button"
            className={btn("soft", "lg")}
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({ title: "Roast your taste", text, url: link });
                } catch {
                  /* cancelled */
                }
              } else window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, "_blank", "noopener");
            }}
          >
            <Share2 className="size-4" />
            Send
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------- page ---------- */

function useResolvedPicks(slug: string) {
  const data = useMemo(() => decodeSlug(slug), [slug]);
  const [picks, setPicks] = useState<Pick[] | null>(null);
  useEffect(() => {
    if (!data) return;
    let live = true;
    resolveKeys(data.items.map((i) => i.key)).then((map) => {
      if (!live) return;
      setPicks(data.items.filter((i) => map.has(i.key)).map((i) => ({ title: map.get(i.key)!, rating: i.rating })));
    });
    return () => {
      live = false;
    };
  }, [data]);
  return { data, picks };
}

const LETTERS = "ABCDEFGHIJ";

export default function ResultPage({ slug, fresh }: { slug: string; fresh: boolean }) {
  const { data, picks } = useResolvedPicks(slug);
  const mine = isMine(slug);
  const [result, setResult] = useState<Roast | null>(null);
  const [roasting, setRoasting] = useState(fresh);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [critRef, critInView] = useInView<HTMLDivElement>(0.15);

  useEffect(() => {
    if (!data || !picks || picks.length < 3) return;
    const input = { picks, heat: data.heat };
    const base = runEngine(input);
    if (!fresh) {
      setResult(mine ? cachedAiRoast(input, base) : base);
      setRoasting(false);
      return;
    }
    // Fresh roast: the theatrical moment runs at least 2.8s while the model writes.
    let live = true;
    setRoasting(true);
    Promise.all([aiRoast(input, base), new Promise((r) => setTimeout(r, 2800))]).then(([r]) => {
      if (!live) return;
      setResult(r);
      setRoasting(false);
      navigate(`/r/${slug}`, { replace: true, keepScroll: true });
    });
    return () => {
      live = false;
    };
  }, [data, picks, fresh, mine, slug]);

  useEffect(() => {
    if (result) document.title = `${result.score}/100 · ${result.type} · movieroast.`;
    return () => {
      document.title = "movieroast. Your movie taste, roasted.";
    };
  }, [result]);

  if (!data || (picks && picks.length < 3)) {
    return (
      <>
        <Header back />
        <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
          <Mascot size={88} />
          <h1 className="mt-6 text-[32px] leading-tight font-black tracking-[-0.03em] text-white">This roast went cold.</h1>
          <p className="mt-3 text-[15px] text-zinc-400">The link is broken or the titles in it couldn’t be found. Start a fresh one.</p>
          <LinkButton to="/roast" size="lg" className="mt-8">
            Roast my taste
          </LinkButton>
        </main>
      </>
    );
  }

  if (roasting || !result || !picks) return picks ? <Roasting picks={picks} heat={data.heat} name={data.name} /> : <div className="min-h-screen bg-page" />;

  const byKey = new Map(picks.map((p) => [p.title.key, p]));
  const savage = result.heat === "savage";
  const who = data.name ? possessive(data.name) : mine ? "Your" : "Their";
  const changeHeat = (heat: Heat) => {
    const next = encodeSlug({ heat, name: data.name, items: data.items });
    markMine(next);
    navigate(`/r/${next}?fresh=1`, { replace: true });
  };
  const cardData = { roast: result, titles: picks.map((p) => p.title), name: data.name, slug };

  return (
    <>
      <Header
        back
        right={
          <button type="button" onClick={() => setInviteOpen(true)} className={btn("outline", "sm")}>
            <Swords className="size-4" />
            <span className="hidden sm:inline">Roast a friend</span>
            <span className="sm:hidden">Challenge</span>
          </button>
        }
      />
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-32 sm:px-6 sm:pt-10 sm:pb-16 lg:px-8">
        {/* Hero verdict */}
        <section
          aria-live="polite"
          className="relative animate-rise overflow-hidden rounded-3xl border border-amber-400/30 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(252,187,0,0.16),transparent_55%),#0d0d0f] p-6 sm:p-10"
        >
          {savage && <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-rose-500/10 blur-3xl" />}
          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Mascot size={56} state="answering" heat={result.heat} />
                <Eyebrow>
                  {who} taste, honestly · {HEAT_COPY[result.heat].label}
                </Eyebrow>
              </div>
              <h1 className="mt-6 text-[clamp(2.4rem,6.5vw,4.75rem)] leading-[0.95] font-black tracking-[-0.035em] text-balance text-white">{result.verdict}</h1>
              <p className="mt-5 inline-flex rounded-full border border-amber-400/35 bg-amber-400/10 px-3.5 py-1.5 text-[13px] font-bold text-amber-200">{result.type}</p>
              <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-pretty text-zinc-300">{result.typeLine}</p>
            </div>
            <div className="flex flex-col items-center gap-2 md:pl-4">
              <ScoreRing value={result.score} size={184} savage={savage} />
              <span className="text-[12px] font-bold tracking-[0.16em] text-zinc-500 uppercase">Taste score</span>
            </div>
          </div>
          <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {mine ? (
              <button type="button" onClick={() => setShareOpen(true)} className={btn("primary", "lg")}>
                <Share2 className="size-[18px]" />
                Share my roast
              </button>
            ) : (
              <LinkButton to="/roast" size="lg">
                Get roasted yourself
                <ArrowRight className="size-[18px]" />
              </LinkButton>
            )}
            <button type="button" onClick={() => (mine ? setInviteOpen(true) : setShareOpen(true))} className={btn("soft", "lg")}>
              {mine ? "Roast a friend" : "Share this roast"}
            </button>
            {mine && (
              <div className="flex items-center gap-3 sm:ml-auto">
                <span className="text-[13px] text-zinc-500">Heat</span>
                <Segmented
                  label="Change the heat"
                  size="sm"
                  value={result.heat}
                  onChange={changeHeat}
                  options={(["mild", "medium", "savage"] as Heat[]).map((h) => ({ value: h, label: HEAT_COPY[h].label }))}
                />
              </div>
            )}
          </div>
        </section>

        {/* The roast lines, each tied to its evidence */}
        <section className="mt-16" aria-labelledby="evidence">
          <Eyebrow>The evidence</Eyebrow>
          <h2 id="evidence" className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] font-black tracking-[-0.03em] text-white">
            Exhibits A to {LETTERS[result.lines.length - 1]}.
          </h2>
          <ol className="mt-8 grid gap-4 lg:grid-cols-2">
            {result.lines.map((line, i) => {
              const evidence = line.keys.map((k) => byKey.get(k)).filter(Boolean) as Pick[];
              return (
                <li
                  key={line.text}
                  className="flex animate-fade-in gap-4 rounded-2xl border border-white/[0.08] bg-card p-4 transition-colors hover:border-amber-300/30 sm:p-5"
                  style={{ animationDelay: `${200 + i * 100}ms` }}
                >
                  <div className="flex w-16 shrink-0 flex-col gap-1.5">
                    {evidence.length ? (
                      <div className="relative">
                        <Poster title={evidence[0].title} size="w185" badge={evidence[0].rating ? `${evidence[0].rating}/10` : undefined} />
                        {evidence[1] && (
                          <div className="absolute -right-2.5 -bottom-2.5 w-8 shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
                            <Poster title={evidence[1].title} size="w92" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex aspect-[2/3] items-center justify-center rounded-md bg-amber-400/10 text-[22px] font-black text-amber-300 ring-1 ring-amber-400/25">#</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500 uppercase">Exhibit {LETTERS[i]}</p>
                    <p className="mt-2 text-[17px] leading-snug font-semibold text-pretty text-white">{line.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(110,231,183,0.08),transparent_55%),#0d0d0f] p-5 sm:p-6">
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-emerald-300 uppercase">But honestly</p>
            <p className="mt-2 text-[19px] leading-snug font-semibold text-pretty text-white">{result.compliment.replace(/^But honestly:\s*/, "")}</p>
          </div>
        </section>

        {/* Criteria */}
        <section className="mt-16" aria-labelledby="receipts">
          <Eyebrow>The receipts</Eyebrow>
          <h2 id="receipts" className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] font-black tracking-[-0.03em] text-white">
            How we got to <span className="tabular-nums">{result.score}</span>.
          </h2>
          <div ref={critRef} className="mt-8 grid gap-4 sm:grid-cols-2">
            {result.criteria.map((c, i) => (
              <div key={c.id} className="rounded-2xl border border-white/[0.08] bg-card p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[16px] font-extrabold text-white">{c.label}</h3>
                  <span className="text-[28px] leading-none font-black text-white tabular-nums">
                    {c.score}
                    <span className="text-[13px] font-bold text-zinc-600">/100</span>
                  </span>
                </div>
                <div className="mt-4">
                  <ScoreBar value={c.score} run={critInView} delay={i * 70} />
                </div>
                <p className="mt-3 text-[14px] leading-snug text-pretty text-zinc-300">{c.reason}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <p className="text-[13px] font-semibold text-zinc-500">Everything submitted</p>
            <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {picks.map((p, i) => (
                <Poster key={p.title.key} title={p.title} size="w185" rank={i + 1} badge={p.rating ? `${p.rating}/10` : undefined} className="w-[72px] shrink-0" />
              ))}
            </div>
          </div>
        </section>

        {/* Share CTA */}
        <section className="mt-16 flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-raised p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex-1">
            <h2 className="text-[22px] leading-tight font-black tracking-[-0.02em] text-balance text-white">
              {mine ? "Post it before you change your mind." : "Think you’d score higher?"}
            </h2>
            <p className="mt-2 text-[15px] text-zinc-400">
              {mine ? "Story and post cards, ready for Instagram, X and the group chat." : "Five picks. Two minutes. Then compare."}
            </p>
          </div>
          {mine ? (
            <button type="button" onClick={() => setShareOpen(true)} className={btn("soft", "lg")}>
              <Share2 className="size-[18px]" />
              Get the card
            </button>
          ) : (
            <LinkButton to="/roast" variant="soft" size="lg">
              Roast my taste
            </LinkButton>
          )}
        </section>

        {/* Convert into MovieTonight */}
        <section className="relative mt-6 overflow-hidden rounded-3xl border border-amber-400/30 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(252,187,0,0.16),transparent_55%),#0d0d0f] p-6 sm:p-10">
          <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <Eyebrow>Fix it tonight</Eyebrow>
              <h2 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black tracking-[-0.035em] text-balance text-white">
                Now let us find you something better tonight.
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-pretty text-zinc-300">
                <MovieTonightMark /> learns your taste and gives you one confident pick. Less scrolling. Start watching.
              </p>
              <LinkButton to={movieTonightFix(result.type)} size="lg" className="mt-7">
                Get one confident pick
                <ArrowRight className="size-[18px]" />
              </LinkButton>
            </div>
            <CollapseVisual picks={picks} />
          </div>
        </section>
      </main>

      {/* Sticky actions on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <div className="flex gap-3 px-4 py-3">
          {mine ? (
            <button type="button" onClick={() => setShareOpen(true)} className={btn("primary", "lg", "flex-1")}>
              Share my roast
            </button>
          ) : (
            <LinkButton to="/roast" size="lg" className="flex-1">
              Get roasted
            </LinkButton>
          )}
          <button type="button" onClick={() => setInviteOpen(true)} className={btn("soft", "lg")}>
            <Swords className="size-[18px]" />
            Friend
          </button>
        </div>
      </div>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} data={cardData} />
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} slug={slug} roast={result} name={data.name} />
      <Footer />
    </>
  );
}

/** Signature "collapse": their posters drift apart and fade while one glowing card takes the centre. */
function CollapseVisual({ picks }: { picks: Pick[] }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  const shown = picks.slice(0, 5);
  return (
    <div ref={ref} aria-hidden="true" className="relative mx-auto h-56 w-full max-w-sm">
      {shown.map((p, i) => {
        const offset = (i - (shown.length - 1) / 2) * 52;
        return (
          <div
            key={p.title.key}
            className="absolute top-1/2 left-1/2 w-20"
            style={{
              transform: `translate(-50%, -50%) translateX(${inView ? offset * 1.7 : offset}px) rotate(${inView ? (i - 2) * 7 : (i - 2) * 3}deg) scale(${inView ? 0.8 : 1})`,
              opacity: inView ? 0.18 : 0.9,
              transition: `transform 1.2s cubic-bezier(.16,1,.3,1) ${i * 60}ms, opacity 1.2s cubic-bezier(.16,1,.3,1) ${i * 60}ms`,
            }}
          >
            <Poster title={p.title} size="w185" className="grayscale" />
          </div>
        );
      })}
      <div
        className="absolute top-1/2 left-1/2 flex aspect-[2/3] w-28 flex-col items-center justify-center gap-3 rounded-lg border border-amber-400/50 bg-[radial-gradient(100%_100%_at_50%_0%,rgba(252,187,0,0.28),transparent_70%),#111113] shadow-[0_0_80px_rgba(252,187,0,0.35)]"
        style={{
          transform: `translate(-50%, -50%) scale(${inView ? 1 : 0.6})`,
          opacity: inView ? 1 : 0,
          transition: "transform 1.2s cubic-bezier(.16,1,.3,1) .35s, opacity .8s cubic-bezier(.16,1,.3,1) .35s",
        }}
      >
        <Mascot size={44} state={inView ? "answering" : "idle"} />
        <span className="px-2 text-center text-[12px] leading-tight font-extrabold text-white">
          One for
          <br />
          tonight.
        </span>
      </div>
    </div>
  );
}
