import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronsRight, ChevronDown, Headphones, MoreHorizontal, Music2, Pause, Play, Repeat, RotateCcw, RotateCw, Search, Share2, Shuffle, SkipBack, SkipForward, Timer, Type, User, Users, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReciterPicker, SurahActions } from "@/components/LibraryControls";
import { ReciterPortrait } from "@/components/ReciterPortrait";
import { TrebleClef } from "@/components/TrebleClef";
import { useDownload } from "@/lib/downloads";
import { useT } from "@/lib/i18n";
import { usePlayer } from "@/lib/player-context";
import { RECITERS, surah, surahName } from "@/lib/quran";
import { RECITER_PHOTOS } from "@/lib/reciter-photos";
import { setState, toggleIn, useStore } from "@/lib/store";
import { setUI } from "@/lib/ui";

function useNowPlaying() {
  const p = usePlayer();
  const { lang } = useT();
  const selected = useStore((s) => s.reciter);
  const reciterId = p.reciter ?? selected;
  const tr = p.queue[p.index];
  const r = RECITERS.find((x) => x.id === reciterId);
  return { p, tr, reciterId, photo: RECITER_PHOTOS[reciterId], reciterName: (lang === "ar" ? r?.ar : r?.name) ?? reciterId };
}

/** Blurred reciter portrait behind a deep emerald gradient. */
function Backdrop({ photo }: { photo: string | undefined }) {
  return <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />}
    <div className="bg-player absolute inset-0" />
  </div>;
}

export function MiniPlayer() {
  const { p, tr, photo, reciterName, reciterId } = useNowPlaying();
  const { t, num, lang } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [recitersOpen, setRecitersOpen] = useState(false);
  if (!tr) return null;
  const s = surah(tr.s);
  const viewReciter = () => { setMenu(false); setUI({ homeView: "reciter" }); void navigate({ to: "/" }); };
  return <>
    <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 px-3">
      {menu && (
        <div className="absolute bottom-full start-3 z-30 mb-2 w-60 overflow-hidden rounded-2xl border bg-card p-1 shadow-soft">
          <button onClick={viewReciter} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-start transition-colors hover:bg-background/40">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary"><User className="h-4 w-4" /></span> {t("viewReciter")}
          </button>
          <button onClick={() => { setMenu(false); setRecitersOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-start transition-colors hover:bg-background/40">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary"><Users className="h-4 w-4" /></span> {t("changeReciter")}
          </button>
        </div>
      )}
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-soft">
        <Backdrop photo={photo} />
        <div className="relative flex items-center gap-1.5 p-2.5">
          <button onClick={() => setMenu((v) => !v)} aria-label={reciterName} title={reciterName} aria-expanded={menu} className="shrink-0">
            <span className="block -m-1 scale-90"><ReciterPortrait src={photo} name={reciterName} selected={false} /></span>
          </button>
          <button onClick={() => setOpen(true)} aria-label={t("openPlayer")} className="flex min-w-0 flex-1 items-center text-start">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{surahName(s, lang)}</span>
              <span className="block truncate text-xs text-muted-foreground">{reciterName} · {t("ayah")} {num(tr.a)}{p.error && ` · ${t("error")}`}</span>
            </span>
          </button>
          <button aria-label={t("openPlayer")} title={t("openPlayer")} onClick={() => setOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground shadow-gold transition-transform active:scale-95">
            <TrebleClef className="h-5 w-5" />
          </button>
          <Button size="icon" variant="ghost" aria-label={t("prev")} onClick={p.prev}><SkipBack className="rtl:rotate-180" /></Button>
          <button aria-label={p.error ? t("retry") : p.playing ? t("pause") : t("play")} onClick={p.toggle} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground shadow-gold transition-transform active:scale-95">
            {p.error ? <RotateCw className="h-5 w-5" /> : p.playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 translate-x-px" fill="currentColor" />}
          </button>
          <Button size="icon" variant="ghost" aria-label={t("next")} onClick={p.next}><SkipForward className="rtl:rotate-180" /></Button>
          <Button size="icon" variant="ghost" aria-label={t("nextSurah")} title={t("nextSurah")} onClick={p.nextSurah}><ChevronsRight className="rtl:rotate-180" /></Button>
          <Button size="icon" variant="ghost" aria-label={t("close")} onClick={p.stop} className="hidden sm:inline-flex"><X /></Button>
        </div>
        <div className="relative h-1 bg-foreground/10"><div className="h-full bg-gold transition-[width]" style={{ width: `${p.progress * 100}%` }} /></div>
      </div>
    </div>
    {open && <FullPlayer onClose={() => setOpen(false)} key={reciterId} />}
    {recitersOpen && <RecitersOverlay onClose={() => setRecitersOpen(false)} />}
  </>;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function FullPlayer({ onClose }: { onClose: () => void }) {
  const { p, tr, photo, reciterName, reciterId } = useNowPlaying();
  const { t, num, lang } = useT();
  const navigate = useNavigate();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [aaOpen, setAaOpen] = useState(false);
  const [sleep, setSleep] = useState(0);
  const stopRef = useRef(p);
  stopRef.current = p;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  useEffect(() => {
    if (!sleep) return;
    const id = window.setTimeout(() => { stopRef.current.stop(); setSleep(0); onClose(); }, sleep * 60000);
    return () => window.clearTimeout(id);
  }, [sleep, onClose]);
  const dl = useDownload(tr?.s ?? 1, lang, reciterId);
  const fav = useStore((st) => (st.favoriteSurahs[reciterId] ?? []).includes(tr?.s ?? 0));
  const key = tr ? `${tr.s}:${tr.a}` : "";
  const bm = useStore((x) => x.bookmarks.includes(key));
  if (!tr) return null;
  const s = surah(tr.s);
  const speeds = [0.75, 1, 1.25, 1.5, 2];

  const share = () => {
    const text = `${surahName(s, lang)} ${tr.s}:${tr.a} — CoranProFree`;
    if (navigator.share) { navigator.share({ text }).catch(() => {}); }
    else { navigator.clipboard.writeText(text).then(() => toast.success(t("copied"))).catch(() => {}); }
  };
  return <div role="dialog" aria-modal="true" aria-label={t("nowPlaying")} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background animate-in fade-in slide-in-from-bottom-8 duration-300">
    <Backdrop photo={photo} />
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" aria-label={t("close")} onClick={onClose}><ChevronDown className="h-6 w-6" /></Button>
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {p.playing && <Music2 className="h-3.5 w-3.5 text-gold" />}{t("nowPlaying")}
        </span>
        <Button size="icon" variant="ghost" aria-label={t("close")} onClick={() => { p.stop(); onClose(); }}><X /></Button>
      </div>

      <div className="mt-6 grid place-items-center">
        <div className="relative aspect-square w-full max-w-[16rem] overflow-hidden rounded-[2rem] border border-gold/30 bg-card shadow-gold">
          {photo ? <img src={photo} alt={reciterName} className="h-full w-full object-cover" /> : <div className="bg-hero h-full w-full" />}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-4 text-center">
            <p dir="rtl" className="font-quran text-3xl text-gold">{s.ar}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold">{num(tr.s)}. {surahName(s, lang)}</h2>
          <p dir="rtl" className="font-quran truncate text-lg text-gold">{s.ar.replace("سُورَةُ ", "")}</p>
          <p className="truncate text-muted-foreground">{reciterName}</p>
        </div>
        <SurahActions n={tr.s} favorite={fav} saved={dl.saved} busy={dl.busy} />
      </div>

      <div className="mt-6">
        <input type="range" min={0} max={p.duration || 0} step={1} value={p.currentTime} onChange={(e) => p.seekTo(Number(e.target.value))} aria-label={t("progress")} className="h-1.5 w-full cursor-pointer accent-gold" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(p.currentTime)}</span>
          <span>{t("ayah")} {num(tr.a)}</span>
          <span>{formatTime(p.duration)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button size="icon" variant="ghost" aria-label={t("back10")} title={t("back10")} onClick={() => p.seek(-10)}><RotateCcw className="h-5 w-5" /></Button>
        <Button size="icon" variant="ghost" aria-label={t("prev")} onClick={p.prev} className="h-12 w-12"><SkipBack className="h-6 w-6 rtl:rotate-180" fill="currentColor" /></Button>
        <button aria-label={p.error ? t("retry") : p.playing ? t("pause") : t("play")} onClick={p.toggle} className="grid h-20 w-20 place-items-center rounded-full bg-gold text-gold-foreground shadow-gold transition-transform active:scale-95">
          {p.error ? <RotateCw className="h-8 w-8" /> : p.playing ? <Pause className="h-8 w-8" fill="currentColor" /> : <Play className="h-8 w-8 translate-x-0.5" fill="currentColor" />}
        </button>
        <Button size="icon" variant="ghost" aria-label={t("next")} onClick={p.next} className="h-12 w-12"><SkipForward className="h-6 w-6 rtl:rotate-180" fill="currentColor" /></Button>
        <Button size="icon" variant="ghost" aria-label={t("fwd10")} title={t("fwd10")} onClick={() => p.seek(10)}><RotateCw className="h-5 w-5" /></Button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button aria-label={t("speed")} title={t("speed")} onClick={() => p.setSpeed(speeds[(speeds.indexOf(p.speed) + 1) % speeds.length] ?? 1)} className="grid h-10 min-w-14 place-items-center rounded-full border px-3 text-sm font-semibold transition-colors hover:bg-card">{p.speed}×</button>
        <button aria-label={t("moreOptions")} title={t("moreOptions")} onClick={() => setOptionsOpen(true)} className="grid h-10 min-w-14 place-items-center rounded-full border px-3 transition-colors hover:bg-card"><MoreHorizontal className="h-5 w-5" /></button>
      </div>

      <div className="mt-auto flex items-center justify-around border-t pt-4">
        <button aria-label={t("search")} title={t("search")} onClick={() => { onClose(); void navigate({ to: "/search" }); }} className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"><Search className="h-5 w-5" /></button>
        <button aria-label={t("bookmark")} title={t("bookmark")} aria-pressed={bm} onClick={() => setState((st) => ({ bookmarks: toggleIn(st.bookmarks, key) }))} className={`grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-card ${bm ? "text-gold" : "text-muted-foreground hover:text-foreground"}`}><Bookmark className="h-5 w-5" fill={bm ? "currentColor" : "none"} /></button>
        <button aria-label={t("typography")} title={t("typography")} onClick={() => setAaOpen(true)} className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"><Type className="h-5 w-5" /></button>
        <button aria-label={t("surahs")} title={t("surahs")} onClick={() => { onClose(); void navigate({ to: "/mushaf/$page", params: { page: "1" } }); }} className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"><Headphones className="h-5 w-5" /></button>
      </div>
    </div>

    {optionsOpen && <OptionsSheet sleep={sleep} setSleep={setSleep} onShare={share} onClose={() => setOptionsOpen(false)} />}
    {aaOpen && <AaPanel onClose={() => setAaOpen(false)} />}
  </div>;
}

function OptionsSheet({ sleep, setSleep, onShare, onClose }: { sleep: number; setSleep: (n: number) => void; onShare: () => void; onClose: () => void }) {
  const { t } = useT();
  const p = usePlayer();
  const shuffle = useStore((s) => s.playlistShuffle);
  const order = ["off", "ayah", "surah"] as const;
  const repeatLabel = t(p.repeat === "off" ? "repeatOff" : p.repeat === "ayah" ? "repeatAyah" : "repeatSurah");
  const sleepSteps = [0, 5, 10, 15, 30];
  const sleepLabel = sleep === 0 ? t("repeatOff") : `${sleep} min`;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/20" />
        <div className="space-y-1">
          <button onClick={() => setState((s) => ({ playlistShuffle: !s.playlistShuffle }))} aria-pressed={shuffle} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm hover:bg-background/40">
            <Shuffle className={`h-5 w-5 ${shuffle ? "text-gold" : "text-muted-foreground"}`} />
            <span className="flex-1">{t("shufflePlaylist")}</span>
          </button>
          <button onClick={() => p.setRepeat(order[(order.indexOf(p.repeat) + 1) % 3] ?? "off")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm hover:bg-background/40">
            <Repeat className={`h-5 w-5 ${p.repeat !== "off" ? "text-gold" : "text-muted-foreground"}`} />
            <span className="flex-1">{t("repeat")}</span>
            <span className="text-xs text-muted-foreground">{repeatLabel}</span>
          </button>
          <button onClick={() => setSleep(sleepSteps[(sleepSteps.indexOf(sleep) + 1) % sleepSteps.length] ?? 0)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm hover:bg-background/40">
            <Timer className={`h-5 w-5 ${sleep ? "text-gold" : "text-muted-foreground"}`} />
            <span className="flex-1">{t("sleepTimer")}</span>
            <span className="text-xs text-muted-foreground">{sleepLabel}</span>
          </button>
          <button onClick={onShare} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm hover:bg-background/40">
            <Share2 className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1">{t("share")}</span>
          </button>
        </div>
        <Button variant="outline" className="mt-3 w-full" onClick={onClose}>{t("close")}</Button>
      </div>
    </div>
  );
}

function AaPanel({ onClose }: { onClose: () => void }) {
  const { t, num } = useT();
  const fontSize = useStore((s) => s.fontSize);
  const trSize = useStore((s) => s.translationSize);
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/20" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("typography")}</h2>
          <Button size="icon" variant="ghost" aria-label={t("close")} onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{t("fontSize")}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setState((s) => ({ fontSize: Math.max(20, s.fontSize - 2) }))}>−</Button>
              <span className="min-w-9 text-center text-sm font-semibold">{num(fontSize)}</span>
              <Button size="sm" variant="outline" onClick={() => setState((s) => ({ fontSize: Math.min(48, s.fontSize + 2) }))}>+</Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{t("translationSize")}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setState((s) => ({ translationSize: Math.max(12, s.translationSize - 1) }))}>−</Button>
              <span className="min-w-9 text-center text-sm font-semibold">{num(trSize)}</span>
              <Button size="sm" variant="outline" onClick={() => setState((s) => ({ translationSize: Math.min(28, s.translationSize + 1) }))}>+</Button>
            </div>
          </div>
        </div>
        <Button variant="outline" className="mt-4 w-full" onClick={onClose}>{t("close")}</Button>
      </div>
    </div>
  );
}

function RecitersOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={t("changeReciter")} className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t("changeReciter")}</h2>
          <Button size="icon" variant="ghost" aria-label={t("close")} onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="mt-4">
          <ReciterPicker vertical onSelect={onClose} />
        </div>
      </div>
    </div>
  );
}
