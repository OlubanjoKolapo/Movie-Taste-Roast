import { ArrowRight, FileUp, Link2, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "../components/chrome";
import { useToast } from "../components/Dialog";
import { Eyebrow, Poster, Segmented, Tabs, btn, cx } from "../components/ui";
import { importCsv, importLetterboxd, importMovieTonight, parseProfile } from "../lib/imports";
import { HEAT_COPY } from "../lib/roast";
import { navigate } from "../lib/router";
import { encodeSlug } from "../lib/slug";
import { getTitle, searchLocal, searchRemote, type KindFilter } from "../lib/titles";
import type { Heat, Pick, Title } from "../lib/types";

const MIN = 5;
const MAX = 10;
const DRAFT = "mr:draft";

interface Draft {
  picks: { key: string; rating?: number }[];
  heat: Heat;
  name: string;
}

function loadDraft(): { picks: Pick[]; heat: Heat; name: string } {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? "null") as Draft | null;
    if (d) {
      const picks = d.picks.map((p) => ({ title: getTitle(p.key)!, rating: p.rating })).filter((p) => p.title);
      return { picks, heat: d.heat ?? "medium", name: d.name ?? "" };
    }
  } catch {
    /* ignore */
  }
  return { picks: [], heat: "medium", name: "" };
}

export function markMine(slug: string) {
  try {
    const mine = JSON.parse(localStorage.getItem("mr:mine") ?? "[]") as string[];
    localStorage.setItem("mr:mine", JSON.stringify([slug, ...mine.filter((s) => s !== slug)].slice(0, 30)));
  } catch {
    /* ignore */
  }
}

type Tab = "pick" | "profile" | "csv";

export default function PickPage() {
  const initial = useMemo(loadDraft, []);
  const [picks, setPicks] = useState<Pick[]>(initial.picks);
  const [heat, setHeat] = useState<Heat>(initial.heat);
  const [name, setName] = useState(initial.name);
  const [tab, setTab] = useState<Tab>("pick");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [remote, setRemote] = useState<Title[]>([]);
  const [searching, setSearching] = useState(false);
  const [rating, setRating] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT, JSON.stringify({ picks: picks.map((p) => ({ key: p.title.key, rating: p.rating })), heat, name }));
    } catch {
      /* ignore */
    }
  }, [picks, heat, name]);

  // Remote TMDb search, debounced, merged under the instant local results.
  useEffect(() => {
    setRemote([]);
    if (query.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setRemote(await searchRemote(query, ctrl.signal));
      setSearching(false);
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
      setSearching(false);
    };
  }, [query]);

  const results = useMemo(() => {
    const local = searchLocal(query, kind);
    const keys = new Set(local.map((t) => t.key));
    const extra = remote.filter((t) => !keys.has(t.key) && (kind === "all" || t.kind === kind));
    return [...local, ...extra].slice(0, 60);
  }, [query, kind, remote]);

  const selected = new Set(picks.map((p) => p.title.key));
  const toggle = (t: Title) => {
    if (selected.has(t.key)) {
      setPicks((ps) => ps.filter((p) => p.title.key !== t.key));
      if (rating === t.key) setRating(null);
    } else if (picks.length >= MAX) {
      toast(`Ten is plenty. Remove one first.`);
    } else {
      setPicks((ps) => [...ps, { title: t }]);
    }
  };
  const setPickRating = (key: string, r?: number) => setPicks((ps) => ps.map((p) => (p.title.key === key ? { ...p, rating: r } : p)));

  const ready = picks.length >= MIN;
  const submit = () => {
    if (!ready) return;
    const slug = encodeSlug({ heat, name, items: picks.map((p) => ({ key: p.title.key, rating: p.rating })) });
    markMine(slug);
    navigate(`/r/${slug}?fresh=1`);
  };

  const onImported = (imported: Pick[], source: string) => {
    setPicks(imported.slice(0, MAX));
    setTab("pick");
    toast(`${imported.length} titles from ${source}. Check them, then roast.`);
  };

  const ratingPick = picks.find((p) => p.title.key === rating);

  return (
    <>
      <Header back />
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-44 sm:px-6 sm:pt-12 lg:px-8">
        <Eyebrow>Your taste</Eyebrow>
        <h1 className="mt-4 text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-black tracking-[-0.03em] text-balance text-white">Pick five you’d defend.</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-pretty text-zinc-400">
          Films, series or anime. The ones you’d argue for. Rate them out of 10 if you’re feeling brave, it makes the roast sharper.
        </p>

        {/* Selected tray */}
        <section aria-label="Your picks" className="mt-8 rounded-2xl border border-white/[0.08] bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-white">
              Your picks <span className="ml-1 text-zinc-500 tabular-nums">{picks.length}/{MAX}</span>
            </h2>
            {picks.length > 0 && (
              <button type="button" className={btn("quiet")} onClick={() => { setPicks([]); setRating(null); }}>
                Clear
              </button>
            )}
          </div>
          {picks.length === 0 ? (
            <div className="mt-3 flex gap-2.5" aria-hidden="true">
              {Array.from({ length: MIN }, (_, i) => (
                <div key={i} className="flex aspect-[2/3] w-16 items-center justify-center rounded-md border border-dashed border-white/12 text-[12px] font-bold text-zinc-600 tabular-nums">
                  {i + 1}
                </div>
              ))}
            </div>
          ) : (
            <ul className="no-scrollbar -mx-1 mt-3 flex gap-2.5 overflow-x-auto px-1 pt-1 pb-1">
              {picks.map((p, i) => (
                <li key={p.title.key} className="w-16 shrink-0 animate-pop">
                  <div className="relative">
                    <Poster title={p.title} size="w185" rank={i + 1} lazy={false} />
                    <button
                      type="button"
                      aria-label={`Remove ${p.title.title}`}
                      onClick={() => toggle(p.title)}
                      className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 ring-2 ring-card hover:bg-zinc-700"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRating(rating === p.title.key ? null : p.title.key)}
                    aria-expanded={rating === p.title.key}
                    className={cx(
                      "mt-1.5 h-7 w-full rounded-full text-[11px] font-bold tabular-nums transition-colors",
                      p.rating ? "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/35" : "bg-white/[0.06] text-zinc-400 hover:text-white",
                      rating === p.title.key && "ring-2 ring-amber-400",
                    )}
                  >
                    {p.rating ? `${p.rating}/10` : "Rate"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {ratingPick && (
            <div className="mt-4 animate-fade-in border-t border-white/[0.06] pt-4">
              <p className="text-[13px] font-semibold text-zinc-300">
                How much do you rate <span className="text-white">{ratingPick.title.title}</span>?
              </p>
              <div role="radiogroup" aria-label={`Rating for ${ratingPick.title.title}`} className="mt-3 flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={ratingPick.rating === n}
                    onClick={() => {
                      setPickRating(ratingPick.title.key, n);
                      const next = picks.find((p) => !p.rating && p.title.key !== ratingPick.title.key);
                      setRating(next ? next.title.key : null);
                    }}
                    className={cx(
                      "size-10 rounded-full text-[14px] font-bold tabular-nums transition-colors",
                      ratingPick.rating === n ? "bg-amber-400 text-zinc-950" : "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12] hover:text-white",
                    )}
                  >
                    {n}
                  </button>
                ))}
                {ratingPick.rating && (
                  <button type="button" className={btn("quiet", "sm", "ml-1")} onClick={() => setPickRating(ratingPick.title.key, undefined)}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="mt-8">
          <Tabs
            label="How to add titles"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "pick", label: "Pick titles" },
              { value: "profile", label: "Profile link" },
              { value: "csv", label: "Letterboxd CSV" },
            ]}
          />
        </div>

        {tab === "pick" && (
          <section className="mt-6 animate-fade-in" aria-label="Find titles">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative flex-1">
                <span className="sr-only">Search films, series and anime</span>
                <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search films, series, anime…"
                  className="h-12 w-full rounded-full border border-white/12 bg-white/[0.06] pr-11 pl-11 text-[15px] text-white placeholder:text-zinc-500 focus:border-amber-400/70 focus:outline-none"
                />
                {searching && <Loader2 className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-zinc-500" />}
              </label>
              <Segmented
                label="Filter by type"
                size="sm"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "all", label: "All" },
                  { value: "film", label: "Films" },
                  { value: "series", label: "Series" },
                  { value: "anime", label: "Anime" },
                ]}
              />
            </div>
            <ul className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-6">
              {results.map((t) => {
                const on = selected.has(t.key);
                const order = picks.findIndex((p) => p.title.key === t.key);
                return (
                  <li key={t.key}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${t.title}${t.year ? `, ${t.year}` : ""}`}
                      onClick={() => toggle(t)}
                      className="group block w-full text-left"
                    >
                      <Poster title={t} size="w185" selected={on} rank={on ? order + 1 : undefined} hoverRing className={cx(on && "scale-[0.97]")} />
                      <span className="mt-2 line-clamp-1 text-[12.5px] font-semibold text-zinc-300 group-hover:text-white">{t.title}</span>
                      <span className="text-[11.5px] text-zinc-500 tabular-nums">
                        {[t.year || null, t.kind === "film" ? "Film" : t.kind === "series" ? "Series" : "Anime"].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {results.length === 0 && !searching && (
              <p className="mt-10 text-center text-[14px] text-zinc-500">Nothing matches “{query}”. Try a shorter search.</p>
            )}
          </section>
        )}

        {tab === "profile" && <ProfileImport onImported={onImported} />}
        {tab === "csv" && <CsvImport onImported={onImported} />}

        <section className="mt-12 grid gap-4 sm:grid-cols-2" aria-label="Roast settings">
          <div className="rounded-2xl border border-white/[0.08] bg-card p-5">
            <h2 className="text-[14px] font-bold text-white">How hot?</h2>
            <div className="mt-3">
              <Segmented label="Heat" value={heat} onChange={setHeat} options={(["mild", "medium", "savage"] as Heat[]).map((h) => ({ value: h, label: HEAT_COPY[h].label }))} />
            </div>
            <p className="mt-3 text-[13px] text-zinc-400">{HEAT_COPY[heat].hint}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-card p-5">
            <label htmlFor="name" className="text-[14px] font-bold text-white">
              Name on your card <span className="font-medium text-zinc-500">(optional)</span>
            </label>
            <input
              id="name"
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name or handle"
              autoComplete="given-name"
              className="mt-3 h-12 w-full rounded-xl border border-white/12 bg-white/[0.06] px-4 text-[15px] text-white placeholder:text-zinc-500 focus:border-amber-400/70 focus:outline-none"
            />
            <p className="mt-2 text-[12px] text-zinc-500">It goes in your share link, so keep it to something you’re happy to post.</p>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: MIN }, (_, i) => (
                <span key={i} className={cx("h-1.5 w-5 rounded-full transition-colors duration-300", i < picks.length ? "bg-amber-400" : "bg-white/12")} />
              ))}
            </div>
            <p className="mt-1.5 truncate text-[13px] font-semibold text-zinc-300" aria-live="polite">
              {ready ? `${picks.length} picked. Ready when you are.` : `${picks.length} of ${MIN} picked`}
            </p>
          </div>
          <button type="button" disabled={!ready} onClick={submit} className={btn("primary", "lg")}>
            Roast my taste
            <ArrowRight className="size-[18px]" />
          </button>
        </div>
      </div>
    </>
  );
}

function ProfileImport({ onImported }: { onImported: (p: Pick[], source: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    const src = parseProfile(value);
    if (!src) {
      setError("Paste a Letterboxd or MovieTonight profile link, or just your Letterboxd username.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const picks = src.kind === "letterboxd" ? await importLetterboxd(src.handle) : await importMovieTonight(src.handle);
      if (picks.length < 3) throw new Error("Not enough rated titles on that profile yet. Pick a few by hand.");
      onImported(picks, src.kind === "letterboxd" ? "Letterboxd" : "MovieTonight");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-6 max-w-xl animate-fade-in">
      <label htmlFor="profile" className="text-[14px] font-bold text-white">
        Your profile link
      </label>
      <form
        className="mt-3 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-zinc-500" />
          <input
            id="profile"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="letterboxd.com/yourname"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-white/12 bg-white/[0.06] pr-4 pl-11 text-[15px] text-white placeholder:text-zinc-500 focus:border-amber-400/70 focus:outline-none"
          />
        </div>
        <button type="submit" disabled={busy || !value.trim()} className={btn("outline", "lg")}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Reading…" : "Import"}
        </button>
      </form>
      {error ? (
        <p className="mt-3 text-[13px] font-semibold text-rose-300" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-[13px] text-zinc-500">We read your public diary and keep your highest-rated titles. Nothing is saved.</p>
      )}
    </section>
  );
}

function CsvImport({ onImported }: { onImported: (p: Pick[], source: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const handle = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onImported(await importCsv(file), "your Letterboxd export");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-6 max-w-xl animate-fade-in">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={cx(
          "flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
          drag ? "border-amber-400/70 bg-amber-400/[0.06]" : "border-white/15 bg-white/[0.02] hover:border-amber-400/40",
        )}
      >
        {busy ? <Loader2 className="size-6 animate-spin text-amber-300" /> : <FileUp className="size-6 text-amber-300" />}
        <span className="text-[15px] font-bold text-white">{busy ? "Matching your titles…" : "Drop ratings.csv here, or choose a file"}</span>
        <span className="text-[13px] text-zinc-500">Letterboxd → Settings → Data → Export your data</span>
      </button>
      <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => handle(e.target.files?.[0])} tabIndex={-1} />
      {error && (
        <p className="mt-3 text-[13px] font-semibold text-rose-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
