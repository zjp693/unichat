import { useState, useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';
import RedPacketGroupViewABI from '@/contract/abi/RedPacketGroupView.json';
import { Abi, Address } from 'viem';
import type { Message } from '@/lib/chat/types';
import { decodeGroupRedPacketCid } from '@/lib/redpacket/encoding';

import { useChainId } from 'wagmi';
import { getContractAddress } from '@/lib/web3/contracts';

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
  const chainId = useChainId();
  const RED_PACKET_GROUP_VIEW_ADDRESS = getContractAddress(
    chainId,
    'redPacketGroupView'
  );

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
    address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
    abi: RedPacketGroupViewABI.abi as Abi,
    functionName: 'mainMessageCount',
    args: [communityAddress as Address],
    query: {
      enabled:
        enabled &&
        !!communityAddress &&
        isRedPacketGroup &&
        !!RED_PACKET_GROUP_VIEW_ADDRESS,
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
    address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
    abi: RedPacketGroupViewABI.abi as Abi,
    functionName: 'getMainMessages',
    args: [communityAddress as Address, BigInt(start), BigInt(count)],
    query: {
      enabled:
        enabled &&
        !!communityAddress &&
        count > 0 &&
        isRedPacketGroup &&
        !!RED_PACKET_GROUP_VIEW_ADDRESS,
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

        console.log('📝 [消息解析] 原始消息:', {
          index: start + index,
          from: msg.from,
          content: msg.content,
          timestamp: msg.timestamp.toString()
        });

        try {
          // 只要是以 "数字 |" 开头就算红包 (允许后面为空或非规范 JSON)
          const pipeMatch = messageContent.match(/^(\d+)\s*\|\s*([\s\S]*)$/);

          if (pipeMatch) {
            const extractedId = pipeMatch[1];
            const remainingPart = pipeMatch[2].trim();

            messageType = 'red-packet';

            // 构造默认红包数据，如果后面有 JSON 则合并
            let redPacketData: any = {
              packetId: extractedId,
              message: '恭喜发财，大吉大利',
              status: 'active'
            };

            if (remainingPart.startsWith('{')) {
              try {
                const parsed = JSON.parse(remainingPart);
                redPacketData = { ...redPacketData, ...parsed };
                // 确保 ID 以提取的为准
                redPacketData.packetId = extractedId;
                console.log('✅ [JSON 解析] 成功合并:', parsed);
              } catch (e) {
                // JSON 解析失败，保持默认数据
                console.warn(
                  '⚠️ [JSON 解析] 失败，使用默认数据:',
                  remainingPart
                );
              }
            }

            messageContent = JSON.stringify(redPacketData);
            console.log('🎁 [红包群] 识别到红包消息:', {
              packetId: extractedId,
              原始内容: msg.content,
              解析后JSON: redPacketData,
              最终content: messageContent
            });
          } else {
            // 不符合 "ID |" 格式的消息，视为普通文本
            messageType = 'text';
            console.log('💬 [普通消息] 文本内容:', msg.content);
          }
        } catch (e) {
          console.error('❌ [红包群] 消息类型判定过程出错:', e);
          messageType = 'text';
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
