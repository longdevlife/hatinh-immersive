import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadDictionary, type Dictionary } from './locales';

export const UI_LANGUAGES = [
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
] as const;

export type UiLanguageCode = (typeof UI_LANGUAGES)[number]['code'];

type Translate = (key: string, values?: Record<string, string | number>) => string;

interface I18nContextValue {
  language: UiLanguageCode;
  setLanguage: (language: UiLanguageCode) => void;
  languages: typeof UI_LANGUAGES;
  t: Translate;
}

const STORAGE_KEY = 'hatinh.uiLanguage';
const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'] as const;
const SKIP_SELECTOR =
  "script,style,noscript,canvas,code,pre,textarea,[contenteditable='true'],[data-no-i18n]";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguageCode>(() => readStoredLanguage());
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const textOriginals = useRef(new WeakMap<Text, string>());
  const attrOriginals = useRef(new WeakMap<Element, Map<string, string>>());
  const scanTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let active = true;
    setDictionary(null);

    void loadDictionary(language)
      .then((nextDictionary) => {
        if (active) setDictionary(nextDictionary);
      })
      .catch(() => {
        if (active) setDictionary({});
      });

    return () => {
      active = false;
    };
  }, [language]);

  const setLanguage = useCallback(
    (nextLanguage: UiLanguageCode) => {
      if (nextLanguage === language) return;

      setLanguageState(nextLanguage);
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      document.documentElement.lang = nextLanguage;
      window.location.reload();
    },
    [language],
  );

  const t = useCallback<Translate>(
    (key, values) => interpolate(dictionary?.[key] ?? key, values),
    [dictionary],
  );

  const value = useMemo(
    () => ({ language, setLanguage, languages: UI_LANGUAGES, t }),
    [language, setLanguage, t],
  );

  const translateDom = useCallback(() => {
    if (!document.body || !dictionary) return;
    translateRenderedDom(document.body, dictionary, textOriginals.current, attrOriginals.current);
  }, [dictionary]);

  useEffect(() => {
    if (!dictionary) return;

    translateDom();

    const observer = new MutationObserver(() => {
      window.clearTimeout(scanTimer.current);
      scanTimer.current = window.setTimeout(translateDom, 60);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTES],
    });

    return () => {
      observer.disconnect();
      window.clearTimeout(scanTimer.current);
    };
  }, [dictionary, translateDom]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const defaultContextValue: I18nContextValue = {
  language: 'vi',
  setLanguage: () => {},
  languages: UI_LANGUAGES,
  t: (key) => key,
};

export function useI18n() {
  const context = useContext(I18nContext);
  return context ?? defaultContextValue;
}

export function LanguageSwitcher() {
  const { language, languages, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const selectedLanguage = languages.find((item) => item.code === language) ?? languages[0];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        data-no-i18n
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          height: '36px',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '9999px',
          border: '1px solid var(--theme-border, #e2e8f0)',
          background: 'var(--theme-bg-surface, #ffffff)',
          padding: '0 12px',
          fontSize: '12px',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.025em',
          color: 'var(--theme-text-primary, #475569)',
          cursor: 'pointer',
          boxShadow: 'var(--theme-shadow, 0 1px 2px 0 rgba(0, 0, 0, 0.05))',
          transition: 'all 0.2s ease',
        }}
        aria-label="Change language"
      >
        <FlagIcon code={selectedLanguage.code} />
        <span>{selectedLanguage.code}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--theme-text-muted, #94a3b8)' }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            data-no-i18n
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 4px)',
              width: '176px',
              borderRadius: '12px',
              border: '1px solid var(--theme-border, #e2e8f0)',
              background: 'var(--theme-bg-surface-elevated, #ffffff)',
              padding: '6px',
              boxShadow: 'var(--theme-shadow-lg, 0 20px 25px -5px rgba(0, 0, 0, 0.1))',
              zIndex: 50,
            }}
          >
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLanguage(item.code);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  width: '100%',
                  cursor: 'pointer',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  border: 'none',
                  background:
                    item.code === language ? 'var(--theme-primary-bg, #eff6ff)' : 'transparent',
                  color:
                    item.code === language
                      ? 'var(--theme-primary, #2563eb)'
                      : 'var(--theme-text-primary, #475569)',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(event) => {
                  if (item.code !== language) {
                    event.currentTarget.style.background = 'var(--theme-bg-subtle, #f8fafc)';
                  }
                }}
                onMouseOut={(event) => {
                  if (item.code !== language) event.currentTarget.style.background = 'transparent';
                }}
              >
                <FlagIcon code={item.code} />
                <span style={{ flex: 1 }}>{item.nativeLabel}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FlagIcon({ code }: { code: UiLanguageCode }) {
  const clipId = `flag-clip-${code}`;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{
        height: '16px',
        width: '16px',
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: '9999px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.1) inset',
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{renderFlagSvg(code)}</g>
    </svg>
  );
}

function renderFlagSvg(code: UiLanguageCode) {
  switch (code) {
    case 'vi':
      return (
        <>
          <rect width="24" height="24" fill="#da251d" />
          <polygon
            points="12,5 13.65,10.05 18.96,10.05 14.66,13.17 16.31,18.22 12,15.1 7.69,18.22 9.34,13.17 5.04,10.05 10.35,10.05"
            fill="#ffde00"
          />
        </>
      );
    case 'en':
      return (
        <>
          <rect width="24" height="24" fill="#012169" />
          <path d="M0 0 24 24M24 0 0 24" stroke="#fff" strokeWidth="5" />
          <path d="M0 0 24 24M24 0 0 24" stroke="#c8102e" strokeWidth="2.5" />
          <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="8" />
          <path d="M12 0v24M0 12h24" stroke="#c8102e" strokeWidth="4.5" />
        </>
      );
    default:
      return <rect width="24" height="24" fill="#e2e8f0" />;
  }
}

function readStoredLanguage(): UiLanguageCode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return UI_LANGUAGES.some((language) => language.code === stored)
    ? (stored as UiLanguageCode)
    : 'vi';
}

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ''));
}

function translateRenderedDom(
  root: HTMLElement,
  dictionary: Dictionary,
  textOriginals: WeakMap<Text, string>,
  attrOriginals: WeakMap<Element, Map<string, string>>,
) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return shouldTranslate(node.nodeValue ?? '')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const current = node.nodeValue ?? '';
    const previousSource = textOriginals.get(node);
    const previousTranslation = previousSource
      ? translateWithWhitespace(previousSource, dictionary)
      : undefined;
    if (!previousSource || current !== previousTranslation) textOriginals.set(node, current);
    const source = textOriginals.get(node) ?? current;
    node.nodeValue = translateWithWhitespace(source, dictionary);
  }

  const elements = root.querySelectorAll<HTMLElement>(
    ATTRIBUTES.map((attribute) => `[${attribute}]`).join(','),
  );
  for (const element of elements) {
    if (element.closest(SKIP_SELECTOR)) continue;
    let originals = attrOriginals.get(element);
    if (!originals) {
      originals = new Map();
      attrOriginals.set(element, originals);
    }

    for (const attribute of ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (!current || !shouldTranslate(current)) continue;
      const previousSource = originals.get(attribute);
      const previousTranslation = previousSource
        ? translateWithWhitespace(previousSource, dictionary)
        : undefined;
      if (!previousSource || current !== previousTranslation) originals.set(attribute, current);
      const source = originals.get(attribute) ?? current;
      element.setAttribute(attribute, translateWithWhitespace(source, dictionary));
    }
  }
}

function shouldTranslate(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length < 2) return false;
  if (/^[\d\s.,:%()[\]{}+\-*/|#@!$&]+$/.test(normalized)) return false;
  if (/^https?:\/\//i.test(normalized) || normalized.includes('@')) return false;
  return true;
}

function translateWithWhitespace(source: string, dictionary: Dictionary) {
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  const trimmed = source.replace(/\s+/g, ' ').trim();
  return `${leading}${dictionary[trimmed] ?? trimmed}${trailing}`;
}
