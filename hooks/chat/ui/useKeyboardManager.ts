import { useEffect, RefObject } from 'react';

interface UseKeyboardManagerProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  isClient: boolean;
  panelHeight: number;
  isActionsOpen: boolean;
  setPanelHeight: (height: number) => void;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
}

/**
 * 键盘管理 Hook
 * 负责处理移动端键盘高度、焦点事件等
 */
export function useKeyboardManager({
  inputRef,
  isClient,
  panelHeight,
  isActionsOpen,
  setPanelHeight,
  scrollToBottom
}: UseKeyboardManagerProps) {
  // 动态"学习"软键盘高度
  useEffect(() => {
    if (!isClient) return;

    let timeoutId: NodeJS.Timeout;

    const updateKeyboardHeight = () => {
      // 使用 visualViewport API 获取更准确的高度信息
      if (window.visualViewport) {
        const keyboardHeight =
          window.innerHeight - window.visualViewport.height;

        // 只有当键盘高度足够大时才更新（避免误判）
        if (keyboardHeight > 100) {
          setPanelHeight(keyboardHeight);
          // 当键盘弹起时，确保滚动到底部
          timeoutId = setTimeout(() => scrollToBottom('smooth'), 100);
        } else if (
          keyboardHeight <= 100 &&
          panelHeight > 0 &&
          isActionsOpen === false
        ) {
          // 键盘收起时，并且功能面板是关闭状态，重置面板高度为0
          // 注意：此处不应将 panelHeight 重置为 250，因为 250 是功能面板的默认高度
          // 如果功能面板是打开状态，则 panelHeight 会保持为功能面板的高度 (250)
          setPanelHeight(0);
          timeoutId = setTimeout(() => scrollToBottom('smooth'), 100);
        }
      }
    };

    // 同时监听 resize 和 scroll 事件以提高兼容性
    window.visualViewport?.addEventListener('resize', updateKeyboardHeight);
    window.visualViewport?.addEventListener('scroll', updateKeyboardHeight);

    // 添加 focusin 事件监听器，当聊天输入框获得焦点时确保滚动到底部
    const handleFocusIn = (e: FocusEvent) => {
      // 只有当聚焦的元素是聊天输入框时才滚动到底部
      if (e.target === inputRef.current) {
        // 确保输入框可见
        setTimeout(() => {
          if (window.visualViewport) {
            const keyboardHeight =
              window.innerHeight - window.visualViewport.height;
            if (keyboardHeight > 100) {
              setPanelHeight(keyboardHeight);
            }
          }
          scrollToBottom('smooth');
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.visualViewport?.removeEventListener(
        'resize',
        updateKeyboardHeight
      );
      window.visualViewport?.removeEventListener(
        'scroll',
        updateKeyboardHeight
      );
      document.removeEventListener('focusin', handleFocusIn);
      clearTimeout(timeoutId);
    };
  }, [
    isClient,
    panelHeight,
    isActionsOpen,
    scrollToBottom,
    inputRef,
    setPanelHeight
  ]);
}
