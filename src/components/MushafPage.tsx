import { Fragment } from "react";
import type { PageAyah } from "@/lib/mushaf";
import { surah } from "@/lib/quran";
import { useT } from "@/lib/i18n";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const arNum = (n: number) => n.toLocaleString("ar-EG");

export type ActiveAyah = { s: number; a: number };

export function MushafPage({ page, ayahs, fontSize, active, onPlay }: {
  page: number;
  ayahs: PageAyah[];
  fontSize: number;
  active?: ActiveAyah | null;
  onPlay: (s: number, a: number) => void;
}) {
  const { t, num, lang } = useT();
  if (!ayahs.length) return null;

  // A page can straddle two surahs; split into contiguous segments.
  const segments: { s: number; items: PageAyah[] }[] = [];
  for (const a of ayahs) {
    const last = segments[segments.length - 1];
    if (last && last.s === a.s) last.items.push(a);
    else segments.push({ s: a.s, items: [a] });
  }
  const juz = ayahs[0]!.juz;

  return (
    <div className="mushaf-frame min-h-[62vh]">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[11px] font-semibold text-gold/90">
          {t("juz")} {num(juz)}
        </span>
        <span className="text-[11px] text-muted-foreground">{t("page")} {num(page)}</span>
      </div>

      <div className="mushaf-inner">
        <div dir="rtl" lang="ar" className="font-quran text-right" style={{ fontSize, lineHeight: 2.1 }}>
          {segments.map((seg) => {
            const startsHere = seg.items[0]!.n === 1;
            const st = surah(seg.s);
            return (
              <Fragment key={seg.s}>
                {startsHere && (
                  <div className="mushaf-surah-banner" dir="rtl">
                    <span className="font-quran text-xl leading-none text-gold">{st.ar.replace("سُورَةُ ", "")}</span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {lang === "en" ? st.en : st.tr} · {t(st.type === "Meccan" ? "meccan" : "medinan")}
                    </span>
                  </div>
                )}
                {startsHere && seg.s !== 1 && seg.s !== 9 && (
                  <div dir="rtl" className="font-quran mb-3 text-center text-[0.85em] leading-relaxed text-primary">{BASMALA}</div>
                )}
                {seg.items.map((a) => {
                  const isActive = active?.s === a.s && active?.a === a.n;
                  return (
                    <span
                      key={a.n}
                      role="button"
                      tabIndex={0}
                      dir="rtl"
                      onClick={() => onPlay(a.s, a.n)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPlay(a.s, a.n); } }}
                      aria-label={`${t("ayah")} ${num(a.n)}`}
                      className={`cursor-pointer transition-colors ${isActive ? "text-gold" : ""}`}
                    >
                      {a.ar}
                      <span className="mushaf-ayah-num" aria-hidden>{arNum(a.n)}</span>
                    </span>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-gold/50 text-xs font-semibold text-gold">{arNum(page)}</span>
      </div>
    </div>
  );
}
