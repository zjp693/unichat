import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';
import {
  DIRECT_MESSAGE_CONTRACT_ADDRESS,
  DirectMessageAbi,
  DMMessage
} from '@/lib/DirectMessageAbi';

/**
 * 获取指定对端的最后一条消息（包含时间戳）
 */
export function usePeerLastMessage(
  currentUser: Address | undefined,
  peerAddress: Address
) {
  // 先获取消息数量
  const { data: messageCount } = useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'messageCount',
    args: currentUser && peerAddress ? [currentUser, peerAddress] : undefined,
    query: {
      enabled: !!currentUser && !!peerAddress
    }
  });

  const count = messageCount as bigint | undefined;

  // 如果有消息，获取最后一条
  const { data: messages } = useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'getMessages',
    args:
      currentUser && peerAddress && count && count > BigInt(0)
        ? [currentUser, peerAddress, count - BigInt(1), BigInt(1)]
        : undefined,
    query: {
      enabled: !!currentUser && !!peerAddress && !!count && count > BigInt(0)
    }
  });

  // 提取最后一条消息
  const lastMessage =
    messages && Array.isArray(messages) && messages.length > 0
      ? (messages[0] as unknown as DMMessage)
      : null;

  return {
    lastMessage,
    timestamp: lastMessage?.timestamp,
    isLoading: messageCount === undefined
  };
}

/**
 * 格式化时间戳为相对时间或具体时间
 */
export function formatMessageTime(timestamp: bigint | undefined): string {
  if (!timestamp) return '-';

  const messageTime = new Date(Number(timestamp) * 1000);
  const now = new Date();
  const diffMs = now.getTime() - messageTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // 今天的消息显示时分
  if (diffDays === 0) {
    return messageTime.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // 昨天
  if (diffDays === 1) {
    return '昨天';
  }

  // 一周内显示星期
  if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[messageTime.getDay()];
  }

  // 更早的显示日期
  return messageTime.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });
}
