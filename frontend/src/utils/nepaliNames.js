const WORD_OVERRIDES = {
  dr: "डा.",
  doctor: "डाक्टर",
  khanal: "खनाल",
  nirman: "निर्माण",
  test: "टेस्ट",
  general: "जनरल",
};

const CONSONANTS = {
  bh: "भ",
  chh: "छ",
  ch: "च",
  dh: "ध",
  gh: "घ",
  jh: "झ",
  kh: "ख",
  ph: "फ",
  sh: "श",
  th: "थ",
  aa: "आ",
  a: "अ",
  b: "ब",
  c: "क",
  d: "द",
  f: "फ",
  g: "ग",
  h: "ह",
  j: "ज",
  k: "क",
  l: "ल",
  m: "म",
  n: "न",
  p: "प",
  q: "क",
  r: "र",
  s: "स",
  t: "त",
  v: "व",
  w: "व",
  x: "क्स",
  y: "य",
  z: "ज",
};

const VOWEL_SIGNS = {
  a: "",
  aa: "ा",
  e: "े",
  ee: "ी",
  i: "ि",
  o: "ो",
  oo: "ू",
  u: "ु",
};

const INDEPENDENT_VOWELS = {
  a: "अ",
  aa: "आ",
  e: "ए",
  ee: "ई",
  i: "इ",
  o: "ओ",
  oo: "ऊ",
  u: "उ",
};

const hasNepali = (value = "") => /[\u0900-\u097F]/.test(value);

const takeMatch = (value, index, map) => {
  const remaining = value.slice(index);
  return Object.keys(map)
    .sort((a, b) => b.length - a.length)
    .find((key) => remaining.startsWith(key));
};

const transliterateWord = (word) => {
  const cleaned = word.toLowerCase().replace(/^dr\.?$/, "dr");
  if (WORD_OVERRIDES[cleaned]) return WORD_OVERRIDES[cleaned];
  if (!/[a-z]/i.test(word) || hasNepali(word)) return word;

  let output = "";
  let i = 0;

  while (i < cleaned.length) {
    const char = cleaned[i];
    if (!/[a-z]/.test(char)) {
      output += word[i] || char;
      i += 1;
      continue;
    }

    const vowel = takeMatch(cleaned, i, INDEPENDENT_VOWELS);
    if (vowel) {
      output += INDEPENDENT_VOWELS[vowel];
      i += vowel.length;
      continue;
    }

    const consonant = takeMatch(cleaned, i, CONSONANTS);
    if (!consonant) {
      output += word[i] || char;
      i += 1;
      continue;
    }

    output += CONSONANTS[consonant];
    i += consonant.length;

    const nextVowel = takeMatch(cleaned, i, VOWEL_SIGNS);
    if (nextVowel) {
      output += VOWEL_SIGNS[nextVowel];
      i += nextVowel.length;
    }
  }

  return output;
};

export const getDoctorNameForLanguage = (doctor = {}, language = "en") => {
  const englishName =
    doctor.name ||
    doctor.user?.name ||
    doctor.users?.name ||
    doctor.raw?.users?.name ||
    doctor.raw?.user?.name ||
    "Doctor";

  if (language !== "ne") return englishName;

  const nepaliName =
    doctor.name_ne ||
    doctor.nameNp ||
    doctor.name_nepali ||
    doctor.nepali_name ||
    doctor.user?.name_ne ||
    doctor.user?.nepali_name ||
    doctor.users?.name_ne ||
    doctor.users?.nepali_name ||
    doctor.raw?.name_ne ||
    doctor.raw?.nepali_name ||
    doctor.raw?.users?.name_ne ||
    doctor.raw?.users?.nepali_name ||
    "";

  if (nepaliName) return nepaliName;
  if (hasNepali(englishName)) return englishName;

  return englishName
    .split(/(\s+|-)/)
    .map((part) => (/^\s+$|^-$/.test(part) ? part : transliterateWord(part)))
    .join("");
};
