import { useEffect, useRef } from "react";
import type { Ayah } from "@/lib/quran";
import { surah } from "@/lib/quran";
import { useT } from "@/lib/i18n";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const arNum = (n: number) => n.toLocaleString("ar-EG");

/**
 * Continuous, scrollable mushaf-style flow of one surah. The active ayah is
 * highlighted and the container scrolls to keep it centered (audio sync).
 */
export function MushafFlow({ s, ayahs, current, onPlay, fontSize }: {
  s: number;
  ayahs: Ayah[];
  current: number | null;
  onPlay: (a: number) => void;
  fontSize: number;
}) {
  const { t, num, lang } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<number, HTMLSpanElement | null>>({});

  useEffect(() => {
    if (current == null) return;
    const container = scrollRef.current;
    const el = refs.current[current];
    if (!container || !el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const top = container.scrollTop + (eRect.top - cRect.top) - container.clientHeight / 2 + eRect.height / 2;
    container.scrollTo({ top, behavior: "smooth" });
  }, [current, s]);

  const st = surah(s);

  return (
    <div className="mushaf-frame">
      <div ref={scrollRef} className="mushaf-inner max-h-[58vh] overflow-y-auto overscroll-contain">
        <div className="mushaf-surah-banner" dir="rtl">
          <span className="font-quran text-xl leading-none text-gold">{st.ar.replace("سُورَةُ ", "")}</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {lang === "en" ? st.en : st.tr} · {t(st.type === "Meccan" ? "meccan" : "medinan")}
          </span>
        </div>
        {s !== 1 && s !== 9 && (
          <div dir="rtl" className="font-quran mb-3 text-center text-[0.85em] leading-relaxed text-primary">{BASMALA}</div>
        )}
        <div dir="rtl" lang="ar" className="font-quran text-right" style={{ fontSize, lineHeight: 2.1 }}>
          {ayahs.map((a) => {
            const isActive = current === a.n;
            return (
              <span
                key={a.n}
                ref={(el) => { refs.current[a.n] = el; }}
                role="button"
                tabIndex={0}
                dir="rtl"
                onClick={() => onPlay(a.n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPlay(a.n); } }}
                aria-label={`${t("ayah")} ${num(a.n)}`}
                className={`cursor-pointer transition-colors ${isActive ? "mushaf-ayah-active text-gold" : ""}`}
              >
                {a.ar}
                <span className="mushaf-ayah-num" aria-hidden>{arNum(a.n)}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
