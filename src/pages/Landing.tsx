import { ArrowRight, Compass, Flame, Gavel, Users } from "lucide-react";
import { useMemo } from "react";
import { Footer, Header, PosterWall } from "../components/chrome";
import { ScoreBar } from "../components/ScoreRing";
import { Eyebrow, LinkButton, Mascot, Poster, cx } from "../components/ui";
import { CATALOGUE, BY_KEY } from "../data/catalogue";
import { PERSONAS } from "../data/personas";
import { useInView } from "../lib/hooks";
import { roast } from "../lib/roast";
import { decodeSlug } from "../lib/slug";
import type { Pick } from "../lib/types";

const gradientText = "bg-[linear-gradient(100deg,#fcbb00_10%,#ffe08a_45%,#fcbb00_80%)] bg-clip-text text-transparent";

/* A friend's challenge link (/?challenge=slug) shows their score above the hero. */
function useChallenge() {
  return useMemo(() => {
    const slug = new URLSearchParams(window.location.search).get("challenge");
    const data = slug ? decodeSlug(slug) : null;
    if (!data) return null;
    const picks = data.items.map((i) => ({ title: BY_KEY.get(i.key)!, rating: i.rating })).filter((p) => p.title) as Pick[];
    if (picks.length < 3) return { name: data.name };
    const r = roast({ picks, heat: data.heat });
    return { name: data.name, score: r.score, type: r.type };
  }, []);
}

function Hero() {
  const challenge = useChallenge();
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden pt-16 pb-20">
      <PosterWall />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-5 text-center sm:px-8">
        {challenge && (
          <p className="mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full border border-amber-400/35 bg-black/60 px-4 py-2 text-[13px] font-semibold text-amber-200 backdrop-blur">
            {challenge.score !== undefined ? (
              <>
                {challenge.name ?? "Your friend"} scored <span className="tabular-nums">{challenge.score}/100</span>. Your turn.
              </>
            ) : (
              <>{challenge.name ?? "Your friend"} thinks your taste is worse. Prove them wrong.</>
            )}
          </p>
        )}
        <Mascot size={92} follow />
        <h1 className="mt-7 text-[clamp(3.25rem,10vw,8.75rem)] leading-[0.86] font-black tracking-[-0.045em] text-balance text-white">
          Your taste,
          <br />
          <span className={gradientText}>roasted.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-[18px] leading-relaxed text-pretty text-zinc-300 sm:text-[20px]">
          Pick five films, shows or anime you’d defend. Get a score out of 100, an honest verdict and a card your friends will argue about.
        </p>
        <div className="mt-9 flex w-full justify-center sm:w-auto">
          <LinkButton to="/roast" size="xl" className="w-full sm:w-auto">
            Roast my taste
            <ArrowRight className="size-5" />
          </LinkButton>
        </div>
        <p className="mt-5 text-[13px] text-zinc-500">Free. No sign-up. Under two minutes.</p>
      </div>
    </section>
  );
}

const CRITERIA_COPY = [
  { id: "range", icon: Compass, text: "How far you wander: genres, formats, decades and languages." },
  { id: "boldness", icon: Flame, text: "How often you pick what most people haven’t seen." },
  { id: "crowd", icon: Users, text: "How well your picks hold up with critics and audiences." },
  { id: "conviction", icon: Gavel, text: "Whether your ratings actually say something." },
] as const;

/* How it judges: the four criteria, shown on a fixed sample taste. */
function Criteria() {
  const r = useMemo(() => roast({ picks: PERSONAS[0].picks, heat: "medium" }), []);
  const [critRef, critInView] = useInView<HTMLDivElement>(0.15);

  return (
    <>
      <section id="criteria" className="scroll-mt-16 border-t border-white/[0.06] bg-deep-2 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>How it judges</Eyebrow>
            <h2 className="mt-5 text-[clamp(2.5rem,6vw,5rem)] leading-[0.92] font-black tracking-[-0.035em] text-balance text-white">
              Four numbers. <span className={gradientText}>No mercy.</span>
            </h2>
            <p className="mt-6 text-[18px] leading-relaxed text-pretty text-zinc-300">
              The jokes are the fun part. The numbers are the receipts. Every roast scores you on four things, each with a one-line reason.
            </p>
          </div>
          <div ref={critRef} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CRITERIA_COPY.map((c, i) => {
              const crit = r.criteria.find((x) => x.id === c.id)!;
              const Icon = c.icon;
              return (
                <div key={c.id} className="rounded-2xl border border-white/[0.08] bg-card p-5 transition-colors hover:border-amber-300/30">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-full bg-amber-400/10 text-amber-300">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="text-[28px] leading-none font-black text-white tabular-nums">{crit.score}</span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-extrabold text-white">{crit.label}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-400">{c.text}</p>
                  <div className="mt-5">
                    <ScoreBar value={crit.score} run={critInView} delay={i * 70} />
                  </div>
                  <p className="mt-3 text-[13px] leading-snug text-pretty text-zinc-300">{crit.reason}</p>
                </div>
              );
            })}
          </div>
          <ul className="mt-10 grid gap-3 text-[14px] text-zinc-300 sm:grid-cols-3">
            {["Funny about your taste. Never about you.", "Every line names a real title you picked.", "Always ends with something kind and true."].map((rule) => (
              <li key={rule} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="size-1.5 shrink-0 rounded-full bg-amber-400" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function Marquee() {
  const lines = useMemo(() => {
    const withLines = CATALOGUE.filter((t) => t.line && t.line.length < 90);
    return [withLines.filter((_, i) => i % 3 === 0).slice(0, 12), withLines.filter((_, i) => i % 3 === 1).slice(0, 12)];
  }, []);
  return (
    <section className="overflow-hidden py-24 sm:py-28" aria-label="Lines the Concierge has written">
      <div className="mx-auto mb-10 max-w-7xl px-5 sm:px-8">
        <Eyebrow>From the roast</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.95] font-black tracking-[-0.035em] text-balance text-white">
          Specific. Slightly savage. <span className="text-amber-400">Always about the films.</span>
        </h2>
      </div>
      {lines.map((row, r) => (
        <div key={r} className="pause-on-hover mb-3 flex overflow-hidden">
          <div className={cx("flex w-max gap-3", r ? "animate-marquee-rev" : "animate-marquee")}>
            {[...row, ...row].map((t, i) => (
              <figure key={i} className="flex w-[340px] shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-card p-3 pr-5" aria-hidden={i >= row.length}>
                <Poster title={t} size="w92" className="w-11 shrink-0" />
                <blockquote className="text-[13.5px] leading-snug text-pretty text-zinc-300">{t.line}</blockquote>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 pb-24 sm:px-8 sm:pb-32">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-amber-400/30 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(252,187,0,0.16),transparent_55%),#0d0d0f] px-6 py-14 text-center sm:px-12 sm:py-20">
        <Mascot size={72} />
        <h2 className="mx-auto mt-6 max-w-2xl text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] font-black tracking-[-0.035em] text-balance text-white">
          Somebody had to say it. <span className={gradientText}>Might as well be us.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-pretty text-zinc-300">Five titles. Two minutes. One honest verdict, then a better pick for tonight.</p>
        <LinkButton to="/roast" size="xl" className="mt-9">
          Roast my taste
          <ArrowRight className="size-5" />
        </LinkButton>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <>
      <Header marketing right={<LinkButton to="/roast" size="sm" variant="soft">Get roasted</LinkButton>} />
      <main>
        <Hero />
        <Criteria />
        <Marquee />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
