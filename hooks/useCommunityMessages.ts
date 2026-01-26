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
    args: [
      communityAddress as Address,
      currentUserAddress as Address, // viewer 参数
      BigInt(start),
      BigInt(count)
    ],
    query: {
      enabled:
        enabled &&
        !!communityAddress &&
        !!currentUserAddress && // 需要用户地址
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

    const formattedMessages: Message[] = rawMessages.map(
      (msg: RedPacketGroupMessage, index: number) => {
        const isOwn =
          msg.from?.toLowerCase() === currentUserAddress?.toLowerCase();

        // 🎁 检查是否是红包消息
        let messageType: 'text' | 'red-packet' = 'text';
        let messageContent = msg.content || '';

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
              } catch (e) {
                // JSON 解析失败，保持默认数据
              }
            }

            messageContent = JSON.stringify(redPacketData);
          } else {
            // 不符合 "ID |" 格式的消息，视为普通文本
            messageType = 'text';
          }
        } catch (e) {
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

    setMessages((prev) => {
      // 1. 获取本地处于 sending 状态的消息
      const sendingMessages = prev.filter((m) => m.status === 'sending');

      if (sendingMessages.length === 0) {
        return formattedMessages;
      }

      // 2. 检查这些 sending 消息是否已经包含在新拉取的数据中
      const remainingSending = sendingMessages.filter((pending) => {
        // 在新列表中查找是否有匹配项
        const found = formattedMessages.some((onChain) => {
          // 必须是当前用户发送的
          if (
            onChain.senderAddress?.toLowerCase() !==
            currentUserAddress?.toLowerCase()
          ) {
            return false;
          }

          // 时间戳检查：链上消息时间不应早于本地发送时间太多（放宽到 10分钟容差防止时钟不同步）
          // 但主要依靠内容匹配
          const pendingContent = pending.originalContent || pending.content;
          const chainContent = onChain.originalContent || onChain.content;

          if (!pendingContent || !chainContent) return false;

          // 内容匹配逻辑
          return (
            chainContent === pendingContent || // 完全匹配
            // 红包群特殊格式匹配: "ID | 本地内容"
            (chainContent.includes('|') &&
              chainContent.trim().endsWith(pendingContent.trim()))
          );
        });

        // 如果在链上找到了，说明已成功，从 pending 列表中移除
        return !found;
      });

      // 3. 合并：链上消息 + 尚未上链的 pending 消息
      return [...formattedMessages, ...remainingSending];
    });
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
