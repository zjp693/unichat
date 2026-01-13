import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect
} from 'react';
import {
  useGetMessages,
  useGetMessageCount,
  useListenMessageSent,
  DMMessage
} from '@/lib/DirectMessageAbi';
import { useCommunityMessages } from '@/hooks/useCommunityMessages';
import { useListenCommunityMessage } from '@/hooks/useListenCommunityMessage';
import type { Message } from '@/lib/chat/types';
import type { KeyPair } from '@/lib/keyManagement';
import type { Address } from 'viem';
import dayjs from 'dayjs';
import { MESSAGES_PER_LOAD } from '@/lib/chat/constants';
import { computeConvoId } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { decodeDmRedPacketContent } from '@/lib/redpacket/encoding';

interface UseMessageLoaderProps {
  conversationId: string;
  chatType: 'private' | 'group';
  currentAddress: Address | undefined;
  recipientAddress: Address;
  groupAddress: string | null;
  keys: KeyPair[];
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  invitedMembersMessage?: string;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
  /** 群聊类型：官方群(community) 或 红包群(redpacket) */
  groupType?: 'community' | 'redpacket';
}

export function useMessageLoader({
  conversationId,
  chatType,
  currentAddress,
  recipientAddress,
  groupAddress,
  keys,
  scrollAreaRef,
  invitedMembersMessage,
  scrollToBottom,
  groupType = 'community'
}: UseMessageLoaderProps) {
  const { isConnected } = useAccount();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Pagination State
  const [fetchParams, setFetchParams] = useState<{
    start: number;
    count: number;
  }>({ start: 0, count: 0 });
  const [oldestLoadedIndex, setOldestLoadedIndex] = useState<number | null>(
    null
  );

  // Refs
  const lastProcessedRangeRef = useRef<{ start: number; count: number } | null>(
    null
  );
  const pendingScrollAdjustmentRef = useRef<{
    previousHeight: number;
    previousTop: number;
  } | null>(null);

  // Computed
  const currentConvoId =
    chatType === 'private' && currentAddress && recipientAddress
      ? computeConvoId(currentAddress, recipientAddress)
      : undefined;

  // Hooks
  // 1. Private Chat Count
  const { data: privateCount } = useGetMessageCount(
    currentAddress!,
    recipientAddress,
    {
      query: {
        enabled:
          !!currentAddress && !!recipientAddress && chatType === 'private'
      }
    }
  );

  // 2. Group Chat Messages & Count
  const {
    messages: groupMessages,
    totalCount: groupTotalCount,
    isLoading: isGroupLoading,
    isCountLoading: isGroupCountLoading
  } = useCommunityMessages(
    groupAddress || '',
    currentAddress,
    chatType === 'group',
    chatType === 'group' ? fetchParams : undefined,
    groupType
  );

  const totalCount =
    chatType === 'private' ? Number(privateCount || 0) : groupTotalCount;

  // 3. Private Chat Messages
  const { data: rawMessagesData, isLoading: isPrivateLoading } = useGetMessages(
    currentAddress!,
    recipientAddress,
    BigInt(fetchParams.start),
    BigInt(fetchParams.count)
  );
  const rawMessages = rawMessagesData as DMMessage[] | undefined;

  // 1️⃣ Reset on conversation change & Cleanup on unmount
  useEffect(() => {
    setMessages([]);
    setIsLoading(true);
    setIsFetchingMore(false);
    setOldestLoadedIndex(null);
    setFetchParams({ start: 0, count: 0 });
    lastProcessedRangeRef.current = null;

    return () => {
      setMessages([]);
      setIsLoading(true);
      setIsFetchingMore(false);
      setOldestLoadedIndex(null);
      setFetchParams({ start: 0, count: 0 });
      lastProcessedRangeRef.current = null;
    };
  }, [conversationId, currentAddress]);

  // 2️⃣ Initial Pagination Setup
  useEffect(() => {
    if (
      totalCount > 0 &&
      oldestLoadedIndex === null &&
      fetchParams.count === 0
    ) {
      const start = Math.max(0, totalCount - MESSAGES_PER_LOAD);
      const count = totalCount - start;
      setFetchParams({ start, count });
    }
  }, [totalCount, oldestLoadedIndex, fetchParams.count]);

  // 3️⃣ Process Messages
  useEffect(() => {
    // console.log('[消息处理] 开始', {
    //   isConnected,
    //   currentAddress,
    //   conversationId,
    //   chatType,
    //   groupType,
    //   isGroupLoading,
    //   groupMessagesCount: groupMessages?.length,
    //   fetchParams
    // });

    if (!isConnected || !currentAddress || !conversationId) return;

    const isDataLoading =
      chatType === 'private' ? isPrivateLoading : isGroupLoading;
    if (isDataLoading) {
      console.log('[消息处理] 数据加载中，等待...');
      return;
    }

    // Check if we have data to process
    let hasData = false;
    if (chatType === 'private') {
      if (rawMessages && Array.isArray(rawMessages) && rawMessages.length > 0)
        hasData = true;
      else if (
        fetchParams.count > 0 &&
        (!rawMessages || rawMessages.length === 0)
      ) {
        setIsLoading(false);
        setIsFetchingMore(false);
        return;
      }
    } else {
      // 群聊消息判断
      if (groupMessages && (groupMessages as Message[]).length > 0) {
        hasData = true;
      } else if (invitedMembersMessage) {
        hasData = true;
      } else if (groupType === 'redpacket') {
        // 红包群消息通过 getLogs 异步获取，不依赖 fetchParams
        // 只有当 isGroupLoading 为 false 且消息为空时才认为没有数据
        if (
          !isGroupLoading &&
          (!groupMessages || (groupMessages as Message[]).length === 0)
        ) {
          setIsLoading(false);
          setIsFetchingMore(false);
          return;
        }
      } else if (
        fetchParams.count > 0 &&
        (!groupMessages || (groupMessages as Message[]).length === 0)
      ) {
        // 官方群：依赖 fetchParams 分页
        setIsLoading(false);
        setIsFetchingMore(false);
        return;
      }
    }

    if (!hasData && totalCount === 0) {
      // Check if count is loading
      const isCountLoading =
        chatType === 'private' ? false : isGroupCountLoading;
      if (isCountLoading) {
        return;
      }
      setIsLoading(false);
      return;
    }

    const processMessages = () => {
      let newMessages: Message[] = [];

      if (chatType === 'private' && rawMessages && Array.isArray(rawMessages)) {
        newMessages = rawMessages.map((msg: DMMessage, index: number) => {
          // 尝试解码红包消息
          const redPacketData = decodeDmRedPacketContent(msg.content);

          return {
            id: `${msg.timestamp.toString()}-${msg.sender.toLowerCase()}-${fetchParams.start + index}`,
            sender:
              msg.sender.toLowerCase() === currentAddress?.toLowerCase()
                ? 'user'
                : 'other',
            content: redPacketData
              ? JSON.stringify({
                  packetId: redPacketData.packetId.toString(),
                  tokenAddress: redPacketData.token,
                  message: redPacketData.memo,
                  type: 'NORMAL', // 默认为普通红包，因为链上数据没存类型，或者需要从memo扩展
                  amount: '0', // 列表页不显示金额，需点击查看
                  count: 1
                })
              : msg.content,
            timestamp: new Date(Number(msg.timestamp) * 1000),
            type: redPacketData ? 'red-packet' : 'text',
            isEncrypted: !redPacketData, // 红包消息不加密
            originalContent: msg.content,
            recipient: msg.recipient
          };
        });
      } else if (chatType === 'group') {
        if (invitedMembersMessage) {
          newMessages = [
            {
              id: `system-time-${Date.now()}`,
              sender: 'other' as const,
              content: dayjs().format('A h:mm'),
              timestamp: new Date(),
              type: 'system-time' as const,
              isEncrypted: false,
              originalContent: dayjs().format('A h:mm'),
              recipient: recipientAddress
            },
            {
              id: `system-${Date.now()}`,
              sender: 'other' as const,
              content: invitedMembersMessage,
              timestamp: new Date(),
              type: 'system' as const,
              isEncrypted: false,
              originalContent: invitedMembersMessage,
              recipient: recipientAddress
            }
          ];
        } else {
          newMessages = groupMessages as Message[];
        }
      }

      // Determine if we should prepend based on index comparison
      const shouldPrepend =
        oldestLoadedIndex !== null && fetchParams.start < oldestLoadedIndex;

      if (shouldPrepend && newMessages.length > 0) {
        const viewport = scrollAreaRef.current?.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLElement;
        if (viewport) {
          pendingScrollAdjustmentRef.current = {
            previousHeight: viewport.scrollHeight,
            previousTop: viewport.scrollTop
          };
        }

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filteredNew = newMessages.filter((m) => !existingIds.has(m.id));
          const result = [...filteredNew, ...prev];
          return result;
        });
        setOldestLoadedIndex(fetchParams.start);
        setIsFetchingMore(false);
      } else if (newMessages.length > 0) {
        if (oldestLoadedIndex === null) {
          setMessages(newMessages);
          setOldestLoadedIndex(fetchParams.start);
          setIsLoading(false);
          setIsFetchingMore(false);
          setTimeout(() => scrollToBottom('auto'), 0);
        } else {
          setIsFetchingMore(false);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    };

    processMessages();
  }, [
    rawMessages,
    groupMessages,
    chatType,
    invitedMembersMessage,
    isConnected,
    currentAddress,
    conversationId,
    recipientAddress,
    totalCount,
    isPrivateLoading,
    isGroupLoading,
    isGroupCountLoading,
    scrollToBottom,
    scrollAreaRef,
    fetchParams.start,
    oldestLoadedIndex
  ]);

  // 4️⃣ Scroll Adjustment
  useLayoutEffect(() => {
    if (pendingScrollAdjustmentRef.current) {
      const viewport = scrollAreaRef.current?.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement;
      if (viewport) {
        const { previousHeight, previousTop } =
          pendingScrollAdjustmentRef.current;
        const newScrollHeight = viewport.scrollHeight;
        const scrollOffset = newScrollHeight - previousHeight;
        const newScrollTop = previousTop + scrollOffset;
        viewport.scrollTop = newScrollTop;
        pendingScrollAdjustmentRef.current = null;
      }
    }
  }, [messages]);

  // 5️⃣ Load More Function
  const loadMore = useCallback(() => {
    if (isLoading || isFetchingMore) {
      return;
    }
    if (oldestLoadedIndex === null) {
      return;
    }

    const newStart = Math.max(0, oldestLoadedIndex - MESSAGES_PER_LOAD);
    const newCount = oldestLoadedIndex - newStart;

    // 如果计算出的 count 为 0，说明已经到头了
    if (newCount <= 0) {
      return;
    }

    setIsFetchingMore(true);
    setFetchParams({ start: newStart, count: newCount });
  }, [isLoading, isFetchingMore, oldestLoadedIndex]);

  // 6️⃣ Scroll Listener
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (!viewport) return;

    const handleScroll = () => {
      if (viewport.scrollTop === 0) {
        loadMore();
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [scrollAreaRef, loadMore]);

  // 7️⃣ Listen for new messages (Private)
  useListenMessageSent(
    (logs) => {
      logs.forEach((log) => {
        const { from, to, timestamp, content: rawContent } = log.args;
        const content = rawContent as string;

        // 过滤非当前会话的消息
        const isFromMe = from?.toLowerCase() === currentAddress?.toLowerCase();
        const isToMe = to?.toLowerCase() === currentAddress?.toLowerCase();
        const isFromRecipient =
          from?.toLowerCase() === recipientAddress?.toLowerCase();
        const isToRecipient =
          to?.toLowerCase() === recipientAddress?.toLowerCase();

        const isRelated =
          (isFromMe && isToRecipient) || (isFromRecipient && isToMe);

        if (!isRelated) return;

        // console.log('📨 [消息监听] [私聊] 收到区块链消息事件:', {
        //   from,
        //   to,
        //   contentLen: content.length
        // });
        console.log('📨 [消息监听] [私聊] 收到区块链消息事件:');
        // 处理自己发送的消息确认
        if (isFromMe) {
          setMessages((prev) =>
            prev.map((msg) => {
              // 比较加密后的内容 (msg.content) 而不是原始内容 (msg.originalContent)
              // 同时确保只更新发送中的消息
              if (msg.status === 'sending' && msg.content === content) {
                console.log(
                  '✅ [消息监听] [私聊] 确认消息已上链，移除转圈圈状态:',
                  msg.id
                );
                return {
                  ...msg,
                  status: undefined, // 清除发送中状态
                  id: `${timestamp?.toString()}-${from?.toLowerCase()}-${Date.now()}` // 更新为持久化 ID
                };
              }
              return msg;
            })
          );
          return;
        }

        // 尝试解码红包消息
        const redPacketData = decodeDmRedPacketContent(content);

        const newMessage: Message = {
          id: `${timestamp?.toString()}-${from?.toLowerCase()}-${Date.now()}`,
          content: redPacketData
            ? JSON.stringify({
                packetId: redPacketData.packetId.toString(),
                tokenAddress: redPacketData.token,
                message: redPacketData.memo,
                type: 'NORMAL',
                amount: '0',
                count: 1
              })
            : content,
          sender: 'other',
          timestamp: new Date(Number(timestamp) * 1000),
          type: redPacketData ? 'red-packet' : 'text',
          isEncrypted: !redPacketData,
          originalContent: content,
          recipient: to as Address
        };

        setMessages((prev) => {
          const exists = prev.some(
            (msg) =>
              msg.id === newMessage.id ||
              (new Date(msg.timestamp).getTime() ===
                new Date(newMessage.timestamp).getTime() &&
                msg.content === newMessage.content)
          );
          if (exists) return prev;
          return [...prev, newMessage];
        });
        setTimeout(() => scrollToBottom('smooth'), 100);
      });
    },
    !!currentConvoId,
    undefined // 不再使用 convoId 过滤，因为合约事件可能不包含此索引
  );

  // 8️⃣ Listen for new messages (Group)
  useListenCommunityMessage(
    groupAddress || '',
    currentAddress,
    (newMessage) => {
      console.log('📨 [消息监听] [群聊] 收到群消息:', newMessage.id);
      setMessages((prev) => {
        // 1. 尝试找到对应的乐观更新消息 (发送中且内容相同)
        // 1. 尝试找到对应的乐观更新消息 (发送中且匹配)
        const pendingIndex = prev.findIndex((msg) => {
          if (msg.status !== 'sending' || msg.sender !== 'user') return false;

          // A. 直接内容匹配 (适用于普通文本和格式完全一致的情况)
          if (msg.content === newMessage.content) return true;

          // B. 尝试红包 Packet ID 匹配 (适用于红包群)
          // 场景: 发送时是 "ID|JSON" 或纯 ID，接收到的是格式化后的 JSON
          try {
            let optPacketId = '';
            // 1. 尝试从乐观消息提取 ID
            // 格式可能是: "123", "123|...", 或 JSON
            const pipeIndex = msg.content.indexOf('|');
            if (pipeIndex !== -1) {
              const possibleId = msg.content.substring(0, pipeIndex).trim();
              if (/^\d+$/.test(possibleId)) {
                optPacketId = possibleId;
              }
            } else if (/^\d+$/.test(msg.content.trim())) {
              optPacketId = msg.content.trim();
            } else {
              // 尝试当作 JSON 解析
              const parsed = JSON.parse(msg.content);
              if (parsed.packetId) optPacketId = parsed.packetId.toString();
            }

            let newPacketId = '';
            // 2. 尝试从新消息提取 ID (通常已被 useListenCommunityMessage 格式化为 JSON)
            const newParsed = JSON.parse(newMessage.content);
            if (newParsed.packetId) newPacketId = newParsed.packetId.toString();

            // 3. 只有当两个 ID 都存在且相等时才认为匹配
            if (optPacketId && newPacketId && optPacketId === newPacketId) {
              console.log(
                '✅ [消息监听] [群聊] 通过 Packet ID 匹配成功:',
                optPacketId
              );
              return true;
            }
          } catch (e) {
            // 解析失败忽略，继续视为不匹配
          }

          return false;
        });

        if (pendingIndex !== -1) {
          console.log(
            '✅ [消息监听] [群聊] 确认消息已上链，移除转圈圈状态:',
            prev[pendingIndex].id
          );
          // 找到乐观消息，用新消息替换它
          const newPrev = [...prev];
          newPrev[pendingIndex] = newMessage;
          return newPrev;
        }

        // 2. 如果没找到，检查是否已存在 (避免重复)
        const exists = prev.some((msg) => msg.id === newMessage.id);
        if (exists) return prev;

        // 3. 追加新消息
        return [...prev, newMessage];
      });
      setTimeout(() => scrollToBottom('smooth'), 100);
    },
    chatType === 'group',
    groupType
  );

  return {
    messages,
    setMessages,
    isLoading,
    isFetchingMore,
    setIsFetchingMore,
    oldestLoadedIndex,
    loadMore,
    hasMore: oldestLoadedIndex !== null && oldestLoadedIndex > 0
  };
}
