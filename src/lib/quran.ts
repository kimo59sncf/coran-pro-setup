import { queryOptions } from "@tanstack/react-query";
import surahs from "@/data/surahs.json";
import type { Lang } from "./store";
import { EVERYAYAH_PRIMARY, everyAyahUrl } from "./everyayah";

export type Surah = (typeof surahs)[number];
export const SURAHS: Surah[] = surahs;

// Source: Tanzil Uthmani text + editions served by api.alquran.cloud (Islamic Network).
const API = "https://api.alquran.cloud/v1";
export const TRANSLATIONS: Record<Lang, { id: string; name: string } | null> = {
  fr: { id: "fr.hamidullah", name: "Muhammad Hamidullah (Tanzil)" },
  en: { id: "en.sahih", name: "Saheeh International (Tanzil)" },
  ar: null,
};

export const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Alafasy", ar: "مشاري العفاسي" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", ar: "محمود خليل الحصري" },
  { id: "ar.minshawi", name: "Mohamed Siddiq Al-Minshawi", ar: "محمد صديق المنشاوي" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit (Murattal)", ar: "عبد الباسط عبد الصمد" },
  { id: "ar.abdurrahmaansudais", name: "Abdurrahman As-Sudais", ar: "عبدالرحمن السديس" },
  { id: "ar.mahermuaiqly", name: "Maher Al-Muaiqly", ar: "ماهر المعيقلي" },
  { id: "ar.saoodshuraym", name: "Saud Ash-Shuraim", ar: "سعود الشريم" },
  { id: "ar.ahmedajamy", name: "Ahmed Al-Ajmy", ar: "أحمد العجمي" },
  { id: "ar.abdullahbasfar", name: "Abdullah Basfar", ar: "عبد الله بصفر" },
  { id: "ar.muhammadayyoub", name: "Muhammad Ayyoub", ar: "محمد أيوب" },
  { id: "ar.muhammadjibreel", name: "Muhammad Jibreel", ar: "محمد جبريل" },
  { id: "ar.shaatree", name: "Abu Bakr Ash-Shaatree", ar: "أبو بكر الشاطري" },
  { id: "ar.hudhaify", name: "Ali Al-Hudhaify", ar: "علي الحذيفي" },
  { id: "ar.hanirifai", name: "Hani Rifai", ar: "هاني الرفاعي" },
  { id: "ar.husarymujawwad", name: "Mahmoud Al-Husary (Mujawwad)", ar: "محمود خليل الحصري (المجود)" },
  { id: "ar.minshawimujawwad", name: "Mohamed Al-Minshawi (Mujawwad)", ar: "محمد صديق المنشاوي (المجود)" },
  { id: "ar.abdulsamad", name: "Abdul Basit (Mujawwad)", ar: "عبد الباسط عبد الصمد (مجود)" },
  { id: "ar.aymanswoaid", name: "Ayman Sowaid", ar: "أيمن سويد" },
  { id: "ar.ibrahimakhbar", name: "Ibrahim Akhdar", ar: "إبراهيم الأخضر" },
  { id: "ar.yasseraldossari", name: "Yasser Al-Dosari", ar: "ياسر الدوسري" },
  { id: "ar.nasseralqatami", name: "Nasser Al-Qatami", ar: "ناصر القطامي" },
  { id: "ar.alijaber", name: "Ali Jaber", ar: "علي جابر" },
];

export type ReciterCategory = "essential" | "tajweed" | "emotional" | "contemporary" | "historical";

// Editorial grouping (not a religious ranking). A reciter can belong to
// several categories. "Hafs" is the riwaya used by the audio editions.
export const RECITER_META: Record<string, { riwaya: string; categories: ReciterCategory[] }> = {
  "ar.alafasy": { riwaya: "Hafs", categories: ["essential", "contemporary"] },
  "ar.husary": { riwaya: "Hafs", categories: ["essential", "tajweed", "historical"] },
  "ar.minshawi": { riwaya: "Hafs", categories: ["essential", "tajweed", "emotional", "historical"] },
  "ar.abdulbasitmurattal": { riwaya: "Hafs", categories: ["essential", "emotional", "historical"] },
  "ar.abdurrahmaansudais": { riwaya: "Hafs", categories: ["essential", "contemporary"] },
  "ar.mahermuaiqly": { riwaya: "Hafs", categories: ["essential", "contemporary"] },
  "ar.saoodshuraym": { riwaya: "Hafs", categories: ["essential"] },
  "ar.ahmedajamy": { riwaya: "Hafs", categories: ["contemporary"] },
  "ar.abdullahbasfar": { riwaya: "Hafs", categories: ["tajweed", "contemporary"] },
  "ar.muhammadayyoub": { riwaya: "Hafs", categories: ["tajweed", "historical"] },
  "ar.muhammadjibreel": { riwaya: "Hafs", categories: ["emotional"] },
  "ar.shaatree": { riwaya: "Hafs", categories: ["essential", "contemporary"] },
  "ar.hudhaify": { riwaya: "Hafs", categories: ["tajweed"] },
  "ar.hanirifai": { riwaya: "Hafs", categories: ["contemporary"] },
  "ar.husarymujawwad": { riwaya: "Hafs", categories: ["tajweed", "historical"] },
  "ar.minshawimujawwad": { riwaya: "Hafs", categories: ["emotional", "historical"] },
  "ar.abdulsamad": { riwaya: "Hafs", categories: ["emotional", "historical"] },
  "ar.aymanswoaid": { riwaya: "Hafs", categories: ["tajweed"] },
  "ar.ibrahimakhbar": { riwaya: "Hafs", categories: ["tajweed", "emotional"] },
  "ar.yasseraldossari": { riwaya: "Hafs", categories: ["essential", "contemporary"] },
  "ar.nasseralqatami": { riwaya: "Hafs", categories: ["contemporary", "emotional"] },
  "ar.alijaber": { riwaya: "Hafs", categories: ["contemporary", "emotional"] },
};

export type Ayah = { n: number; global: number; ar: string; tr?: string; audio: string; page?: number };

export const surahUrl = (n: number, lang: Lang, reciter: string) => {
  const tr = TRANSLATIONS[lang];
  const eds = ["quran-uthmani", ...(EVERYAYAH_PRIMARY.has(reciter) ? [] : [reciter]), ...(tr ? [tr.id] : [])].join(",");
  return `${API}/surah/${n}/editions/${eds}`;
};

export const surahQuery = (n: number, lang: Lang, reciter: string) =>
  queryOptions({
    queryKey: ["surah", n, lang, reciter],
    staleTime: Infinity,
    queryFn: async (): Promise<Ayah[]> => {
      const url = surahUrl(n, lang, reciter);
      let res: Response | undefined;
      try {
        res = await fetch(url);
      } catch {
        // Offline: fall back to text saved from Settings, even without a service worker.
        if (typeof caches !== "undefined") res = await (await caches.open("cpf-data-v1")).match(url);
      }
      if (!res || !res.ok) throw new Error("network");
      const { data } = await res.json();
      if (EVERYAYAH_PRIMARY.has(reciter)) {
        const [text, trans] = data;
        return text.ayahs.map((a: { numberInSurah: number; number: number; text: string; page?: number }, i: number) => ({
          n: a.numberInSurah,
          global: a.number,
          ar: a.text,
          page: a.page,
          audio: everyAyahUrl(reciter, n, a.numberInSurah) ?? "",
          tr: trans?.ayahs?.[i]?.text,
        }));
      }
      const [text, audio, trans] = data;
      return text.ayahs.map((a: { numberInSurah: number; number: number; text: string; page?: number }, i: number) => ({
        n: a.numberInSurah,
        global: a.number,
        ar: a.text,
        page: a.page,
        audio: audio.ayahs[i].audio,
        tr: trans?.ayahs[i]?.text,
      }));
    },
  });

export type SearchHit = { s: number; a: number; text: string };

const isArabic = (q: string) => /[\u0600-\u06FF]/.test(q);
// Diacritic/letter-form insensitive normalisation (Arabic + Latin accents).
export const normalize = (t: string) =>
  t
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[۰-۹٠-٩]/g, (c) => String(c.charCodeAt(0) - (c >= "۰" ? 0x6f0 : 0x660)))
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/\s+/g, " ");

type Indexed = { s: number; a: number; text: string; norm: string };
export const editionQuery = (ed: string) =>
  queryOptions({
    queryKey: ["edition", ed],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<Indexed[]> => {
      const res = await fetch(`${API}/quran/${ed}`);
      if (!res.ok) throw new Error("network");
      const { data } = await res.json();
      const out: Indexed[] = [];
      for (const su of data.surahs) for (const a of su.ayahs) out.push({ s: su.number, a: a.numberInSurah, text: a.text, norm: normalize(a.text) });
      return out;
    },
  });

export const searchEdition = (q: string, lang: Lang) =>
  isArabic(q) ? "quran-simple-clean" : TRANSLATIONS[lang]?.id ?? "fr.hamidullah";

export function runSearch(index: Indexed[], q: string): SearchHit[] {
  const n = normalize(q.trim());
  if (n.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const r of index) {
    if (r.norm.includes(n)) { hits.push({ s: r.s, a: r.a, text: r.text }); if (hits.length >= 200) break; }
  }
  return hits;
}

export const surahName = (s: Surah, lang: Lang) => (lang === "ar" ? s.ar.replace("سُورَةُ ", "") : s.tr);
export const surah = (n: number): Surah => {
  const s = SURAHS[Math.min(Math.max(n, 1), 114) - 1];
  if (!s) throw new Error("Invalid surah");
  return s;
};
