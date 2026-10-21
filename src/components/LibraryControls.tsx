import { useMemo, useState } from "react";
import { CloudDownload, CloudCheck, Heart, ListPlus, ListChecks, LoaderCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT, type TKey } from "@/lib/i18n";
import { setState, togglePlaylist, toggleFavoriteSurah, toggleIn, toggleSurah, useStore } from "@/lib/store";
import { downloadSurah, removeDownload } from "@/lib/downloads";
import { RECITERS, RECITER_META, type ReciterCategory } from "@/lib/quran";
import { RECITER_PHOTOS } from "@/lib/reciter-photos";
import { ReciterPortrait } from "@/components/ReciterPortrait";

export function SurahActions({ n, favorite, saved, busy }: { n: number; favorite: boolean; saved: boolean; busy: boolean }) {
  const { t, lang } = useT();
  const reciter = useStore((s) => s.reciter);
  const inPlaylist = useStore((s) => s.playlist.includes(n) && (s.playlistReciters?.[n] ?? reciter) === reciter);
  const downloadLabel = t(busy ? "saving" : saved ? "removeDownload" : "download");
  return <div className="-me-1 flex shrink-0 items-center">
    <Button size="icon" variant="ghost" title={downloadLabel} aria-label={downloadLabel} aria-pressed={saved} disabled={busy}
      className={saved ? "text-success" : "text-muted-foreground"}
      onClick={async () => { try { if (saved) await removeDownload(n, lang, reciter); else { await downloadSurah(n, lang, reciter); toast.success(t("downloadDone")); } } catch { toast.error(t("error")); } }}>
      {busy ? <LoaderCircle className="animate-spin" /> : saved ? <CloudCheck fill="currentColor" className="text-success" /> : <CloudDownload />}
    </Button>
    <Button size="icon" variant="ghost" title={t(favorite ? "removeFavorite" : "addFavorite")} aria-label={t(favorite ? "removeFavorite" : "addFavorite")} aria-pressed={favorite}
      className={favorite ? "text-favorite" : "text-muted-foreground"} onClick={() => setState((s) => toggleFavoriteSurah(s, reciter, n))}>
      <Heart fill={favorite ? "currentColor" : "none"} />
    </Button>
    <Button size="icon" variant="ghost" title={t(inPlaylist ? "removePlaylist" : "addPlaylist")} aria-label={t(inPlaylist ? "removePlaylist" : "addPlaylist")} aria-pressed={inPlaylist}
      className={inPlaylist ? "text-gold" : "text-muted-foreground"} onClick={() => setState((s) => togglePlaylist(s, n, reciter))}>
      {inPlaylist ? <ListChecks /> : <ListPlus />}
    </Button>
  </div>;
}

const CATEGORY_ORDER: ReciterCategory[] = ["essential", "tajweed", "emotional", "contemporary", "historical"];

export function ReciterPicker({ favoritesOnly = false, onSelect, vertical = false }: { favoritesOnly?: boolean; onSelect?: (id: string) => void; vertical?: boolean }) {
  const { t, lang } = useT();
  const selected = useStore((s) => s.reciter);
  const favorites = useStore((s) => s.favoriteReciters);
  const [query, setQuery] = useState("");

  const primaryCat = (id: string): ReciterCategory => RECITER_META[id]?.categories?.[0] ?? "contemporary";

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = RECITERS.filter((r) => !favoritesOnly || favorites.includes(r.id));
    const filtered = q ? base.filter((r) => r.name.toLowerCase().includes(q) || r.ar.includes(q) || r.id.toLowerCase().includes(q)) : base;
    return filtered.sort((a, b) => {
      const ca = CATEGORY_ORDER.indexOf(primaryCat(a.id));
      const cb = CATEGORY_ORDER.indexOf(primaryCat(b.id));
      return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb);
    });
  }, [favoritesOnly, favorites, query]);

  if (vertical) {
    const groups = CATEGORY_ORDER.map((cat) => ({ cat, items: list.filter((r) => primaryCat(r.id) === cat) })).filter((g) => g.items.length > 0);
    return <div role="region" aria-label={t("reciters")} className="flex flex-col gap-1">
      <div className="relative px-1 pb-2">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchReciterPh")} aria-label={t("searchReciterPh")} className="min-h-11 w-full rounded-xl border bg-card ps-9 pe-3 text-sm" />
      </div>
      {groups.map((g) => (
        <div key={g.cat}>
          <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`cat_${g.cat}` as TKey)}</p>
          {g.items.map((r) => {
            const favorite = favorites.includes(r.id);
            const on = selected === r.id;
            const name = lang === "ar" ? r.ar : r.name;
            return (
              <div key={r.id} className="flex items-center gap-x-1 rounded-2xl px-1 py-1 transition-colors hover:bg-card/60">
                <button onClick={() => { setState(() => ({ reciter: r.id })); onSelect?.(r.id); }} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-start">
                  <span className="block -m-1 scale-90"><ReciterPortrait key={r.id} src={RECITER_PHOTOS[r.id]} name={r.name} selected={on} /></span>
                  <span className={`min-w-0 text-sm ${on ? "font-semibold text-primary" : "font-medium"}`}>{name}</span>
                </button>
                <Button variant="outline" size="icon" aria-label={`${t(favorite ? "removeFavorite" : "addFavorite")} · ${name}`} title={t(favorite ? "removeFavorite" : "addFavorite")} aria-pressed={favorite} className={`h-9 w-9 rounded-full ${favorite ? "text-favorite" : "text-muted-foreground"}`} onClick={() => setState((s) => ({ favoriteReciters: toggleIn(s.favoriteReciters, r.id) }))}><Heart fill={favorite ? "currentColor" : "none"} /></Button>
              </div>
            );
          })}
        </div>
      ))}
      {!list.length && <p className="p-4 text-center text-sm text-muted-foreground">{t("noResults")}</p>}
    </div>;
  }

  return <div role="region" aria-label={t("reciters")} className="flex gap-3 overflow-x-auto px-1 py-2">
    {list.map((r) => {
      const favorite = favorites.includes(r.id);
      const on = selected === r.id;
      const name = lang === "ar" ? r.ar : r.name;
      return <div key={r.id} className="relative w-28 shrink-0 text-center">
        <Button variant="ghost" aria-label={name} title={name} aria-pressed={on} className="h-auto w-full flex-col gap-2 whitespace-normal p-0 hover:bg-transparent" onClick={() => { setState(() => ({ reciter: r.id })); onSelect?.(r.id); }}>
          <ReciterPortrait key={r.id} src={RECITER_PHOTOS[r.id]} name={r.name} selected={on} />
          <span className={`min-h-10 w-full text-xs leading-tight ${on ? "font-semibold text-primary" : "font-medium"}`}>{name}</span>
        </Button>
        <Button variant="outline" size="icon" aria-label={`${t(favorite ? "removeFavorite" : "addFavorite")} · ${name}`} title={t(favorite ? "removeFavorite" : "addFavorite")} aria-pressed={favorite} className={`absolute end-2 top-10 h-7 w-7 rounded-full ${favorite ? "text-favorite" : "text-muted-foreground"}`} onClick={() => setState((s) => ({ favoriteReciters: toggleIn(s.favoriteReciters, r.id) }))}><Heart fill={favorite ? "currentColor" : "none"} /></Button>
      </div>;
    })}
  </div>;
}