import { useState } from "react";
import { ChevronLeft, Download, Play, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { useT, type TKey } from "@/lib/i18n";
import { usePlayer } from "@/lib/player-context";
import { useDownload } from "@/lib/downloads";
import { SurahActions } from "@/components/LibraryControls";
import { RECITERS, RECITER_META, SURAHS, surah, surahName } from "@/lib/quran";
import { RECITER_PHOTOS } from "@/lib/reciter-photos";
import { useStore } from "@/lib/store";
import { saveAllSurahs } from "@/lib/offline";

/** Full-screen reciter view shown after picking a reciter. */
export function ReciterDetail({ onBack, onRead }: { onBack: () => void; onRead: (n: number) => void }) {
  const { t, lang } = useT();
  const reciter = useStore((s) => s.reciter);
  const lastRead = useStore((s) => s.lastRead);
  const player = usePlayer();
  const r = RECITERS.find((x) => x.id === reciter);
  const name = r ? (lang === "ar" ? r.ar : r.name) : reciter;
  const photo = RECITER_PHOTOS[reciter];
  const [imgFailed, setImgFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const meta = RECITER_META[reciter];

  const saveAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveAllSurahs(lang, reciter, () => {}, new AbortController().signal);
      toast.success(t("saved"));
    } catch {
      toast.error(t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className="bg-hero-premium relative m-3 overflow-hidden rounded-3xl px-5 py-7 text-center text-primary-foreground">
        <button onClick={onBack} aria-label={t("prev")} className="absolute start-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-foreground/10 transition-colors hover:bg-foreground/20">
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <span className="relative mx-auto block h-24 w-24 overflow-hidden rounded-full ring-2 ring-gold/70">
          {photo && !imgFailed
            ? <img src={photo} alt={name} width={96} height={96} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
            : <span className="grid h-full w-full place-items-center bg-accent font-display text-2xl font-semibold">{initials}</span>}
        </span>
        <h1 className="mt-3 text-2xl font-semibold">{name}</h1>
        <p className="mt-1 text-sm text-foreground/80">{t("reciter")}{meta?.riwaya ? ` · ${meta.riwaya}` : ""}</p>
        {meta?.categories?.length ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {meta.categories.map((c) => <span key={c} className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium">{t(`cat_${c}` as TKey)}</span>)}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button onClick={saveAll} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground/10 px-5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-foreground/20 disabled:opacity-50">
            <Download className="h-4 w-4" /> {saving ? t("saving") : t("saveAll")}
          </button>
          <button onClick={() => void player.playRandomSurah()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground/10 px-5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-foreground/20">
            <Shuffle className="h-4 w-4" /> {t("shuffle")}
          </button>
          <button onClick={() => onRead(lastRead?.s ?? 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-gold-foreground shadow-lg transition-transform hover:scale-[1.03]">
            <Play className="h-4 w-4" /> {t("play")}
          </button>
        </div>
      </header>

      <section className="surface mx-3 mt-2 overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-xl font-semibold">{t("surahs")}</h2>
        </div>
        <div className="pb-3">
          {SURAHS.map((s) => <ReciterSurahRow key={s.n} n={s.n} onRead={onRead} />)}
        </div>
      </section>
    </div>
  );
}

function ReciterSurahRow({ n, onRead }: { n: number; onRead: (n: number) => void }) {
  const { t, num, lang } = useT();
  const reciter = useStore((s) => s.reciter);
  const favorite = useStore((s) => (s.favoriteSurahs[s.reciter] ?? []).includes(n));
  const { saved, busy } = useDownload(n, lang, reciter);
  const s = surah(n);
  return (
    <div className="mx-2 my-1 flex items-center gap-x-1 rounded-2xl px-2 py-1 transition-colors hover:bg-card/70">
      <button onClick={() => onRead(n)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-start">
        <span className="w-6 shrink-0 text-center text-xs font-semibold text-gold">{num(n)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{surahName(s, lang)}</span>
          <span className="block truncate text-xs text-muted-foreground">{num(s.ayahs)} {t("ayahs")} · {t(s.type === "Meccan" ? "meccan" : "medinan")}</span>
        </span>
        <span dir="rtl" className="font-quran shrink-0 text-lg text-gold/80">{s.ar.replace("سُورَةُ ", "")}</span>
      </button>
      <SurahActions n={n} favorite={favorite} saved={saved} busy={busy} />
    </div>
  );
}
