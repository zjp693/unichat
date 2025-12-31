import { RefObject, useEffect } from 'react';

/**
 * 检测点击元素外部的 Hook
 * @param ref 要监听的元素引用
 * @param handler 点击外部时的回调函数
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;

      // 如果点击的是元素内部，不执行handler
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
