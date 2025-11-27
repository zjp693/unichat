import { useState, useEffect, useMemo } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi, Address } from 'viem';
import type { Message } from '@/lib/chat/types';

interface CommunityMessage {
  sender: Address;
  ts: bigint;
  kind: number;
  content: string;
  cid: string;
}

export function useCommunityMessages(
  communityAddress: string,
  currentUserAddress?: string,
  enabled: boolean = true,
  pageParams?: { start: number; count: number }
) {
  const [messages, setMessages] = useState<Message[]>([]);

  const {
    data: totalCount,
    refetch: refetchCount,
    isLoading: isCountLoading
  } = useReadContract({
    address: communityAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'communityMessageCount',
    query: {
      enabled: enabled && !!communityAddress
    }
  });

  // 2. 计算加载范围
  const { start, count } = useMemo(() => {
    if (pageParams) {
      return pageParams;
    }

    const total = Number(totalCount || 0);
    if (total === 0) {
      return { start: 0, count: 0 };
    }

    const loadCount = Math.min(15, total);
    const startIndex = Math.max(0, total - loadCount);
    return { start: startIndex, count: loadCount };
  }, [totalCount, pageParams]);

  const {
    data: rawMessages,
    refetch: refetchMessages,
    isLoading: isMessagesLoading
  } = useReadContract({
    address: communityAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'getPlaintextMessages',
    args: [BigInt(start), BigInt(count)],
    query: {
      enabled: enabled && !!communityAddress && count > 0
    }
  });

  // 4. 格式化消息
  useEffect(() => {
    if (!rawMessages || !Array.isArray(rawMessages)) {
      setMessages([]);
      return;
    }

    const formattedMessages: Message[] = rawMessages.map(
      (msg: CommunityMessage, index: number) => {
        const isOwn =
          msg.sender.toLowerCase() === currentUserAddress?.toLowerCase();

        return {
          id: `${msg.ts.toString()}-${msg.sender}-${start + index}`,
          sender: isOwn ? 'user' : 'other',
          timestamp: new Date(Number(msg.ts) * 1000),
          type: 'text' as const,
          content: msg.content,
          recipient: communityAddress as Address,
          isEncrypted: false,
          originalContent: msg.content,
          isGroupMessage: true,
          senderAddress: msg.sender
        };
      }
    );

    setMessages(formattedMessages);
  }, [rawMessages, currentUserAddress, communityAddress, start]);

  const refetch = () => {
    refetchCount();
    refetchMessages();
  };

  return {
    messages,
    totalCount: Number(totalCount || 0),
    isLoading: isMessagesLoading,
    isCountLoading,
    refetch
  };
}
