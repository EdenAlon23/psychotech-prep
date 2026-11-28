import { useEffect, useState } from 'react';
import type { SectionMeta } from '../models/question';
import { currentExam } from '../services/profile';

/**
 * Tiny i18n layer. The UI language follows the chosen exam: Hebrew (RTL) for Israeli exams,
 * English (LTR) for SAT / GMAT. Strings live next to the code as he/en pairs – with two languages
 * that is easier to keep in sync than a key dictionary, and it type-checks for free.
 */
export type Lang = 'he' | 'en';

export const uiLang = (): Lang => currentExam().lang;

/** Pick the string for the current (or given) language. Usable outside React (services, plan titles). */
export const tr = (he: string, en: string, lang: Lang = uiLang()): string => (lang === 'en' ? en : he);

export const localeOf = (lang: Lang): string => (lang === 'en' ? 'en-US' : 'he-IL');

/** Sets <html lang/dir> so the browser, screen readers and CSS logical properties follow the language. */
export function applyDocumentLang(lang: Lang): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
}

/** Current UI language, updated when the profile (exam) changes. */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(uiLang);
  useEffect(() => {
    const f = () => setLang(uiLang());
    window.addEventListener('pp:profile', f);
    return () => window.removeEventListener('pp:profile', f);
  }, []);
  return lang;
}

/** `const { t, lang } = useT();  t('שלום', 'Hello')` */
export function useT() {
  const lang = useLang();
  return { lang, t: (he: string, en: string) => (lang === 'en' ? en : he), locale: localeOf(lang) };
}

/** Section texts in the UI language (sections without an English variant fall back to Hebrew). */
export function sectionText(meta: SectionMeta, lang: Lang = uiLang()): Pick<SectionMeta, 'title' | 'short' | 'description' | 'tips'> {
  return lang === 'en' && meta.en ? { ...meta.en } : meta;
}
