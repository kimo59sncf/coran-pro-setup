import { queryOptions } from "@tanstack/react-query";

export type PageAyah = { s: number; n: number; global: number; ar: string; page: number; juz: number; hizbQuarter: number };
type OfficialAyah = { surah: { number: number }; numberInSurah: number; number: number; text: string; page: number; juz: number; hizbQuarter: number };

export function mapPage(ayahs: OfficialAyah[]): PageAyah[] {
  return ayahs.map((a) => ({ s: a.surah.number, n: a.numberInSurah, global: a.number, ar: a.text, page: a.page, juz: a.juz, hizbQuarter: a.hizbQuarter }));
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

// Madani 604-page mushaf — start page of each surah (1..114) and each juz (1..30).
export const SURAH_START_PAGE = [1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467, 477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596, 596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604];
export const JUZ_START_PAGE = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];

export function surahAtPage(page: number): number {
  let s = 1;
  for (let i = 0; i < SURAH_START_PAGE.length; i++) if (SURAH_START_PAGE[i]! <= page) s = i + 1;
  return s;
}

export function juzAtPage(page: number): number {
  let j = 1;
  for (let i = 0; i < JUZ_START_PAGE.length; i++) if (JUZ_START_PAGE[i]! <= page) j = i + 1;
  return j;
}