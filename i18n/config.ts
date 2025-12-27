/**
 * 国际化配置
 * 支持的语言列表和默认语言设置
 */

// 支持的语言列表
export const locales = [
  'zh-CN', // 简体中文（默认）
  'zh-TW', // 繁体中文
  'en-US', // 美式英语
  'es', // 西班牙语
  'fr', // 法语
  'de', // 德语
  'it', // 意大利语
  'pt', // 葡萄牙语
  'ru', // 俄罗斯语
  'ja', // 日语
  'ko', // 韩语
  'th', // 泰语
  'vi', // 越南语
  'id', // 印尼语
  'hi', // 印地语
  'ar' // 阿拉伯语（RTL）
] as const;

// 默认语言
export const defaultLocale = 'zh-CN';

// 语言类型
export type Locale = (typeof locales)[number];

// RTL 语言列表
export const rtlLocales: Locale[] = ['ar'];

// 语言显示名称映射
export const localeNames: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en-US': 'English (US)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  hi: 'हिन्दी',
  ar: 'العربية'
};

// 判断是否为 RTL 语言
export const isRtlLocale = (locale: Locale): boolean => {
  return rtlLocales.includes(locale);
};
