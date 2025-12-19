import { useState, useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi, Address } from 'viem';
import type { Message } from '@/lib/chat/types';
import { decodeGroupRedPacketCid } from '@/lib/redpacket/encoding';

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
      enabled: enabled && !!communityAddress,
      staleTime: 1000 * 30, // 30秒内数据视为新鲜
      gcTime: 1000 * 60 * 5, // 5分钟后垃圾回收
      refetchOnWindowFocus: false // 禁用窗口聚焦刷新
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
      enabled: enabled && !!communityAddress && count > 0,
      staleTime: 1000 * 60 * 2, // 2分钟内数据视为新鲜
      gcTime: 1000 * 60 * 10, // 10分钟后垃圾回收
      refetchOnWindowFocus: false, // 禁用窗口聚焦刷新
      refetchOnReconnect: false // 禁用重连刷新
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

        // 解析红包
        const packetId = decodeGroupRedPacketCid(msg.cid);
        let content = msg.content;
        let type = 'text';

        if (packetId) {
          type = 'red-packet';
          content = JSON.stringify({
            packetId: packetId.toString(),
            message: msg.content,
            type: 'NORMAL', // 默认，详情页会更新
            status: 'active',
            amount: '0', // 列表页不显示具体金额
            count: 1
          });
        }

        return {
          id: `${msg.ts.toString()}-${msg.sender}-${start + index}`,
          sender: isOwn ? 'user' : 'other',
          timestamp: new Date(Number(msg.ts) * 1000),
          type: type as any,
          content: content,
          recipient: communityAddress as Address,
          isEncrypted: msg.kind === 1, // kind: 0=明文, 1=密文
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
