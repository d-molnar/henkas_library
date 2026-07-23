import { en, type MessageKey } from './locales/en';
import { sk } from './locales/sk';

export type { MessageKey };

const dicts = { en, sk } as const;
export type LocaleCode = keyof typeof dicts;

export const LOCALES: { code: LocaleCode; name: string }[] = [
	{ code: 'en', name: 'English' },
	{ code: 'sk', name: 'Slovenčina' }
];

const DEFAULT: LocaleCode = 'en';
const STORAGE_KEY = 'henkas-lib:locale';

function detectInitial(): LocaleCode {
	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved && saved in dicts) return saved as LocaleCode;
	}
	if (typeof navigator !== 'undefined') {
		const nav = navigator.language.slice(0, 2);
		if (nav in dicts) return nav as LocaleCode;
	}
	return DEFAULT;
}

// Reactive locale state (runes). Reading `i18n.locale` inside t() makes every
// t(...) call in markup re-render when the locale changes.
export const i18n = $state<{ locale: LocaleCode }>({ locale: detectInitial() });

export function setLocale(code: LocaleCode) {
	i18n.locale = code;
	if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
	if (typeof document !== 'undefined') document.documentElement.lang = code;
}

type Params = Record<string, string | number>;

export function t(key: MessageKey, params?: Params): string {
	const dict = dicts[i18n.locale] as Partial<Record<MessageKey, string>>;
	let msg = dict[key] ?? en[key] ?? key;
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			msg = msg.replaceAll(`{${k}}`, String(v));
		}
	}
	return msg;
}

/** Locale-aware date formatting (uses the browser Intl with the active locale). */
export function formatDate(ts: number, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
	return new Intl.DateTimeFormat(i18n.locale, opts).format(new Date(ts));
}
