// Verse-by-verse audio mirrors hosted on everyayah.com.
// Each directory below has been verified to serve 001001.mp3 (spot-checked),
// and the primary-only reciters were verified for all 114 surahs.

export const EVERYAYAH_DIRS: Record<string, string> = {
  "ar.alafasy": "Alafasy_128kbps",
  "ar.husary": "Husary_128kbps",
  "ar.minshawi": "Minshawy_Murattal_128kbps",
  "ar.abdulbasitmurattal": "Abdul_Basit_Murattal_192kbps",
  "ar.abdurrahmaansudais": "Abdurrahmaan_As-Sudais_192kbps",
  "ar.mahermuaiqly": "MaherAlMuaiqly128kbps",
  "ar.saoodshuraym": "Saood_ash-Shuraym_128kbps",
  "ar.ahmedajamy": "Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com",
  "ar.abdullahbasfar": "Abdullah_Basfar_192kbps",
  "ar.muhammadayyoub": "Muhammad_Ayyoub_128kbps",
  "ar.muhammadjibreel": "Muhammad_Jibreel_64kbps",
  "ar.hanirifai": "Hani_Rifai_64kbps",
  "ar.hudhaify": "Hudhaify_64kbps",
  "ar.aymanswoaid": "Ayman_Sowaid_64kbps",
  // Reciters whose ONLY verse-by-verse source is EveryAyah (114/114 verified):
  "ar.yasseraldossari": "Yasser_Ad-Dussary_128kbps",
  "ar.nasseralqatami": "Nasser_Alqatami_128kbps",
  "ar.alijaber": "Ali_Jaber_64kbps",
};

// Reciters without a verse-by-verse edition on AlQuran Cloud: their audio
// comes directly from EveryAyah.
export const EVERYAYAH_PRIMARY = new Set([
  "ar.yasseraldossari",
  "ar.nasseralqatami",
  "ar.alijaber",
]);

export function everyAyahUrl(reciter: string, s: number, a: number): string | null {
  const dir = EVERYAYAH_DIRS[reciter];
  if (!dir) return null;
  const p = (x: number) => String(x).padStart(3, "0");
  return `https://everyayah.com/data/${dir}/${p(s)}${p(a)}.mp3`;
}
