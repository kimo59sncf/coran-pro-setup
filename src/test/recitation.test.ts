import { test, expect } from "vitest";
import { alignRecitation, splitWords } from "@/lib/recitation";
const v = splitWords("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ");
test("align", () => {
  expect(alignRecitation(v, "بسم الله الرحمن الرحيم", true).map(r=>r.status)).toEqual(["correct","correct","correct","correct"]);
  expect(alignRecitation(v, "بسم الله", false).map(r=>r.status)).toEqual(["correct","correct","pending","pending"]);
  expect(alignRecitation(v, "بسم الله الرحيم", true).map(r=>r.status)).toEqual(["correct","correct","missed","correct"]);
});
