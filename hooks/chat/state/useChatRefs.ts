import { useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * 聊天引用管理 Hook
 * 负责管理聊天页面的所有 Ref 对象
 */
export function useChatRefs() {
  // --- DOM 引用 ---
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<React.ElementRef<typeof ScrollArea>>(null);
  const actionsPanelContentRef = useRef<HTMLDivElement>(null);

  // --- 数据引用 (不触发重渲染的状态) ---

  // 用于保存待调整的滚动信息
  const pendingScrollAdjustmentRef = useRef<{
    previousHeight: number;
    previousTop: number;
  } | null>(null);

  // 跟踪上次处理的范围
  const lastProcessedRangeRef = useRef<{ start: number; count: number } | null>(
    null
  );

  // 跟踪群聊消息是否已初始化
  const groupMessagesInitializedRef = useRef(false);

  return {
    inputRef,
    scrollAreaRef,
    actionsPanelContentRef,
    pendingScrollAdjustmentRef,
    lastProcessedRangeRef,
    groupMessagesInitializedRef
  };
}
