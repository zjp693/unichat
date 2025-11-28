import { useCallback, RefObject } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UseScrollManagerProps {
  scrollAreaRef: RefObject<React.ElementRef<typeof ScrollArea> | null>;
  setPanelHeight: (height: number) => void;
}

/**
 * 滚动管理 Hook
 * 负责处理滚动相关的操作
 */
export function useScrollManager({
  scrollAreaRef,
  setPanelHeight
}: UseScrollManagerProps) {
  /**
   * 滚动到底部
   */
  const scrollToBottom = useCallback(
    (behavior: 'smooth' | 'auto' = 'smooth') => {
      if (!scrollAreaRef.current) return;
      const viewport = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (viewport) {
        // 在iOS上确保输入框可见
        if (window.visualViewport) {
          const keyboardHeight =
            window.innerHeight - window.visualViewport.height;
          if (keyboardHeight > 100) {
            setPanelHeight(keyboardHeight);
          }
        }
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      }
    },
    [scrollAreaRef, setPanelHeight]
  );

  return {
    scrollToBottom
  };
}
