import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { BookOpen, BookOpenText, CloudCheck, Heart, Home, Pause, Play, Repeat, Search, Settings, SkipBack, SkipForward, Shuffle, X, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurahActions } from "@/components/LibraryControls";
import { useDownload } from "@/lib/downloads";
import { useT, type TKey } from "@/lib/i18n";
import { usePlayer } from "@/lib/player-context";
import { RECITERS, surah, surahName } from "@/lib/quran";
import { useOnline } from "@/lib/offline";
import { useStore } from "@/lib/store";
import { initNative } from "@/lib/native";
import { MiniPlayer } from "@/components/NowPlaying";
import { isNativeApp } from "@/lib/platform";

const tabs: { to: "/" | "/surahs" | "/mushaf" | "/search" | "/favorites" | "/settings"; icon: typeof Home; k: TKey }[] = [
  { to: "/", icon: Home, k: "home" },
  { to: "/surahs", icon: BookOpen, k: "surahs" },
  { to: "/mushaf", icon: BookOpenText, k: "mushaf" },
  { to: "/search", icon: Search, k: "search" },
  { to: "/favorites", icon: Heart, k: "favorites" },
  { to: "/settings", icon: Settings, k: "settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, dir } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const wide = pathname.startsWith("/mushaf");
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);
  useEffect(() => {
    let cleanup = () => {};
    void initNative().then((fn) => { cleanup = fn; });
    return () => cleanup();
  }, []);
  useEffect(() => {
    // Offline support only on the real site (never inside the editor preview or the native app).
    const inFrame = window.self !== window.top;
    const preview = /id-preview|lovableproject|localhost/.test(location.hostname);
    if (!("serviceWorker" in navigator)) return;
    if (inFrame || preview || isNativeApp() || !import.meta.env.PROD) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  const online = useOnline();
  return (
    <div className={`mx-auto min-h-screen ${wide ? "max-w-6xl" : "max-w-3xl"} pb-[calc(11rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]`}>
      {!online && (
        <div role="status" className="sticky top-0 z-40 bg-gold px-4 py-2 text-center text-xs font-medium text-gold-foreground">
          {t("offlineBanner")}
        </div>
      )}
      {children}
      <MiniPlayer />
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur">
        <ul className="mx-auto flex max-w-3xl justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ to, icon: Icon, k }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="group flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:font-semibold data-[status=active]:text-gold"
              >
                <span className="grid h-7 w-12 place-items-center rounded-full transition-colors group-data-[status=active]:bg-gold/15">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {t(k)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="px-5 pb-4 pt-6 sm:pt-8">
      <h1 className="text-[2.5rem] font-semibold leading-tight">{title}</h1>
      {children}
    </header>
  );
}

export function SurahRow({ n }: { n: number }) {
  const { t, num, lang } = useT();
  const reciter = useStore((s) => s.reciter);
  const favorite = useStore((s) => (s.favoriteSurahs[s.reciter] ?? []).includes(n));
  const { saved, busy } = useDownload(n, lang, reciter);
  const s = surah(n);
  return (
    <div className="mx-2 my-1 flex items-center gap-x-1 rounded-2xl px-2 py-1 transition-colors hover:bg-card/70">
    <Link to="/surah/$id" params={{ id: String(n) }} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl py-2 focus-visible:outline-2 focus-visible:outline-ring">
      <span className="grid h-10 w-10 shrink-0 rotate-45 place-items-center rounded-lg border border-gold/50 text-xs font-semibold text-gold">
        <span className="-rotate-45">{num(n)}</span>
      </span>
       <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="line-clamp-2 leading-snug" title={surahName(s, lang)}>{surahName(s, lang)}</span>
          {favorite && <Heart className="h-4 w-4 shrink-0 text-favorite" fill="currentColor" role="img" aria-label={t("favorite")} />}
          {saved && <CloudCheck className="h-4 w-4 shrink-0 text-success" role="img" aria-label={t("downloaded")} />}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {lang === "en" && `${s.en} · `}{num(s.ayahs)} {t("ayahs")} · {t(s.type === "Meccan" ? "meccan" : "medinan")}
        </div>
      </div>
      {lang !== "ar" && <span dir="rtl" className="font-quran hidden text-xl text-primary sm:block">{s.ar.replace("سُورَةُ ", "")}</span>}
    </Link>
    <SurahActions n={n} favorite={favorite} saved={saved} busy={busy} />
    </div>
  );
}
