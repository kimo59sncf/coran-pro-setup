import { queryOptions } from "@tanstack/react-query";

export type PageAyah = { s: number; n: number; global: number; ar: string; page: number };
type OfficialAyah = { surah: { number: number }; numberInSurah: number; number: number; text: string; page: number };

export function mapPage(ayahs: OfficialAyah[]): PageAyah[] {
  return ayahs.map((a) => ({ s: a.surah.number, n: a.numberInSurah, global: a.number, ar: a.text, page: a.page }));
}

async function verifiedData(url: string) {
  const cache = typeof caches !== "undefined" ? await caches.open("cpf-data-v1") : null;
  const saved = await cache?.match(url);
  if (saved) return saved.json();
  const response = await fetch(url);
  if (!response.ok) throw new Error("network");
  const json = await response.clone().json();
  if (json.code !== 200 || !Array.isArray(json.data?.ayahs)) throw new Error("network");
  await cache?.put(url, response).catch(() => {});
  return json;
}

export const mushafPageQuery = (page: number | undefined) => queryOptions({
  queryKey: ["mushaf-page", page],
  enabled: page !== undefined,
  staleTime: Infinity,
  queryFn: async (): Promise<PageAyah[]> => {
    if (!page || page < 1 || page > 604) throw new Error("page");
    const { data } = await verifiedData(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);
    return mapPage(data.ayahs);
  },
});

// A separate verified text read also supplies page numbers for older downloaded metadata.
export const surahPagesQuery = (s: number) => queryOptions({
  queryKey: ["surah-pages", s],
  staleTime: Infinity,
  queryFn: async (): Promise<{ n: number; page: number }[]> => {
    const { data } = await verifiedData(`https://api.alquran.cloud/v1/surah/${s}/quran-uthmani`);
    return data.ayahs.map((a: OfficialAyah) => ({ n: a.numberInSurah, page: a.page }));
  },
});