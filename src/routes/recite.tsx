import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Mic, Square, RotateCcw, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { SURAHS, surah, surahName, surahQuery } from "@/lib/quran";
import { accuracy, alignRecitation, splitWords, type WordResult } from "@/lib/recitation";
import { startRecorder, type Recorder } from "@/lib/recorder";
import { apiOrigin } from "@/lib/platform";

type Search = { s?: number; a?: number };

export const Route = createFileRoute("/recite")({
  validateSearch: (q: Record<string, unknown>): Search => ({
    s: Number(q.s) >= 1 && Number(q.s) <= 114 ? Number(q.s) : undefined,
    a: Number(q.a) >= 1 ? Number(q.a) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Récitation guidée — CoranProFree" },
      { name: "description", content: "Récitez un verset, l'app écoute votre voix en direct et signale les erreurs mot par mot." },
      { property: "og:title", content: "Récitation guidée — CoranProFree" },
      { property: "og:description", content: "Reconnaissance vocale de la récitation et détection d'erreurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecitePage,
});

const MAX_SECONDS = 60;
const STYLE: Record<WordResult["status"], string> = {
  pending: "text-foreground/45",
  correct: "text-success",
  close: "text-gold underline decoration-gold/60 decoration-wavy underline-offset-8",
  wrong: "text-destructive underline decoration-destructive decoration-wavy underline-offset-8",
  missed: "text-destructive/70 line-through decoration-destructive/70",
};

async function transcribe(file: File, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${apiOrigin()}/api/public/recite-transcribe`, { method: "POST", body: form, signal: signal ?? null });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Erreur ${res.status}`), { status: res.status });
  return body.text ?? "";
}

function RecitePage() {
  const { t, num, lang } = useT();
  const reciter = useStore((s) => s.reciter);
  const search = Route.useSearch();
  const [s, setS] = useState(search.s ?? 1);
  const [a, setA] = useState(search.a ?? 1);
  const q = useQuery(surahQuery(s, lang, reciter));
  const ayah = q.data?.find((x) => x.n === a);
  const words = useMemo(() => (ayah ? splitWords(ayah.ar) : []), [ayah]);

  const [phase, setPhase] = useState<"idle" | "listening" | "analyzing" | "done">("idle");
  const [heard, setHeard] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<Recorder | null>(null);
  const busy = useRef(false);
  const stopped = useRef(true);
  const abort = useRef<AbortController | null>(null);

  const results = useMemo(() => alignRecitation(words, heard, phase === "done"), [words, heard, phase]);
  const score = accuracy(results);
  const reached = results.filter((r) => r.status !== "pending").length;

  const reset = () => { setHeard(""); setErr(null); setPhase("idle"); setElapsed(0); };
  useEffect(() => { void stop(true); reset(); }, [s, a]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { stopped.current = true; abort.current?.abort(); void rec.current?.stop(); }, []);

  async function start() {
    reset();
    try {
      rec.current = await startRecorder();
    } catch {
      setErr(t("micDenied")); return;
    }
    stopped.current = false;
    abort.current = new AbortController();
    setPhase("listening");
    const t0 = Date.now();
    const tick = async () => {
      if (stopped.current || !rec.current) return;
      setLevel(rec.current.level());
      const sec = (Date.now() - t0) / 1000;
      setElapsed(sec);
      if (sec >= MAX_SECONDS) { void stop(); return; }
      if (!busy.current && sec > 1.5) {
        const f = rec.current.snapshot();
        if (f) {
          busy.current = true;
          transcribe(f, abort.current?.signal)
            .then((txt) => { if (!stopped.current) setHeard(txt); })
            .catch((e: Error & { status?: number }) => { if (e.name !== "AbortError" && e.status && e.status !== 429) { setErr(e.message); void stop(true); } })
            .finally(() => { busy.current = false; });
        }
      }
    };
    const id = window.setInterval(() => void tick(), 1800);
    const meter = window.setInterval(() => rec.current && setLevel(rec.current.level()), 100);
    cleanupTimers.current = () => { clearInterval(id); clearInterval(meter); };
  }
  const cleanupTimers = useRef<() => void>(() => {});

  async function stop(silent = false) {
    if (stopped.current) return;
    stopped.current = true;
    cleanupTimers.current();
    abort.current?.abort();
    const f = await rec.current?.stop();
    rec.current = null;
    setLevel(0);
    if (silent || !f) { if (!silent) setPhase("idle"); return; }
    setPhase("analyzing");
    try {
      const txt = await transcribe(f);
      setHeard(txt);
      setPhase("done");
    } catch (e) {
      setErr((e as Error).message); setPhase("idle");
    }
  }

  const info = surah(s);
  const total = info.ayahs;
  const go = (d: number) => {
    if (a + d >= 1 && a + d <= total) setA(a + d);
    else if (d > 0 && s < 114) { setS(s + 1); setA(1); }
    else if (d < 0 && s > 1) { setS(s - 1); setA(surah(s - 1).ayahs); }
  };
  const listening = phase === "listening";

  return (
    <div>
      <PageHeader title={t("reciteTitle")}>
        <p className="mt-1 text-sm text-muted-foreground">{t("reciteIntro")}</p>
      </PageHeader>
      <div className="space-y-4 px-5">
        <div className="surface flex flex-wrap items-center gap-3 p-3">
          <label className="sr-only" htmlFor="rs">{t("surah")}</label>
          <select id="rs" value={s} onChange={(e) => { setS(Number(e.target.value)); setA(1); }} className="min-h-11 flex-1 rounded-xl border bg-background px-3 text-sm">
            {SURAHS.map((x, i) => <option key={i} value={i + 1}>{num(i + 1)}. {surahName(x, lang)}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => go(-1)} aria-label={t("prev")} className="grid h-11 w-11 place-items-center rounded-full border"><ChevronLeft className="h-5 w-5 rtl:rotate-180" /></button>
            <span className="min-w-20 text-center text-sm font-semibold">{t("ayah")} {num(a)}/{num(total)}</span>
            <button onClick={() => go(1)} aria-label={t("next")} className="grid h-11 w-11 place-items-center rounded-full border"><ChevronRight className="h-5 w-5 rtl:rotate-180" /></button>
          </div>
        </div>

        <section className="surface relative overflow-hidden p-6">
          {q.isLoading && <p className="text-center text-muted-foreground">{t("loading")}</p>}
          {q.isError && <p className="text-center text-destructive">{t("error")}</p>}
          {ayah && (
            <>
              <p dir="rtl" lang="ar" className="font-quran text-center text-[2rem] leading-[2.4] sm:text-[2.4rem]">
                {results.map((r, i) => (
                  <span key={i} title={r.heard ? `${t("heard")} : ${r.heard}` : undefined}
                    className={`mx-1 inline-block rounded-lg px-1 transition-colors duration-300 ${STYLE[r.status]} ${listening && i === reached ? "bg-gold/15" : ""}`}>
                    {r.word}
                  </span>
                ))}
                <span className="mx-1 text-gold">۝{num(a)}</span>
              </p>
              {ayah.tr && lang !== "ar" && <p className="mt-4 text-center text-sm text-muted-foreground">{ayah.tr}</p>}
            </>
          )}
        </section>

        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={() => (listening ? void stop() : void start())}
            disabled={!ayah || phase === "analyzing"}
            aria-label={listening ? t("stopReciting") : t("startReciting")}
            className={`relative grid h-24 w-24 place-items-center rounded-full shadow-xl transition-transform active:scale-95 disabled:opacity-50 ${listening ? "bg-destructive text-destructive-foreground" : "bg-gold text-gold-foreground"}`}
          >
            {listening && <span className="absolute inset-0 rounded-full bg-destructive/40" style={{ transform: `scale(${1 + level * 0.6})`, transition: "transform 100ms" }} />}
            <span className="relative">{listening ? <Square className="h-9 w-9" fill="currentColor" /> : <Mic className="h-10 w-10" />}</span>
          </button>
          <p className="text-sm font-medium text-muted-foreground" role="status">
            {phase === "idle" && t("tapToRecite")}
            {listening && `${t("listening")} · ${num(Math.floor(elapsed))} s`}
            {phase === "analyzing" && t("analyzing")}
            {phase === "done" && t("recitationDone")}
          </p>
          {err && <p className="text-center text-sm text-destructive">{err}</p>}
        </div>

        {phase === "done" && (
          <section className="surface space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("result")}</h2>
              <span className={`text-3xl font-bold ${score >= 85 ? "text-success" : score >= 60 ? "text-gold" : "text-destructive"}`}>{num(score)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-success transition-all" style={{ width: `${score}%` }} /></div>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {(["correct", "close", "wrong", "missed"] as const).map((k) => (
                <li key={k} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className={STYLE[k].split(" ")[0]}>{t(`st_${k}`)}</span>
                  <b>{num(results.filter((r) => r.status === k).length)}</b>
                </li>
              ))}
            </ul>
            {results.some((r) => r.status === "wrong" || r.status === "close" || r.status === "missed") && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("toReview")}</h3>
                <ul className="space-y-1">
                  {results.map((r, i) => r.status === "correct" ? null : (
                    <li key={i} dir="rtl" className="flex items-center justify-between gap-3 rounded-xl bg-card/60 px-3 py-2">
                      <span className={`font-quran text-xl ${STYLE[r.status].split(" ")[0]}`}>{r.word}</span>
                      <span className="text-xs text-muted-foreground" dir="auto">{r.heard ? `${t("heard")} : ${r.heard}` : t("st_missed")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void start()} className="chip"><RotateCcw className="h-4 w-4" /> {t("tryAgain")}</button>
              <button onClick={() => go(1)} className="chip">{t("nextAyah")} <ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
              <Link to="/surah/$id" params={{ id: String(s) }} hash={`a${a}`} className="chip"><Volume2 className="h-4 w-4" /> {t("listenModel")}</Link>
            </div>
          </section>
        )}
        <p className="pb-4 text-center text-xs text-muted-foreground">{t("reciteNote")}</p>
      </div>
    </div>
  );
}
