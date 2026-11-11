import { Download, Link2, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CARD_SIZE, drawCard, exportCard, type CardData, type CardFormat } from "../lib/card";
import { roastUrl } from "../lib/slug";
import { Dialog } from "./Dialog";
import { Segmented, cx } from "./ui";

function CardPreview({ format, data }: { format: CardFormat; data: CardData }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { w, h } = CARD_SIZE[format];
  useEffect(() => {
    if (ref.current) drawCard(ref.current, format, data, Math.min(3, window.devicePixelRatio || 1) * 1.25);
  }, [format, data]);
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`${format === "story" ? "Story" : "Post"} card: ${data.roast.score} out of 100, ${data.roast.type}. ${data.roast.verdict}`}
      className="mx-auto block max-w-full rounded-[22px] shadow-[0_40px_120px_rgba(0,0,0,0.85)]"
      style={{ width: w, aspectRatio: `${w} / ${h}` }}
    />
  );
}

const icons = {
  instagram: (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.43 9.43 0 1 1 7.99 4.42zm8.02-17.45A11.33 11.33 0 0 0 12.04.75 11.3 11.3 0 0 0 2.25 17.7L.75 23.25l5.68-1.49a11.3 11.3 0 0 0 5.6 1.43h.01c6.24 0 11.31-5.07 11.32-11.3 0-3.02-1.18-5.86-3.3-8z" />
    </svg>
  ),
};

function ShareButton({ label, onClick, className, children }: { label: string; onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-[52px] flex-col items-center gap-1.5">
      <span className={cx("flex size-12 items-center justify-center rounded-full text-white transition-transform duration-200 ease-expo group-hover:scale-105 group-active:scale-95", className)}>
        {children}
      </span>
      <span className="text-[10px] font-semibold text-zinc-400">{label}</span>
    </button>
  );
}

export function ShareSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: CardData }) {
  const [format, setFormat] = useState<CardFormat>("story");
  const [done, setDone] = useState("");
  const url = roastUrl(data.slug);
  const text = `My movie taste scored ${data.roast.score}/100. Apparently I’m “${data.roast.type}”. Get roasted:`;
  const fileName = `movieroast-${data.roast.score}-${format}.png`;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(""), 3200);
    return () => clearTimeout(t);
  }, [done]);

  // Pre-render the export so the share call happens inside the tap (Safari requires it).
  const prepared = useRef<{ key: string; blob: Promise<Blob> } | null>(null);
  const prepKey = `${format}:${data.slug}:${data.roast.verdict}`;
  useEffect(() => {
    if (!open) return;
    if (prepared.current?.key !== prepKey) {
      const blob = exportCard(format, data);
      blob.catch(() => {});
      prepared.current = { key: prepKey, blob };
    }
  }, [open, prepKey, format, data]);
  const getBlob = () => (prepared.current?.key === prepKey ? prepared.current.blob : exportCard(format, data));
  const file = async () => new File([await getBlob()], fileName, { type: "image/png" });
  const download = (blob: Blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const copy = async (msg = "Link copied. Paste it anywhere.") => {
    try {
      await navigator.clipboard.writeText(url);
      setDone(msg);
    } catch {
      setDone(url);
    }
  };
  const shareFile = async (fallbackMsg: string) => {
    try {
      const f = await file();
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], text: `${text} ${url}` });
        setDone("Shared. Bold move.");
      } else {
        download(f);
        setDone(fallbackMsg);
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setDone("Couldn’t make the image. Copy the link instead.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Share your roast" wide>
      <div className="flex flex-col items-center pt-1 pb-2">
        <Segmented
          label="Card format"
          size="sm"
          value={format}
          onChange={setFormat}
          options={[
            { value: "story", label: "Story 9:16" },
            { value: "post", label: "Post 1:1" },
          ]}
        />
        <div className="mt-5 w-full">
          <CardPreview format={format} data={data} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-x-1 gap-y-3 sm:gap-x-2">
          <ShareButton
            label="Story"
            className="bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_45%,#d6249f_60%,#285aeb_90%)]"
            onClick={() => shareFile("Saved. Add it to your Instagram Story.")}
          >
            {icons.instagram}
          </ShareButton>
          <ShareButton label="X" className="bg-black ring-1 ring-white/15" onClick={() => window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener")}>
            {icons.x}
          </ShareButton>
          <ShareButton label="WhatsApp" className="bg-[#25d366]" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener")}>
            {icons.whatsapp}
          </ShareButton>
          <ShareButton label="Copy link" className="bg-[#26262a]" onClick={() => copy()}>
            <Link2 className="size-5" />
          </ShareButton>
          <ShareButton
            label="Save image"
            className="bg-[#26262a]"
            onClick={async () => {
              try {
                download(await getBlob());
                setDone("Saved. Post it before you change your mind.");
              } catch {
                setDone("Couldn’t make the image. Copy the link instead.");
              }
            }}
          >
            <Download className="size-5" />
          </ShareButton>
          <ShareButton
            label="More"
            className="bg-[#26262a]"
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({ title: "My taste roast", text, url });
                  setDone("Shared. Bold move.");
                } catch {
                  /* cancelled */
                }
              } else copy();
            }}
          >
            <MoreHorizontal className="size-5" />
          </ShareButton>
        </div>
        <p className="mt-4 min-h-5 text-center text-[13px] font-semibold text-amber-300" aria-live="polite">
          {done}
        </p>
      </div>
    </Dialog>
  );
}
