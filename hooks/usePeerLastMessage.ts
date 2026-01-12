import { Address, formatUnits } from 'viem';
import { useGetMessageCount, useGetMessages } from '@/lib/DirectMessageAbi';
import { useEffect, useMemo } from 'react';
import { useBlockNumber } from 'wagmi';

export function usePeerLastMessage(
  currentAddress: Address | undefined,
  peerAddress: Address,
  shouldFetch: boolean = true
) {
  // 获取最新区块号用于触发因为 Wagmi 缓存可能导致的不更新
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // 1. 获取消息总数
  const {
    data: countRaw,
    refetch: refetchCount,
    isLoading: isCountLoading
  } = useGetMessageCount(currentAddress || '0x', peerAddress, {
    query: {
      enabled: !!currentAddress && !!peerAddress && shouldFetch
    }
  });

  const count = countRaw as bigint;

  // 2. 如果有消息，获取最后一条
  const lastIndex = count ? count - 1n : 0n;
  const shouldFetchMessage =
    !!currentAddress &&
    !!peerAddress &&
    shouldFetch &&
    count !== undefined &&
    count > 0n;

  const {
    data: messagesRaw,
    refetch: refetchMessages,
    isLoading: isMessageLoading
  } = useGetMessages(
    currentAddress || '0x',
    peerAddress,
    lastIndex,
    1n // 只要最后一条
  );

  const messages = messagesRaw as any[]; // 暂时用 any[] 规避复杂类型

  // 监听区块变化刷新
  useEffect(() => {
    if (shouldFetch) {
      refetchCount();
      if (shouldFetchMessage) {
        refetchMessages();
      }
    }
  }, [
    blockNumber,
    shouldFetch,
    shouldFetchMessage,
    refetchCount,
    refetchMessages
  ]);

  const lastMessage = useMemo(() => {
    if (messages && messages.length > 0) {
      return messages[0];
    }
    return null;
  }, [messages]);

  const timestamp = useMemo(() => {
    if (lastMessage) {
      // 兼容直接属性访问和数组索引访问（以防 ABI 差异）
      return (lastMessage as any).timestamp || (lastMessage as any)[2] || 0n;
    }
    return undefined;
  }, [lastMessage]);

  return {
    lastMessage,
    timestamp,
    count,
    isLoading: isCountLoading || isMessageLoading,
    refetch: () => {
      refetchCount();
      refetchMessages();
    }
  };
}

// 格式化时间的辅助函数
export function formatMessageTime(
  timestamp: bigint | number | undefined
): string {
  if (!timestamp) return '';

  const date = new Date(Number(timestamp) * 1000); // 假设是秒
  const now = new Date();

  // 今天的消息显示 HH:mm
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // 昨天的消息显示 "昨天"
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }

  // 今年的消息显示 MM-DD
  if (date.getFullYear() === now.getFullYear()) {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  // 以前的消息显示 YYYY-MM-DD
  return date.toISOString().split('T')[0];
}
