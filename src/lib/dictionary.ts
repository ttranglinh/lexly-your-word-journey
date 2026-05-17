export type WordResult = {
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  translation: string;
};

export async function lookupWord(word: string): Promise<WordResult> {
  const w = word.trim().toLowerCase();
  if (!w) throw new Error("Empty word");

  const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
  if (!dictRes.ok) throw new Error("Word not found");
  const dictData = await dictRes.json();
  const entry = dictData[0];
  const meaning = entry?.meanings?.[0];
  const def = meaning?.definitions?.[0];

  // Translation: MyMemory free API (en -> es by default)
  let translation = "";
  try {
    const trRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|es`,
    );
    if (trRes.ok) {
      const trData = await trRes.json();
      translation = trData?.responseData?.translatedText ?? "";
    }
  } catch {
    // ignore translation failures
  }

  return {
    word: entry?.word ?? w,
    partOfSpeech: meaning?.partOfSpeech ?? "",
    definition: def?.definition ?? "",
    example: def?.example ?? "",
    translation,
  };
}
