import { useState, useEffect, useMemo } from 'react';
import { useReadContract, useWatchContractEvent, usePublicClient } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi, Address } from 'viem';

interface CommunityMessage {
  sender: Address;
  ts: bigint;
  kind: number;
  content: string;
  cid: string;
}

interface Message {
  id: string;
  sender: 'user' | 'other';
  timestamp: Date;
  type: 'text';
  content: string;
  recipient: Address;
  isEncrypted: boolean;
  originalContent: string;
  isGroupMessage: boolean;
  status?: 'sending' | 'failed'; // 添加状态字段
  senderAddress: Address; // 发送者地址（用于显示头像）
}

// 辅助函数：获取单条消息内容
async function fetchMessageContent(
  publicClient: any,
  communityAddress: string,
  seq: number
): Promise<string | null> {
  try {
    console.log('🔍 [群聊消息] 获取消息内容，seq:', seq);

    // 调用合约获取单条消息（从 seq 开始，获取 1 条）
    const result = await publicClient.readContract({
      address: communityAddress as `0x${string}`,
      abi: communityABI.abi as Abi,
      functionName: 'getPlaintextMessages',
      args: [BigInt(seq), BigInt(1)]
    });

    if (result && Array.isArray(result) && result.length > 0) {
      const msg = result[0] as CommunityMessage;
      console.log('✅ [群聊消息] 获取到消息内容:', msg.content);
      return msg.content;
    }

    return null;
  } catch (error) {
    console.error('❌ [群聊消息] 获取消息内容失败:', error);
    return null;
  }
}

export function useCommunityMessages(
  communityAddress: string,
  currentUserAddress?: string,
  enabled: boolean = true
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const publicClient = usePublicClient();

  const { data: totalCount, refetch: refetchCount } = useReadContract({
    address: communityAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'communityMessageCount',
    query: {
      enabled: enabled && !!communityAddress
    }
  });

  // 2. 计算加载范围（最新 15 条）
  const { start, count } = useMemo(() => {
    const total = Number(totalCount || 0);
    if (total === 0) return { start: 0, count: 0 };

    const loadCount = Math.min(15, total);
    const startIndex = Math.max(0, total - loadCount);

    return { start: startIndex, count: loadCount };
  }, [totalCount]);

  const { data: rawMessages, refetch: refetchMessages } = useReadContract({
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
          senderAddress: msg.sender // 添加发送者地址
        };
      }
    );

    setMessages(formattedMessages);
  }, [rawMessages, currentUserAddress, communityAddress, start]);

  // 5. 监听新消息事件 - 增量追加（像私聊一样）
  useWatchContractEvent({
    address: communityAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    eventName: 'CommunityMessageBroadcasted',
    enabled: enabled && !!communityAddress,
    onLogs: (logs) => {
      console.log('📨 [群聊消息] 收到新消息事件:', logs.length, '条', logs);

      logs.forEach((log: any) => {
        const { sender, seq, ts } = log.args;

        // 检查是否是自己发送的消息
        const isOwn =
          sender?.toLowerCase() === currentUserAddress?.toLowerCase();
        const messageId = `${ts?.toString()}-${sender}-${seq?.toString()}`;

        if (isOwn) {
          // 自己发送的消息：检查是否有乐观更新的消息
          console.log('✅ [群聊消息] 自己的消息已上链，seq:', seq?.toString());

          setMessages((prev) => {
            // 查找乐观更新的消息（通过时间戳匹配，容差 5 秒）
            const eventTime = Number(ts) * 1000;
            const optimisticMsg = prev.find((msg) => {
              if (msg.sender !== 'user' || msg.status !== 'sending')
                return false;
              const msgTime = new Date(msg.timestamp).getTime();
              const timeDiff = Math.abs(msgTime - eventTime);
              return timeDiff < 5000;
            });

            if (optimisticMsg) {
              // 找到乐观更新的消息，更新其状态和 ID
              console.log(
                '🔄 [群聊消息] 更新乐观消息状态:',
                optimisticMsg.id,
                '->',
                messageId
              );
              return prev.map((msg) =>
                msg.id === optimisticMsg.id
                  ? { ...msg, status: undefined, id: messageId }
                  : msg
              );
            } else {
              // 没有找到乐观更新的消息（可能是刷新页面后）
              // 检查消息是否已存在
              const exists = prev.some((msg) => msg.id === messageId);
              if (exists) {
                console.log('⚠️ [群聊消息] 消息已存在，跳过:', messageId);
                return prev;
              }

              // 添加占位消息
              console.log(
                '➕ [群聊消息] 添加自己的消息（无乐观更新）:',
                messageId
              );
              const placeholderMessage: Message = {
                id: messageId,
                sender: 'user',
                timestamp: new Date(Number(ts) * 1000),
                type: 'text' as const,
                content: '加载中...', // 占位内容
                recipient: communityAddress as Address,
                isEncrypted: false,
                originalContent: '',
                isGroupMessage: true,
                senderAddress: sender as Address // 添加发送者地址
              };
              return [...prev, placeholderMessage];
            }
          });

          // 获取真实消息内容（无论是否有乐观更新）
          if (seq !== undefined && publicClient) {
            fetchMessageContent(
              publicClient,
              communityAddress,
              Number(seq)
            ).then((content) => {
              if (content) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, content, originalContent: content }
                      : msg
                  )
                );
                console.log('✅ [群聊消息] 更新自己的消息内容:', messageId);
              }
            });
          }
          return;
        }

        // 别人发送的消息：需要获取消息内容后追加
        console.log('📥 [群聊消息] 收到他人消息，seq:', seq?.toString());

        // 检查消息是否已存在（避免重复）
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === messageId);
          if (exists) {
            console.log('⚠️ [群聊消息] 消息已存在，跳过:', messageId);
            return prev;
          }

          // 对于明文消息（kind=0），事件中没有内容，需要异步获取
          // 先添加一个占位消息
          const placeholderMessage: Message = {
            id: messageId,
            sender: 'other',
            timestamp: new Date(Number(ts) * 1000),
            type: 'text' as const,
            content: '加载中...', // 占位内容
            recipient: communityAddress as Address,
            isEncrypted: false,
            originalContent: '',
            isGroupMessage: true,
            senderAddress: sender as Address // 添加发送者地址
          };

          console.log('➕ [群聊消息] 追加占位消息:', messageId);
          return [...prev, placeholderMessage];
        });

        // 异步获取消息内容并更新
        if (seq !== undefined && publicClient) {
          fetchMessageContent(publicClient, communityAddress, Number(seq)).then(
            (content) => {
              if (content) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, content, originalContent: content }
                      : msg
                  )
                );
                console.log('✅ [群聊消息] 更新消息内容:', messageId);
              }
            }
          );
        }
      });
    }
  });

  // 手动刷新函数
  const refetch = () => {
    refetchCount();
    refetchMessages();
  };

  return {
    messages,
    totalCount: Number(totalCount || 0),
    isLoading: !rawMessages && enabled,
    refetch
  };
}
