import { normalize } from "./quran";

/** Pure, browser-safe alignment of a spoken transcript against verse words (Tarteel-like). */
export type WordStatus = "pending" | "correct" | "close" | "wrong" | "missed";
export type WordResult = { word: string; status: WordStatus; heard?: string | undefined };

// Arabic-only normalisation: diacritics, tatweel, letter forms; also drop Quranic stop marks.
export const normWord = (w: string) =>
  normalize(w).replace(/[^\u0621-\u064A0-9a-z]/g, "").replace(/^ال/, "");

export const splitWords = (t: string) => t.split(/\s+/).filter((w) => normWord(w).length > 0);

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}
export const similarity = (a: string, b: string) => {
  const x = normWord(a), y = normWord(b);
  if (!x || !y) return 0;
  return 1 - lev(x, y) / Math.max(x.length, y.length);
};

/**
 * Needleman–Wunsch style alignment of heard words onto expected words.
 * Words after the last aligned word stay "pending" unless `final` is true (then "missed").
 */
export function alignRecitation(expected: string[], heardText: string, final = false): WordResult[] {
  const heard = splitWords(heardText);
  const n = expected.length, m = heard.length;
  const GAP = -0.6;
  const score = (i: number, j: number) => { const s = similarity(expected[i]!, heard[j]!); return s >= 0.5 ? s : s - 1; };
  const S = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) S[i]![0] = i * GAP;
  for (let j = 1; j <= m; j++) S[0]![j] = j * GAP;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      S[i]![j] = Math.max(S[i - 1]![j - 1]! + score(i - 1, j - 1), S[i - 1]![j]! + GAP, S[i]![j - 1]! + GAP);
  // Free trailing gaps on expected side while reciting: pick best end row.
  let bi = n;
  if (!final) { let best = -Infinity; for (let i = 0; i <= n; i++) if (S[i]![m]! >= best) { best = S[i]![m]!; bi = i; } }
  const out: WordResult[] = expected.map((word) => ({ word, status: "pending" as WordStatus }));
  if (final) for (const o of out) o.status = "missed";
  let i = bi, j = m;
  while (i > 0 && j > 0) {
    if (Math.abs(S[i]![j]! - (S[i - 1]![j - 1]! + score(i - 1, j - 1))) < 1e-9) {
      const s = similarity(expected[i - 1]!, heard[j - 1]!);
      out[i - 1] = { word: expected[i - 1]!, heard: heard[j - 1], status: s >= 0.85 ? "correct" : s >= 0.5 ? "close" : "wrong" };
      i--; j--;
    } else if (Math.abs(S[i]![j]! - (S[i - 1]![j]! + GAP)) < 1e-9) { out[i - 1]!.status = "missed"; i--; }
    else j--;
  }
  while (i > 0) { out[i - 1]!.status = "missed"; i--; }
  return out;
}

export const accuracy = (r: WordResult[]) => {
  const done = r.filter((w) => w.status !== "pending");
  if (!r.length) return 0;
  const pts = r.reduce((a, w) => a + (w.status === "correct" ? 1 : w.status === "close" ? 0.5 : 0), 0);
  return Math.round((pts / Math.max(done.length, 1)) * 100);
};
