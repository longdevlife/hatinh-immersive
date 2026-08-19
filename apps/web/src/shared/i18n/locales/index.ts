export type Dictionary = Record<string, string>;
export type DictionaryLanguage = 'vi' | 'en';

export async function loadDictionary(language: DictionaryLanguage): Promise<Dictionary> {
  if (language === 'en') {
    const { en } = await import('./en');
    return en;
  }

  const { vi } = await import('./vi');
  return vi;
}
