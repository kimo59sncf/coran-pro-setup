import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { MushafFlow } from "@/components/MushafFlow";
import { useT } from "@/lib/i18n";
import { usePlayer } from "@/lib/player-context";
import { surahQuery } from "@/lib/quran";
import { useStore } from "@/lib/store";

/** Home "live reading" panel: the current surah scrolls in sync with the audio. */
export function SyncedReader({ surah }: { surah?: number }) {
  const { t } = useT();
  const p = usePlayer();
  const lang = useStore((s) => s.lang);
  const reciter = useStore((s) => s.reciter);
  const fontSize = useStore((s) => s.fontSize);
  const lastRead = useStore((s) => s.lastRead);
  const lastListen = useStore((s) => s.lastListen);

  const track = p.queue[p.index];
  const active = track && (!surah || track.s === surah) ? track : null;
  const target = active ?? (surah ? { s: surah, a: 1 } : lastListen ?? lastRead ?? { s: 1, a: 1 });
  const current = active ? active.a : target.a;

  const q = useQuery(surahQuery(target.s, lang, reciter));

  const onPlay = (a: number) => {
    const ayahs = q.data;
    if (!ayahs) return;
    const tracks = ayahs.map((x) => ({ s: target.s, a: x.n, url: x.audio }));
    const idx = Math.max(0, ayahs.findIndex((x) => x.n === a));
    p.playQueue(tracks, idx);
  };

  return (
    <section className="mx-3 mt-5">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/15 text-gold"><BookOpen className="h-4 w-4" /></span>
        <h2 className="text-lg font-semibold">{t("syncedReading")}</h2>
        {active && p.playing && (
          <span className="ms-auto flex items-end gap-0.5 text-gold" aria-label={t("nowPlaying")}>
            <span className="eq-bar" /><span className="eq-bar" style={{ animationDelay: "150ms" }} /><span className="eq-bar" style={{ animationDelay: "300ms" }} />
          </span>
        )}
      </div>
      {q.isPending && <div className="mushaf-frame flex min-h-[40vh] items-center justify-center text-muted-foreground">{t("loading")}</div>}
      {q.isError && (
        <div className="mushaf-frame flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("error")}</p>
          <button onClick={() => q.refetch()} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">{t("retry")}</button>
        </div>
      )}
      {q.data && <MushafFlow s={target.s} ayahs={q.data} current={current} onPlay={onPlay} fontSize={fontSize} />}
    </section>
  );
}
