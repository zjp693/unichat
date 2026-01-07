import { useState, useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';
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

// 红包群消息结构 (来自 getMainMessages)
interface RedPacketGroupMessage {
  from: Address;
  content: string;
  timestamp: bigint;
  subgroupId: number;
}

export function useCommunityMessages(
  communityAddress: string,
  currentUserAddress?: string,
  enabled: boolean = true,
  pageParams?: { start: number; count: number },
  /** 群聊类型：官方群(community) 或 红包群(redpacket) */
  groupType: 'community' | 'redpacket' = 'community'
) {
  const [messages, setMessages] = useState<Message[]>([]);

  const isCommunityGroup = groupType === 'community';
  const isRedPacketGroup = groupType === 'redpacket';

  // ============ 官方群消息总数 ============
  const {
    data: communityTotalCount,
    refetch: refetchCommunityCount,
    isLoading: isCommunityCountLoading
  } = useReadContract({
    address: communityAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'communityMessageCount',
    query: {
      enabled: enabled && !!communityAddress && isCommunityGroup,
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false
    }
  });

  // ============ 红包群消息总数 ============
  const {
    data: redPacketTotalCount,
    refetch: refetchRedPacketCount,
    isLoading: isRedPacketCountLoading
  } = useReadContract({
    address: communityAddress as `0x${string}`,
    abi: RedPacketGroupABI.abi as Abi,
    functionName: 'mainMessageCount',
    query: {
      enabled: enabled && !!communityAddress && isRedPacketGroup,
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false
    }
  });

  // 统一的消息总数
  const totalCount = isCommunityGroup
    ? Number(communityTotalCount || 0)
    : Number(redPacketTotalCount || 0);

  // ============ 分页参数计算 ============
  const { start, count } = useMemo(() => {
    if (pageParams) {
      return pageParams;
    }
    if (totalCount === 0) {
      return { start: 0, count: 0 };
    }
    const loadCount = Math.min(15, totalCount);
    const startIndex = Math.max(0, totalCount - loadCount);
    return { start: startIndex, count: loadCount };
  }, [totalCount, pageParams]);

  // ============ 官方群消息获取 ============
  const {
    data: communityRawMessages,
    refetch: refetchCommunityMessages,
    isLoading: isCommunityMessagesLoading
  } = useReadContract({
    address: communityAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'getPlaintextMessages',
    args: [BigInt(start), BigInt(count)],
    query: {
      enabled: enabled && !!communityAddress && count > 0 && isCommunityGroup,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  });

  // ============ 红包群消息获取 ============
  const {
    data: redPacketRawData,
    refetch: refetchRedPacketMessages,
    isLoading: isRedPacketMessagesLoading
  } = useReadContract({
    address: communityAddress as `0x${string}`,
    abi: RedPacketGroupABI.abi as Abi,
    functionName: 'getMainMessages',
    args: [BigInt(start), BigInt(count)],
    query: {
      enabled: enabled && !!communityAddress && count > 0 && isRedPacketGroup,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  });

  // ============ 格式化官方群消息 ============
  useEffect(() => {
    if (!isCommunityGroup) return;
    if (!communityRawMessages || !Array.isArray(communityRawMessages)) {
      setMessages([]);
      return;
    }

    const formattedMessages: Message[] = communityRawMessages.map(
      (msg: CommunityMessage, index: number) => {
        const isOwn =
          msg.sender.toLowerCase() === currentUserAddress?.toLowerCase();

        const packetId = decodeGroupRedPacketCid(msg.cid);
        let content = msg.content;
        let type = 'text';

        if (packetId) {
          type = 'red-packet';
          content = JSON.stringify({
            packetId: packetId.toString(),
            message: msg.content,
            type: 'NORMAL',
            status: 'active',
            amount: '0',
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
          isEncrypted: msg.kind === 1,
          originalContent: msg.content,
          isGroupMessage: true,
          senderAddress: msg.sender
        };
      }
    );

    setMessages(formattedMessages);
  }, [
    communityRawMessages,
    currentUserAddress,
    communityAddress,
    start,
    isCommunityGroup
  ]);

  // ============ 格式化红包群消息 ============
  useEffect(() => {
    if (!isRedPacketGroup) return;

    // getMainMessages 返回 [messages[], count]
    const rawData = redPacketRawData as
      | [RedPacketGroupMessage[], bigint]
      | undefined;
    if (!rawData || !Array.isArray(rawData[0])) {
      setMessages([]);
      return;
    }

    const rawMessages = rawData[0];
    console.log('[红包群消息] 获取到消息:', {
      count: rawMessages.length,
      start,
      rawData
    });

    const formattedMessages: Message[] = rawMessages.map(
      (msg: RedPacketGroupMessage, index: number) => {
        const isOwn =
          msg.from?.toLowerCase() === currentUserAddress?.toLowerCase();

        // 🎁 检查是否是红包消息
        let messageType: 'text' | 'red-packet' = 'text';
        let messageContent = msg.content || '';

        try {
          // 检查是否有 'index | json' 格式的前缀，如果有则提取真正的 JSON
          let jsonContent = msg.content || '{}';
          const pipeMatch = jsonContent.match(/^\d+\s*\|\s*(.+)$/);
          if (pipeMatch) {
            jsonContent = pipeMatch[1];
            messageContent = jsonContent; // 同时更新消息内容
          }

          const parsed = JSON.parse(jsonContent);
          // 如果包含 packetId 字段，或者包含 groupType=redpacket 的红包消息特征，说明是红包消息
          if (
            parsed.packetId ||
            (parsed.groupType === 'redpacket' &&
              (parsed.amount || parsed.tokenAddress))
          ) {
            messageType = 'red-packet';
            console.log('[红包群] 识别到红包消息:', parsed);
          }
        } catch (e) {
          // 不是 JSON，保持为普通文本消息
        }

        return {
          id: `${msg.timestamp.toString()}-${msg.from}-${start + index}`,
          sender: isOwn ? 'user' : 'other',
          timestamp: new Date(Number(msg.timestamp) * 1000),
          type: messageType,
          content: messageContent,
          recipient: communityAddress as Address,
          isEncrypted: false,
          originalContent: msg.content,
          isGroupMessage: true,
          senderAddress: msg.from
        };
      }
    );

    setMessages(formattedMessages);
  }, [
    redPacketRawData,
    currentUserAddress,
    communityAddress,
    start,
    isRedPacketGroup
  ]);

  // ============ 返回值 ============
  const refetch = () => {
    if (isCommunityGroup) {
      refetchCommunityCount();
      refetchCommunityMessages();
    } else {
      refetchRedPacketCount();
      refetchRedPacketMessages();
    }
  };

  return {
    messages,
    totalCount,
    isLoading: isCommunityGroup
      ? isCommunityMessagesLoading
      : isRedPacketMessagesLoading,
    isCountLoading: isCommunityGroup
      ? isCommunityCountLoading
      : isRedPacketCountLoading,
    refetch
  };
}
