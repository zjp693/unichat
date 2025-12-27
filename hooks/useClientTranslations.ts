'use client';

import { useState, useEffect } from 'react';
import { type Locale } from '@/i18n/config';

// 导入所有翻译文件
import zhCN from '@/messages/zh-CN.json';
import zhTW from '@/messages/zh-TW.json';
import enUS from '@/messages/en-US.json';

const messages: Record<Locale, any> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS,
  // 其他语言暂时用简体中文
  es: zhCN,
  fr: zhCN,
  de: zhCN,
  it: zhCN,
  pt: zhCN,
  ru: zhCN,
  ja: zhCN,
  ko: zhCN,
  th: zhCN,
  vi: zhCN,
  id: zhCN,
  hi: zhCN,
  ar: zhCN
};

/**
 * 简单的客户端翻译 Hook
 * 从 localStorage 读取用户选择的语言
 */
export function useTranslations() {
  const [locale, setLocale] = useState<Locale>('zh-CN');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // 从 localStorage 读取语言设置
    const savedLocale = localStorage.getItem('preferred-locale') as Locale;
    if (savedLocale && messages[savedLocale]) {
      setLocale(savedLocale);
    }
  }, []);

  // 翻译函数
  const t = (key: string, params?: Record<string, any>): string => {
    if (!isClient) {
      // 服务端渲染时返回简体中文
      return getNestedValue(messages['zh-CN'], key) || key;
    }

    const translation = messages[locale];
    let text = getNestedValue(translation, key) || key;

    // 替换参数 {count} -> 42
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }

    return text;
  };

  return { t, locale, setLocale };
}

// 辅助函数：获取嵌套对象的值
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return '';
    }
  }

  return typeof value === 'string' ? value : '';
}
