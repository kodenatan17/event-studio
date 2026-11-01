const graphemes = new Intl.Segmenter('id', { granularity: 'grapheme' });

function initial(name: string): string {
  const [first] = graphemes.segment(name.trim());
  return first?.segment.toLocaleUpperCase('id-ID') ?? '';
}

/** First letter of each name, whole even when it is several code points. */
export function monogramLetters(groom: string, bride: string): [string, string] {
  return [initial(groom), initial(bride)];
}
