import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { LANGS, useT } from "@/lib/i18n";
import { defaultState, setState, useStore } from "@/lib/store";
import { RECITERS, TRANSLATIONS } from "@/lib/quran";
import { usePlayer } from "@/lib/player-context";
import { PageHeader } from "@/components/AppShell";
import { OfflineSection } from "@/components/OfflineSection";
import { ReciterPicker } from "@/components/LibraryControls";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Réglages — CoranProFree" },
      { name: "description", content: "Langue, récitateur, taille du texte et sources de CoranProFree." },
      { property: "og:title", content: "Réglages — CoranProFree" },
      { property: "og:description", content: "Personnalisez votre lecture du Coran." },
    ],
  }),
  component: SettingsPage,
});

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="radio" aria-checked={on} className="chip" onClick={onClick}>{on && <Check className="h-4 w-4" aria-hidden />}{children}</button>;
}

function SettingsPage() {
  const { t, num, lang } = useT();
  const st = useStore((s) => s);
  const p = usePlayer();
  return (
    <div>
      <PageHeader title={t("settings")} />
      <div className="space-y-4 px-5">
        <Section title={t("language")}>
          <Group label={t("language")}>{LANGS.map((l) => <Chip key={l.id} on={st.lang === l.id} onClick={() => setState(() => ({ lang: l.id }))}>{l.label}</Chip>)}</Group>
        </Section>
        <Section title={t("reciter")}>
          <ReciterPicker />
        </Section>
        <Section title={t("audioPlayback")}>
          <Sub title={t("speed")}>{[0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => <Chip key={v} on={p.speed === v} onClick={() => p.setSpeed(v)}>{num(v)}×</Chip>)}</Sub>
          <Sub title={t("repeat")}>{(["off", "ayah", "surah"] as const).map((r) => <Chip key={r} on={p.repeat === r} onClick={() => p.setRepeat(r)}>{t(r === "off" ? "repeatOff" : r === "ayah" ? "repeatAyah" : "repeatSurah")}</Chip>)}</Sub>
          <label className="flex min-h-11 w-full items-center justify-between gap-4 border-t pt-3">
            <span className="font-medium">{t("autoAdvance")}</span>
            <input type="checkbox" checked={st.autoAdvance} onChange={(e) => setState(() => ({ autoAdvance: e.target.checked }))} className="h-6 w-6 accent-primary" />
          </label>
        </Section>
        <Section title={t("readingLearning")}>
          <p className="w-full text-sm font-medium text-muted-foreground">{t("fontSize")}</p>
          <input type="range" min={22} max={48} value={st.fontSize} onChange={(e) => setState(() => ({ fontSize: Number(e.target.value) }))} className="h-11 w-full accent-primary" aria-label={t("fontSize")} />
          <p dir="rtl" className="font-quran w-full text-right" style={{ fontSize: st.fontSize }}>ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ</p>
          {TRANSLATIONS[lang] && (
            <label className="flex min-h-11 w-full items-center justify-between gap-4 border-t pt-3">
              <span className="font-medium">{t("translation")}</span>
              <input type="checkbox" checked={st.showTranslation} onChange={(e) => setState(() => ({ showTranslation: e.target.checked }))} className="h-6 w-6 accent-primary" />
            </label>
          )}
        </Section>
        <OfflineSection />
        <Section title={t("stats")}>
          <p className="text-sm text-muted-foreground">{num(st.stats.sessions)} {t("sessions")} · {num(st.stats.surahsOpened.length)} {t("opened")}</p>
        </Section>
        <Section title={t("sources")}>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Texte arabe : Tanzil Project — Uthmani (tanzil.net)</li>
            <li>Traductions : {TRANSLATIONS.fr!.name}, {TRANSLATIONS.en!.name}</li>
            <li>Audio & API : Islamic Network (alquran.cloud)</li>
          </ul>
        </Section>
        <div className="surface p-4 text-sm">
          <p>{t("privacy")}</p>
          <Link to="/privacy" className="mt-2 inline-flex min-h-11 items-center font-semibold text-gold underline">{t("privacyPolicy")}</Link>
          <button className="block min-h-11 font-semibold text-destructive" onClick={() => setState(() => ({ ...defaultState, lang: st.lang }))}>{t("clearData")}</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface p-4">
      <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">{children}</div>;
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="w-full">
    <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
    <Group label={title}>{children}</Group>
  </div>;
}
