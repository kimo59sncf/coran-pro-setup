import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Mic, Square } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SURAHS, surahName, surahQuery } from "@/lib/quran";
import { useStore } from "@/lib/store";
import { alignRecitation, splitWords } from "@/lib/recitation";

const arNum = (n: number) => n.toLocaleString("ar-EG");

/**
 * Memorization mushaf: the whole surah is shown with each ayah blurred by
 * default. The user reveals ayahs manually (eye) or they auto-reveal in sync
 * with the audio (ayah-by-ayah, since audio is per ayah — no word timing).
 */
export function MemorizeMushaf() {
  const { t, num, lang } = useT();
  const reciter = useStore((s) => s.reciter);
  const [s, setS] = useState(1);
  const [focus, setFocus] = useState(1);
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [manualReveal, setManualReveal] = useState<Set<number>>(new Set());
  const q = useQuery(surahQuery(s, lang, reciter));
  const srRef = useRef<{ stop: () => void } | null>(null);
  const stoppedRef = useRef(true);

  const ayah = q.data?.find((x) => x.n === focus);
  const words = useMemo(() => (ayah ? splitWords(ayah.ar) : []), [ayah]);
  const results = useMemo(() => alignRecitation(words, heard), [words, heard]);

  const info = SURAHS[s - 1];
  const total = q.data?.length ?? info?.ayahs ?? 0;

  // Reset on surah change.
  useEffect(() => { setFocus(1); setHeard(""); setManualReveal(new Set()); setErr(null); }, [s]);
  // Cleanup on unmount.
  useEffect(() => () => { stoppedRef.current = true; srRef.current?.stop(); }, []);

  const startSR = () => {
    const SR = (typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null);
    if (!SR) { setErr(t("micDenied")); setListening(false); return; }
    const r = new SR();
    r.lang = "ar-SA";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      if (stoppedRef.current) return;
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      setHeard(text);
    };
    r.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") { setErr(t("micDenied")); setListening(false); }
    };
    r.onend = () => { if (!stoppedRef.current && srRef.current === r) { try { r.start(); } catch { /* ignore */ } } };
    srRef.current = r;
    try { r.start(); } catch { setErr(t("micDenied")); setListening(false); }
  };

  const startRecite = () => {
    setHeard("");
    setErr(null);
    stoppedRef.current = false;
    setListening(true);
    startSR();
  };

  const stopRecite = () => {
    stoppedRef.current = true;
    srRef.current?.stop();
    srRef.current = null;
    setListening(false);
  };

  const advance = (d: number) => {
    const next = Math.min(total, Math.max(1, focus + d));
    if (next === focus) return;
    const keepListening = listening && !stoppedRef.current;
    srRef.current?.stop();
    srRef.current = null;
    setFocus(next);
    setHeard("");
    if (keepListening) startSR();
  };

  const toggleReveal = (n: number) => setManualReveal((prev) => {
    const next = new Set(prev);
    if (next.has(n)) next.delete(n); else next.add(n);
    return next;
  });

  // Auto-advance to the next ayah once the current one is fully recited correctly.
  useEffect(() => {
    if (!listening || !results.length) return;
    const done = results.every((r) => r.status === "correct" || r.status === "close");
    if (!done) return;
    // Keep the correctly recited ayah revealed after moving on.
    setManualReveal((prev) => { const next = new Set(prev); next.add(focus); return next; });
    if (focus >= total) { stopRecite(); return; }
    const id = window.setTimeout(() => advance(1), 900);
    return () => window.clearTimeout(id);
  }, [results, listening, focus, total]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-4">
      <div className="px-5 pb-3 pt-6">
        <div className="flex items-center gap-2">
          <select value={s} onChange={(e) => setS(Number(e.target.value))} aria-label={t("surah")} className="min-h-11 min-w-0 flex-1 rounded-xl border bg-card px-3 text-sm">
            {SURAHS.map((x) => <option key={x.n} value={x.n}>{num(x.n)}. {surahName(x, lang)}</option>)}
          </select>
          <button onClick={() => (listening ? stopRecite() : startRecite())} aria-label={listening ? t("stopReciting") : t("startReciting")} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${listening ? "bg-destructive text-destructive-foreground" : "bg-gold text-gold-foreground"}`}>
            {listening ? <Square className="h-5 w-5" fill="currentColor" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("ayah")} {num(focus)} / {num(total)}</span>
          <button onClick={() => advance(-1)} className="chip"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("prev")}</button>
          <button onClick={() => advance(1)} className="chip">{t("nextAyah")} <ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
          {listening && <span className="text-xs text-gold">{t("listening")}…</span>}
          {err && <span className="text-xs text-destructive">{err}</span>}
        </div>
      </div>

      <div className="mushaf-frame mx-3">
        <div className="mushaf-inner">
          {q.isLoading && <p className="p-6 text-center text-muted-foreground">{t("loading")}</p>}
          {q.isError && <p className="p-6 text-center text-destructive">{t("error")}</p>}
          {q.data?.map((a) => {
            const isFocus = a.n === focus;
            const isRevealed = manualReveal.has(a.n);
            return (
              <div key={a.n} className={`flex items-start gap-2 rounded-xl px-2 py-2 transition-colors ${isFocus ? "bg-gold/10" : ""}`}>
                <button onClick={() => toggleReveal(a.n)} aria-label={isRevealed ? t("hideAyah") : t("revealAyah")} title={isRevealed ? t("hideAyah") : t("revealAyah")} className={`mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border ${isRevealed ? "border-gold/60 text-gold" : "border-border text-muted-foreground"}`}>
                  {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {isFocus && !isRevealed ? (
                  <p dir="rtl" lang="ar" className="font-quran min-w-0 flex-1 text-right text-2xl leading-[2.2]">
                    {words.map((w, i) => {
                      const st = results[i]?.status ?? "pending";
                      const revealed = st === "correct" || st === "close";
                      return <span key={i} className={revealed ? "" : "select-none blur-[5px]"}>{w} </span>;
                    })}
                    <span className="text-gold">﴿{arNum(a.n)}﴾</span>
                  </p>
                ) : (
                  <p dir="rtl" lang="ar" className={`font-quran min-w-0 flex-1 text-right text-2xl leading-[2.2] ${isRevealed ? "" : "select-none blur-[5px]"}`}>
                    {a.ar} <span className="text-gold">﴿{arNum(a.n)}﴾</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
