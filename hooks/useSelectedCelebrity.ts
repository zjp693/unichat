'use client';

import { useCallback, useEffect, useState } from 'react';

// 宽松方案：不限定结构，存什么就是什么
export type SelectedCelebrity = unknown;

const STORAGE_KEY = 'selectedCelebrity';

function readFromStorage(): SelectedCelebrity | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 兼容包裹格式 { v: any }
    return (parsed?.v ?? parsed) as SelectedCelebrity;
  } catch {
    return null;
  }
}

function writeToStorage(value: SelectedCelebrity | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function useSelectedCelebrity() {
  const [selected, setSelected] = useState<SelectedCelebrity | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // 初始读取
  useEffect(() => {
    setSelected(readFromStorage());
    setHydrated(true);
  }, []);

  // 同步跨标签页更改
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSelected(readFromStorage());
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
  }, []);

  const setSelectedCelebrity = useCallback((value: SelectedCelebrity) => {
    setSelected(value);
    writeToStorage(value);
  }, []);

  const clearSelectedCelebrity = useCallback(() => {
    setSelected(null);
    writeToStorage(null);
  }, []);

  return { selected, setSelectedCelebrity, clearSelectedCelebrity, hydrated };
}

// 非 Hook 场景的便捷函数
export function setSelectedCelebrityDirect(value: SelectedCelebrity) {
  writeToStorage(value);
}

export function getSelectedCelebrityDirect(): SelectedCelebrity | null {
  return readFromStorage();
}


