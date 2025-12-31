import { useState, useEffect, useMemo } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi, Address, parseAbiItem } from 'viem';
import type { Message } from '@/lib/chat/types';
import { decodeGroupRedPacketCid } from '@/lib/redpacket/encoding';

interface CommunityMessage {
  sender: Address;
  ts: bigint;
  kind: number;
  content: string;
  cid: string;
}

// RedPacketGroup 的 MainMessage 事件 ABI
const MainMessageEvent = parseAbiItem(
  'event MainMessage(address indexed from, string content)'
);

export function useCommunityMessages(
  communityAddress: string,
  currentUserAddress?: string,
  enabled: boolean = true,
  pageParams?: { start: number; count: number },
  /** 群聊类型：官方群(community) 或 红包群(redpacket) */
  groupType: 'community' | 'redpacket' = 'community'
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRedPacketLoading, setIsRedPacketLoading] = useState(false);
  const [redPacketTotalCount, setRedPacketTotalCount] = useState(0);

  const publicClient = usePublicClient();
  const isCommunityGroup = groupType === 'community';
  const isRedPacketGroup = groupType === 'redpacket';

  // ============ 官方群逻辑 ============
  const {
    data: totalCount,
    refetch: refetchCount,
    isLoading: isCountLoading
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
      enabled: enabled && !!communityAddress && count > 0 && isCommunityGroup,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  });

  // 格式化官方群消息
  useEffect(() => {
    if (!isCommunityGroup) return;
    if (!rawMessages || !Array.isArray(rawMessages)) {
      setMessages([]);
      return;
    }

    const formattedMessages: Message[] = rawMessages.map(
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
    rawMessages,
    currentUserAddress,
    communityAddress,
    start,
    isCommunityGroup
  ]);

  // ============ 红包群逻辑 ============
  useEffect(() => {
    if (!isRedPacketGroup || !enabled || !communityAddress || !publicClient) {
      return;
    }

    const fetchRedPacketMessages = async () => {
      setIsRedPacketLoading(true);
      try {
        // 获取 MainMessage 事件历史（最近 5000 个区块）
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

        console.log('[红包群历史消息] 开始查询', {
          communityAddress,
          currentBlock: currentBlock.toString(),
          fromBlock: fromBlock.toString()
        });

        const logs = await publicClient.getLogs({
          address: communityAddress as `0x${string}`,
          event: MainMessageEvent,
          fromBlock,
          toBlock: 'latest'
        });

        console.log('[红包群历史消息] 查询结果', {
          logsCount: logs.length,
          logs: logs.map((l) => ({
            from: l.args?.from,
            content: l.args?.content
          }))
        });

        setRedPacketTotalCount(logs.length);

        // 转换为 Message 格式
        const formattedMessages: Message[] = await Promise.all(
          logs.map(async (log, index) => {
            const { from, content } = log.args as {
              from: Address;
              content: string;
            };
            const isOwn =
              from?.toLowerCase() === currentUserAddress?.toLowerCase();

            // 获取区块时间
            let timestamp = new Date();
            if (log.blockNumber) {
              try {
                const block = await publicClient.getBlock({
                  blockNumber: log.blockNumber
                });
                timestamp = new Date(Number(block.timestamp) * 1000);
              } catch (e) {
                console.warn('Failed to get block timestamp:', e);
              }
            }

            // 🎁 检查是否是红包消息
            let messageType: 'text' | 'red-packet' = 'text';
            let messageContent = content || '';

            try {
              const parsed = JSON.parse(content || '{}');
              // 如果包含 packetId 字段，说明是红包消息
              if (parsed.packetId) {
                messageType = 'red-packet';
                console.log('[红包群] 识别到红包消息:', parsed);
              }
            } catch (e) {
              // 不是 JSON，保持为普通文本消息
            }

            return {
              id: `${log.blockNumber}-${from}-${index}`,
              sender: isOwn ? 'user' : 'other',
              timestamp,
              type: messageType,
              content: messageContent,
              recipient: communityAddress as Address,
              isEncrypted: false,
              originalContent: content || '',
              isGroupMessage: true,
              senderAddress: from
            };
          })
        );

        setMessages(formattedMessages);
      } catch (error) {
        console.error('[红包群消息] 获取失败:', error);
        setMessages([]);
      } finally {
        setIsRedPacketLoading(false);
      }
    };

    fetchRedPacketMessages();
  }, [
    isRedPacketGroup,
    enabled,
    communityAddress,
    currentUserAddress,
    publicClient
  ]);

  // ============ 返回值 ============
  const refetch = () => {
    if (isCommunityGroup) {
      refetchCount();
      refetchMessages();
    }
    // 红包群暂时不支持手动刷新，因为 getLogs 是异步的
  };

  return {
    messages,
    totalCount: isCommunityGroup
      ? Number(totalCount || 0)
      : redPacketTotalCount,
    isLoading: isCommunityGroup ? isMessagesLoading : isRedPacketLoading,
    isCountLoading: isCommunityGroup ? isCountLoading : false,
    refetch
  };
}
