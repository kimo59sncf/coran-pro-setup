import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff, History, Mic, Square, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SURAHS, surahName, surahQuery } from "@/lib/quran";
import { setState, useStore, type SessionRecord } from "@/lib/store";
import { alignRecitation, splitWords } from "@/lib/recitation";
import { HIZB_START, JUZ_START, hizbOf, juzOf } from "@/lib/mushaf";
import { feedback } from "@/lib/feedback";

const arNum = (n: number) => n.toLocaleString("ar-EG");
const WORD_COLOR: Record<string, string> = {
  correct: "text-success",
  close: "text-gold",
  wrong: "text-destructive",
  missed: "text-orange-400",
};

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
  const [showHistory, setShowHistory] = useState(false);
  const [lastReport, setLastReport] = useState<SessionRecord | null>(null);
  const q = useQuery(surahQuery(s, lang, reciter));
  const srRef = useRef<{ stop: () => void } | null>(null);
  const stoppedRef = useRef(true);
  const consumedRef = useRef(0);
  const resultCountRef = useRef(0);
  const sessionRef = useRef({ start: Date.now(), from: 1, to: 1, correct: 0, close: 0, wrong: 0, missed: 0, completed: 0 });
  const prevStatusRef = useRef<Record<number, string>>({});
  const ayahRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sessions = useStore((st) => st.sessions);
  const memorizedAyahs = useStore((st) => st.memorizedAyahs);

  const ayah = q.data?.find((x) => x.n === focus);
  const words = useMemo(() => (ayah ? splitWords(ayah.ar) : []), [ayah]);
  const results = useMemo(() => alignRecitation(words, heard), [words, heard]);

  const info = SURAHS[s - 1];
  const total = q.data?.length ?? info?.ayahs ?? 0;

  // Reset on surah change (focus is set explicitly by the selectors/jump).
  useEffect(() => { setHeard(""); setManualReveal(new Set()); setErr(null); }, [s]);
  // Scroll to the focus ayah when it changes (Juz/Hizb/Surah selection or advance).
  useEffect(() => {
    const el = ayahRefs.current[focus];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus, s, q.data]); // eslint-disable-line react-hooks/exhaustive-deps
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
      resultCountRef.current = e.results.length;
      let text = "";
      for (let i = consumedRef.current; i < e.results.length; i++) text += e.results[i][0].transcript;
      setHeard(text);
    };
    r.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") { setErr(t("micDenied")); setListening(false); }
    };
    r.onend = () => {
      if (!stoppedRef.current && srRef.current === r) {
        consumedRef.current = 0;
        resultCountRef.current = 0;
        setHeard("");
        try { r.start(); } catch { /* ignore */ }
      }
    };
    srRef.current = r;
    try { r.start(); } catch { setErr(t("micDenied")); setListening(false); }
  };

  const startRecite = () => {
    setHeard("");
    setErr(null);
    stoppedRef.current = false;
    consumedRef.current = 0;
    resultCountRef.current = 0;
    sessionRef.current = { start: Date.now(), from: focus, to: focus, correct: 0, close: 0, wrong: 0, missed: 0, completed: 0 };
    prevStatusRef.current = {};
    setListening(true);
    startSR();
  };

  const stopRecite = () => {
    stoppedRef.current = true;
    srRef.current?.stop();
    srRef.current = null;
    setListening(false);
    saveSession();
  };

  const advance = (d: number) => {
    const next = Math.min(total, Math.max(1, focus + d));
    if (next === focus) return;
    // Consume the results so far (current ayah) and keep the SAME recognition
    // session running: the next words belong to the new ayah, with no restart gap.
    consumedRef.current = resultCountRef.current;
    setFocus(next);
    setHeard("");
  };

  const toggleReveal = (n: number) => setManualReveal((prev) => {
    const next = new Set(prev);
    if (next.has(n)) next.delete(n); else next.add(n);
    return next;
  });

  const saveSession = () => {
    const rec = sessionRef.current;
    const totalWords = rec.correct + rec.close + rec.wrong + rec.missed;
    if (totalWords === 0 && rec.completed === 0) return;
    const record: SessionRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: Date.now(),
      surah: s,
      from: rec.from,
      to: Math.max(rec.to, rec.from),
      correct: rec.correct,
      close: rec.close,
      wrong: rec.wrong,
      missed: rec.missed,
      seconds: Math.round((Date.now() - rec.start) / 1000),
    };
    setState((st) => ({ sessions: [...st.sessions, record].slice(-500) }));
    setLastReport(record);
    sessionRef.current = { start: Date.now(), from: focus, to: focus, correct: 0, close: 0, wrong: 0, missed: 0, completed: 0 };
  };

  // Feedback (sound/vibration) + session counters on word status transitions.
  useEffect(() => {
    results.forEach((r, i) => {
      const prev = prevStatusRef.current[i];
      if (prev === r.status) return;
      prevStatusRef.current[i] = r.status;
      if (r.status === "correct") { sessionRef.current.correct++; feedback("correct"); }
      else if (r.status === "close") sessionRef.current.close++;
      else if (r.status === "wrong") { sessionRef.current.wrong++; feedback("wrong"); }
      else if (r.status === "missed") sessionRef.current.missed++;
    });
  }, [results]);

  // Auto-advance to the next ayah once the current one is fully recited correctly.
  useEffect(() => {
    if (!listening || !results.length) return;
    const done = results.every((r) => r.status === "correct" || r.status === "close");
    if (!done) return;
    // Keep the correctly recited ayah revealed and mark it memorized.
    setManualReveal((prev) => { const next = new Set(prev); next.add(focus); return next; });
    const key = `${s}:${focus}`;
    setState((st) => (st.memorizedAyahs.includes(key) ? {} : { memorizedAyahs: [...st.memorizedAyahs, key] }));
    sessionRef.current.completed++;
    sessionRef.current.to = focus;
    feedback("done");
    if (focus >= total) { stopRecite(); return; }
    advance(1);
  }, [results, listening, focus, total]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-4">
      <div className="px-5 pb-3 pt-6">
        <div className="flex items-center gap-2">
          <select value={s} onChange={(e) => { saveSession(); setS(Number(e.target.value)); setFocus(1); }} aria-label={t("surah")} className="min-h-11 min-w-0 flex-1 rounded-xl border bg-card px-3 text-sm">
            {SURAHS.map((x) => <option key={x.n} value={x.n}>{num(x.n)}. {surahName(x, lang)}</option>)}
          </select>
          <button onClick={() => (listening ? stopRecite() : startRecite())} aria-label={listening ? t("stopReciting") : t("startReciting")} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${listening ? "bg-destructive text-destructive-foreground" : "bg-gold text-gold-foreground"}`}>
            {listening ? <Square className="h-5 w-5" fill="currentColor" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <select value={juzOf(s, focus)} onChange={(e) => { saveSession(); const [js, ja] = JUZ_START[Number(e.target.value) - 1]!; setS(js); setFocus(ja); }} aria-label={t("juz")} className="min-h-11 min-w-0 flex-1 rounded-xl border bg-card px-3 text-sm">
            {JUZ_START.map((_, i) => <option key={i} value={i + 1}>{t("juz")} {num(i + 1)}</option>)}
          </select>
          <select value={hizbOf(s, focus)} onChange={(e) => { saveSession(); const [hs, ha] = HIZB_START[Number(e.target.value) - 1]!; setS(hs); setFocus(ha); }} aria-label={t("hizb")} className="min-h-11 min-w-0 flex-1 rounded-xl border bg-card px-3 text-sm">
            {HIZB_START.map((_, i) => <option key={i} value={i + 1}>{t("hizb")} {num(i + 1)}</option>)}
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("ayah")} {num(focus)} / {num(total)}</span>
          <button onClick={() => advance(-1)} className="chip"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("prev")}</button>
          <button onClick={() => advance(1)} className="chip">{t("nextAyah")} <ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
          <button onClick={() => setShowHistory(true)} className="chip"><History className="h-4 w-4" /> {t("history")}</button>
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
              <div key={a.n} ref={(el) => { ayahRefs.current[a.n] = el; }} className={`flex items-start gap-2 rounded-xl px-2 py-2 transition-colors ${isFocus ? "bg-gold/10" : ""}`}>
                <button onClick={() => toggleReveal(a.n)} aria-label={isRevealed ? t("hideAyah") : t("revealAyah")} title={isRevealed ? t("hideAyah") : t("revealAyah")} className={`mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border ${isRevealed ? "border-gold/60 text-gold" : "border-border text-muted-foreground"}`}>
                  {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {isFocus && !isRevealed ? (
                  <p dir="rtl" lang="ar" className="font-quran min-w-0 flex-1 text-right text-2xl leading-[2.2]">
                    {words.map((w, i) => {
                      const st = results[i]?.status ?? "pending";
                      const revealed = st !== "pending";
                      return <span key={i} className={revealed ? (WORD_COLOR[st] ?? "") : "select-none blur-[5px]"}>{w} </span>;
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

      {lastReport && <SessionReport record={lastReport} onClose={() => setLastReport(null)} />}
      {showHistory && <HistorySheet sessions={sessions} memorized={memorizedAyahs.length} onClose={() => setShowHistory(false)} />}
    </div>
  );
}

function SessionReport({ record, onClose }: { record: SessionRecord; onClose: () => void }) {
  const { t, num, lang } = useT();
  const total = record.correct + record.close + record.wrong + record.missed;
  const score = total ? Math.round(((record.correct + record.close * 0.5) / total) * 100) : 0;
  const s = SURAHS[record.surah - 1];
  const mm = Math.floor(record.seconds / 60);
  const ss = String(record.seconds % 60).padStart(2, "0");
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/20" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("sessionReport")}</h2>
          <button onClick={onClose} aria-label={t("close")} className="grid h-9 w-9 place-items-center rounded-full border"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("surah")}</span><b>{num(record.surah)}. {s ? surahName(s, lang) : ""}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("ayahs")}</span><b>{num(record.from)} – {num(record.to)}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("result")}</span><b className="text-gold">{num(score)}%</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("st_correct")}</span><b className="text-success">{num(record.correct)}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("st_close")}</span><b className="text-gold">{num(record.close)}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("st_wrong")}</span><b className="text-destructive">{num(record.wrong)}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("st_missed")}</span><b>{num(record.missed)}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">⏱</span><b>{mm}:{ss}</b></div>
        </div>
        <button className="mt-4 w-full rounded-full border px-4 py-2 text-sm font-medium" onClick={onClose}>{t("close")}</button>
      </div>
    </div>
  );
}

function HistorySheet({ sessions, memorized, onClose }: { sessions: SessionRecord[]; memorized: number; onClose: () => void }) {
  const { t, num, lang } = useT();
  const [selected, setSelected] = useState<SessionRecord | null>(null);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const sessionDays = new Set(sessions.map((s) => new Date(s.date).toDateString()));
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const recent = [...sessions].reverse().slice(0, 60);

  const totalSeconds = sessions.reduce((a, s) => a + s.seconds, 0);
  const totalCorrect = sessions.reduce((a, s) => a + s.correct, 0);
  const totalClose = sessions.reduce((a, s) => a + s.close, 0);
  const totalWrong = sessions.reduce((a, s) => a + s.wrong, 0);
  const totalMissed = sessions.reduce((a, s) => a + s.missed, 0);
  const totalWords = totalCorrect + totalClose + totalWrong + totalMissed;
  const avgScore = totalWords ? Math.round(((totalCorrect + totalClose * 0.5) / totalWords) * 100) : 0;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={onClose}>
      <div className="mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/20" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("history")}</h2>
          <button onClick={onClose} aria-label={t("close")} className="grid h-9 w-9 place-items-center rounded-full border"><X className="h-5 w-5" /></button>
        </div>

        {/* Global summary */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">{t("sessions")}</div><b className="text-lg">{num(sessions.length)}</b></div>
          <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">{t("memorizedCount")}</div><b className="text-lg text-gold">{num(memorized)}</b></div>
          <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">{t("result")}</div><b className="text-lg text-gold">{num(avgScore)}%</b></div>
          <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">⏱</div><b className="text-lg">{Math.floor(totalSeconds / 60)} min</b></div>
          <div className="col-span-2 rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">{t("toReview")}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="text-success">{num(totalCorrect)} {t("st_correct")}</span>
              <span className="text-gold">{num(totalClose)} {t("st_close")}</span>
              <span className="text-destructive">{num(totalWrong)} {t("st_wrong")}</span>
              <span className="text-orange-400">{num(totalMissed)} {t("st_missed")}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="text-muted-foreground">{d}</span>)}
          {cells.map((d, i) => {
            if (d == null) return <span key={`e${i}`} />;
            const has = sessionDays.has(new Date(year, month, d).toDateString());
            return (
              <span key={i} className={`grid h-8 place-items-center rounded-lg ${has ? "bg-gold font-semibold text-gold-foreground" : ""}`}>
                {num(d)}
              </span>
            );
          })}
        </div>

        <div className="mt-4 space-y-1">
          {recent.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{t("noResults")}</p>}
          {recent.map((rec) => {
            const s = SURAHS[rec.surah - 1];
            const date = new Date(rec.date).toLocaleDateString(lang === "ar" ? "ar" : lang, { day: "numeric", month: "short" });
            const total = rec.correct + rec.close + rec.wrong + rec.missed;
            const score = total ? Math.round(((rec.correct + rec.close * 0.5) / total) * 100) : 0;
            return (
              <button key={rec.id} onClick={() => setSelected(rec)} className="flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm hover:bg-card/60">
                <span className="text-xs text-muted-foreground">{date}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{num(rec.surah)}. {s ? surahName(s, lang) : ""}</span>
                <span className="text-xs text-muted-foreground">{num(rec.from)}–{num(rec.to)}</span>
                <b className="text-gold">{num(score)}%</b>
              </button>
            );
          })}
        </div>
        <button className="mt-4 w-full rounded-full border px-4 py-2 text-sm font-medium" onClick={onClose}>{t("close")}</button>
      </div>

      {selected && <SessionReport record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
