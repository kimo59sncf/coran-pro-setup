import { Fragment, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpenText, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { MushafPage, type ActiveAyah } from "@/components/MushafPage";
import { Button } from "@/components/ui/button";
import { JUZ_START_PAGE, SURAH_START_PAGE, juzAtPage, mushafPageQuery, surahAtPage, type PageAyah } from "@/lib/mushaf";
import { SURAHS, surahName, surahQuery } from "@/lib/quran";
import { useT } from "@/lib/i18n";
import { usePlayer } from "@/lib/player-context";
import { setState, useStore } from "@/lib/store";

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

export function MushafReader({ page }: { page: number }) {
  const { t, num } = useT();
  const p = usePlayer();
  const qc = useQueryClient();
  const reciter = useStore((s) => s.reciter);
  const lang = useStore((s) => s.lang);
  const fontSize = useStore((s) => s.fontSize);
  const wide = useIsWide();

  const navigate = useNavigate();
  const go = (target: number) => {
    const clamped = Math.min(604, Math.max(1, target));
    navigate({ to: "/mushaf/$page", params: { page: String(clamped) } });
  };

  useEffect(() => {
    setState((s) => (s.lastPage === page ? {} : { lastPage: page }));
  }, [page]);

  const track = p.queue[p.index];
  const active: ActiveAyah | null = track ? { s: track.s, a: track.a } : null;

  const onPlay = async (s: number, a: number) => {
    const ayahs = await qc.fetchQuery(surahQuery(s, lang, reciter));
    const tracks = ayahs.map((x) => ({ s, a: x.n, url: x.audio }));
    const idx = Math.max(0, ayahs.findIndex((x) => x.n === a));
    p.playQueue(tracks, idx);
  };

  const isOdd = page % 2 === 1;
  const rightPage = isOdd ? page : page - 1; // odd page (right-hand side of an open book)
  const leftPage = isOdd ? page + 1 : page; // even page (left-hand side)
  const pages = wide ? [leftPage, rightPage].filter((n) => n >= 1 && n <= 604) : [page];

  const step = wide ? 2 : 1;
  const prevPage = Math.max(1, page - step);
  const nextPage = Math.min(604, page + step);

  return (
    <div>
      <header className="flex items-center justify-between gap-2 px-4 pb-3 pt-6 sm:pt-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-gold"><BookOpenText className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-semibold leading-tight">{t("mushaf")}</h1>
            <p className="text-xs text-muted-foreground">{t("page")} {num(page)} / {num(604)}</p>
          </div>
        </div>
        {/* Arabic book: reading advances leftward. Next points left, previous points right. */}
        <div className="flex items-center gap-1" dir="ltr">
          <Link to="/mushaf/$page" params={{ page: String(nextPage) }} aria-label={t("next")} title={t("next")} className="grid h-9 w-9 place-items-center rounded-full border transition-colors hover:bg-card"><ChevronLeft className="h-5 w-5" /></Link>
          <Link to="/mushaf/$page" params={{ page: String(prevPage) }} aria-label={t("prev")} title={t("prev")} className="grid h-9 w-9 place-items-center rounded-full border transition-colors hover:bg-card"><ChevronRight className="h-5 w-5" /></Link>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2 px-4">
        <select
          aria-label={t("surah")}
          value={surahAtPage(page)}
          onChange={(e) => go(SURAH_START_PAGE[Number(e.target.value) - 1] ?? 1)}
          className="min-w-0 flex-1 rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:flex-none"
        >
          {SURAHS.map((s) => (
            <option key={s.n} value={s.n}>{num(s.n)}. {surahName(s, lang)}</option>
          ))}
        </select>
        <select
          aria-label={t("juz")}
          value={juzAtPage(page)}
          onChange={(e) => go(JUZ_START_PAGE[Number(e.target.value) - 1] ?? 1)}
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
            <option key={j} value={j}>{t("juz")} {num(j)}</option>
          ))}
        </select>
        <select
          aria-label={t("page")}
          value={page}
          onChange={(e) => go(Number(e.target.value))}
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {Array.from({ length: 604 }, (_, i) => i + 1).map((p) => (
            <option key={p} value={p}>{t("page")} {num(p)}</option>
          ))}
        </select>
      </div>

      <div className="flex items-stretch justify-center gap-2 px-3 pb-6 sm:gap-4">
        {pages.map((pg, i) => (
          <Fragment key={pg}>
            {wide && i === 1 && <div className="mushaf-binding" aria-hidden />}
            <div className={wide ? "w-1/2" : "w-full max-w-[560px]"}>
              <PageLoader page={pg} fontSize={fontSize} active={active} onPlay={onPlay} />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function PageLoader({ page, fontSize, active, onPlay }: {
  page: number;
  fontSize: number;
  active: ActiveAyah | null;
  onPlay: (s: number, a: number) => void;
}) {
  const { t } = useT();
  const q = useQuery(mushafPageQuery(page));
  if (q.isPending) {
    return <div className="mushaf-frame flex min-h-[62vh] items-center justify-center text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /></div>;
  }
  if (q.isError) {
    return (
      <div className="mushaf-frame flex min-h-[62vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">{t("error")}</p>
        <Button variant="outline" onClick={() => q.refetch()}>{t("retry")}</Button>
      </div>
    );
  }
  return <MushafPage page={page} ayahs={q.data as PageAyah[]} fontSize={fontSize} active={active} onPlay={onPlay} />;
}
