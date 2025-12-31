import { useCallback } from 'react';
import type { Message } from '@/lib/chat/types';
import { chatEncryption } from '@/lib/keyManagement';
import type { Address } from 'viem';
import { getAddress } from 'viem';
import {
  DirectMessageAbi,
  DIRECT_MESSAGE_CONTRACT_ADDRESS
} from '@/lib/DirectMessageAbi';
import { toast } from '@/hooks/use-toast';

// ============== 辅助函数 ==============

/**
 * 更新指定消息的状态
 * @param setMessages 状态更新函数
 * @param messageId 消息 ID
 * @param status 新状态
 */
function updateMessageStatus(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  messageId: string,
  status: Message['status']
): void {
  setMessages((prev) =>
    prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg))
  );
}

/**
 * 从合约获取接收者公钥，无公钥则返回空字符串
 * @param publicClient viem public client
 * @param recipientAddress 接收者地址
 * @returns 公钥字符串或空字符串
 */
async function fetchRecipientPublicKey(
  publicClient: any,
  recipientAddress: Address
): Promise<string> {
  try {
    const result = await publicClient.readContract({
      address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
      abi: DirectMessageAbi,
      functionName: 'getPublicKey',
      args: [getAddress(recipientAddress)]
    });

    if (result && typeof result === 'string' && result.length > 0) {
      // console.log('🔑 获取到接收者公钥:', result);
      return result;
    }
    console.log('⚠️ 接收者未注册公钥，将发送明文消息');
    return '';
  } catch (error) {
    console.warn('⚠️ 未获取到接收者公钥，将发送明文消息');
    return '';
  }
}

/**
 * 根据公钥决定是否加密消息
 * @param originalText 原始消息内容
 * @param recipientPublicKey 接收者公钥，为空则发送明文
 * @returns 加密后的内容和加密标志
 * @throws 加密失败时抛出错误
 */
function encryptMessageIfNeeded(
  originalText: string,
  recipientPublicKey: string
): { contentToSend: string; isEncrypted: boolean } {
  if (!recipientPublicKey) {
    return { contentToSend: originalText, isEncrypted: false };
  }

  try {
    const encrypted = chatEncryption.encryptMessage(
      originalText,
      recipientPublicKey
    );
    return { contentToSend: encrypted, isEncrypted: true };
  } catch (error) {
    throw new Error(
      '加密失败: ' + (error instanceof Error ? error.message : '未知错误')
    );
  }
}

/**
 * 创建乐观消息对象（立即显示在 UI 上的消息）
 * @param params 消息参数
 * @returns Message 对象
 */
function createOptimisticMessage(params: {
  chatType: 'private' | 'group';
  content: string;
  originalContent: string;
  isEncrypted: boolean;
  recipient: Address;
  currentAddress?: Address;
}): Message {
  const {
    chatType,
    content,
    originalContent,
    isEncrypted,
    recipient,
    currentAddress
  } = params;

  const baseMessage: Message = {
    id: chatType === 'group' ? `temp-${Date.now()}` : Date.now().toString(),
    sender: 'user',
    content,
    timestamp: new Date(),
    type: 'text',
    isEncrypted,
    originalContent,
    recipient,
    status: 'sending'
  };

  // 群聊需要额外的 senderAddress
  if (chatType === 'group' && currentAddress) {
    return { ...baseMessage, senderAddress: currentAddress };
  }

  return baseMessage;
}

/**
 * 验证私聊发送的前置条件
 * @returns 验证结果，包含是否有效和错误信息
 */
function validatePrivateChatPrerequisites(
  currentAddress: Address | undefined,
  recipientAddress: Address,
  publicClient: any,
  writeContract: any
): { valid: boolean; error?: string } {
  if (!currentAddress || !recipientAddress) {
    return { valid: false, error: '地址无效或未连接钱包' };
  }

  if (!publicClient) {
    return { valid: false, error: 'Public client 未初始化' };
  }

  // 验证合约地址
  const contractAddrStr = String(DIRECT_MESSAGE_CONTRACT_ADDRESS);
  if (
    !DIRECT_MESSAGE_CONTRACT_ADDRESS ||
    contractAddrStr === '0x0000000000000000000000000000000000000000' ||
    contractAddrStr === 'NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS' ||
    !contractAddrStr.startsWith('0x') ||
    contractAddrStr.length !== 42
  ) {
    return {
      valid: false,
      error: `合约地址配置错误！请检查环境变量 NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS\n当前值: ${DIRECT_MESSAGE_CONTRACT_ADDRESS}`
    };
  }

  if (!writeContract) {
    return { valid: false, error: '钱包未连接或接收地址无效。' };
  }

  if (!recipientAddress || recipientAddress.length !== 42) {
    return { valid: false, error: '接收者地址无效，无法发送消息。' };
  }

  return { valid: true };
}

/**
 * 手动拉取最新消息作为兜底（防止事件监听失败）
 * @param publicClient viem public client
 * @param currentAddress 当前用户地址
 * @param recipientAddress 接收者地址
 * @param contentToMatch 要匹配的消息内容
 * @param messageId 乐观消息 ID
 * @param setMessages 状态更新函数
 */
async function pollForMessageConfirmation(
  publicClient: any,
  currentAddress: Address,
  recipientAddress: Address,
  contentToMatch: string,
  messageId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
): Promise<void> {
  try {
    console.log('🔄 [兜底] [私聊] 尝试手动拉取最新消息...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const count = await publicClient.readContract({
      address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
      abi: DirectMessageAbi,
      functionName: 'messageCount',
      args: [currentAddress, getAddress(recipientAddress)]
    });

    if (count && Number(count) > 0) {
      const lastIndex = Number(count) - 1;
      const result = await publicClient.readContract({
        address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
        abi: DirectMessageAbi,
        functionName: 'getMessages',
        args: [
          currentAddress,
          getAddress(recipientAddress),
          BigInt(lastIndex),
          BigInt(1)
        ]
      });

      if (result && Array.isArray(result) && result.length > 0) {
        const lastMsg = result[0];
        if (lastMsg.content === contentToMatch) {
          console.log('✅ [兜底] [私聊] 手动拉取成功，更新消息状态');
          const realId = `${lastMsg.timestamp}-${lastMsg.sender.toLowerCase()}-${Date.now()}`;

          setMessages((prev) => {
            const pendingIndex = prev.findIndex((msg) => msg.id === messageId);
            if (pendingIndex !== -1) {
              const newPrev = [...prev];
              newPrev[pendingIndex] = {
                ...newPrev[pendingIndex],
                id: realId,
                status: undefined,
                timestamp: new Date(Number(lastMsg.timestamp) * 1000)
              };
              return newPrev;
            }
            return prev;
          });
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [兜底] [私聊] 手动拉取失败 (非致命):', err);
  }
}

// ============== Hook 主体 ==============

interface UseMessageActionsProps {
  chatType: 'private' | 'group';
  currentAddress: Address | undefined;
  recipientAddress: Address;
  groupAddress: string | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
  publicClient: any;
  writeContract: any;
  sendGroupMessage: (
    content: string,
    kind?: 0 | 1,
    cid?: string
  ) => Promise<`0x${string}`>;
  setPendingGroupMessage?: (msg: string) => void;
  setShowSendModeModal?: (show: boolean) => void;
}

/**
 * 消息操作 Hook
 * 处理消息发送、重试等逻辑
 */
export function useMessageActions({
  chatType,
  currentAddress,
  recipientAddress,
  groupAddress,
  setMessages,
  scrollToBottom,
  publicClient,
  writeContract,
  sendGroupMessage,
  setPendingGroupMessage,
  setShowSendModeModal
}: UseMessageActionsProps) {
  /**
   * 处理群聊消息发送
   *
   * 处理流程：
   * 1. 验证群聊地址是否有效
   * 2. 如果配置了发送模式弹窗，打开弹窗让用户选择明文/密文
   * 3. 否则直接发送明文消息（Fallback）
   * 4. 创建乐观消息（转圈圈状态）并添加到消息列表
   * 5. 调用合约发送消息，发送失败时更新消息状态为 failed
   *
   * @param originalMessageText 原始消息内容
   */
  const handleGroupMessage = useCallback(
    async (originalMessageText: string) => {
      if (!groupAddress) {
        toast({ title: '群聊地址无效', variant: 'destructive' });
        return;
      }

      // 如果配置了发送模式选择弹窗，由弹窗处理后续发送逻辑
      if (setPendingGroupMessage && setShowSendModeModal) {
        setPendingGroupMessage(originalMessageText);
        setShowSendModeModal(true);
        return;
      }

      // Fallback: 直接发送明文消息（当未配置弹窗时）
      const optimisticMessage = createOptimisticMessage({
        chatType: 'group',
        content: originalMessageText,
        originalContent: originalMessageText,
        isEncrypted: false,
        recipient: groupAddress as Address,
        currentAddress: currentAddress
      });

      // 乐观更新 UI：立即显示消息
      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(() => scrollToBottom('smooth'), 100);

      try {
        console.log('🔵 [消息操作] [群聊] 正在请求钱包签名 (支付 Gas)...');
        await sendGroupMessage(originalMessageText, 0);
        console.log('✅ [消息操作] [群聊] 交易已提交，等待上链确认...');
      } catch (error: any) {
        console.error('❌ [消息操作] [群聊] 发送失败或用户取消:', error);
        updateMessageStatus(setMessages, optimisticMessage.id, 'failed');

        // 显示友好的错误提示
        const errorMessage = error?.message || '发送失败';
        toast({
          title: '发送失败',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    },
    [
      groupAddress,
      setPendingGroupMessage,
      setShowSendModeModal,
      currentAddress,
      setMessages,
      scrollToBottom,
      sendGroupMessage
    ]
  );

  /**
   * 处理私聊消息发送
   *
   * 处理流程：
   * 1. 验证前置条件（地址、合约、钱包等）
   * 2. 从合约获取接收者公钥
   * 3. 根据公钥决定是否加密消息（有公钥则加密，无则明文）
   * 4. 创建乐观消息并添加到消息列表
   * 5. 调用合约发送消息
   * 6. 手动拉取最新消息作为兜底（防止事件监听失败）
   * 7. 发送失败时更新消息状态为 failed
   *
   * @param originalMessageText 原始消息内容
   */
  const handlePrivateMessage = useCallback(
    async (originalMessageText: string) => {
      // 验证发送前置条件（地址、合约、钱包等）
      const validation = validatePrivateChatPrerequisites(
        currentAddress,
        recipientAddress,
        publicClient,
        writeContract
      );

      if (!validation.valid) {
        toast({ title: validation.error, variant: 'destructive' });
        return;
      }

      // 从合约获取接收者公钥（不缓存，每次实时获取）
      const recipientPublicKey = await fetchRecipientPublicKey(
        publicClient,
        recipientAddress
      );

      let contentToSend: string;
      let isEncrypted = false;

      // 根据公钥决定是否加密：有公钥则加密，无则发送明文
      try {
        const result = encryptMessageIfNeeded(
          originalMessageText,
          recipientPublicKey
        );
        contentToSend = result.contentToSend;
        isEncrypted = result.isEncrypted;
      } catch (error) {
        toast({
          title: '加密失败',
          description: error instanceof Error ? error.message : '未知错误',
          variant: 'destructive'
        });
        return;
      }

      // 创建乐观消息（立即显示在 UI 上）
      const newMessageObject = createOptimisticMessage({
        chatType: 'private',
        content: contentToSend,
        originalContent: originalMessageText,
        isEncrypted,
        recipient: recipientAddress
      });

      // 乐观更新 UI
      setMessages((prev) => [...prev, newMessageObject]);
      setTimeout(() => scrollToBottom('smooth'), 100);

      try {
        // 调用合约发送消息
        console.log('🔵 [消息操作] [私聊] 正在请求钱包签名 (支付 Gas)...');
        await writeContract({
          address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
          abi: DirectMessageAbi,
          functionName: 'sendMessage',
          args: [getAddress(recipientAddress), contentToSend],
          account: currentAddress
        });

        console.log('✅ [消息操作] [私聊] 交易已提交，等待上链确认...');

        // 手动拉取最新消息作为兜底（防止 WebSocket 事件监听失败）
        await pollForMessageConfirmation(
          publicClient,
          currentAddress!,
          recipientAddress,
          contentToSend,
          newMessageObject.id,
          setMessages
        );
      } catch (error: any) {
        console.error('❌ [消息操作] [私聊] 发送失败或用户取消:', error);
        updateMessageStatus(setMessages, newMessageObject.id, 'failed');
      }
    },
    [
      currentAddress,
      recipientAddress,
      publicClient,
      writeContract,
      setMessages,
      scrollToBottom
    ]
  );

  /**
   * 发送新消息（统一入口）
   *
   * 根据聊天类型路由到对应的发送函数：
   * - 群聊 → handleGroupMessage
   * - 私聊 → handlePrivateMessage
   *
   * @param content 消息内容
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        return;
      }

      if (chatType === 'group') {
        await handleGroupMessage(content);
      } else {
        await handlePrivateMessage(content);
      }
    },
    [chatType, handleGroupMessage, handlePrivateMessage]
  );

  /**
   * 重发失败的消息
   *
   * 处理流程：
   * 1. 更新消息状态为 sending（转圈圈）
   * 2. 根据聊天类型执行不同的重发逻辑：
   *    - 私聊：重新获取公钥、加密、调用合约
   *    - 群聊：直接调用 sendGroupMessage
   * 3. 发送失败时更新消息状态为 failed
   *
   * @param failedMessage 失败的消息对象
   */
  const handleRetryMessage = useCallback(
    async (failedMessage: Message) => {
      console.log('🔄 [重发] 开始重发消息:', {
        id: failedMessage.id,
        chatType,
        content: failedMessage.content.substring(0, 20)
      });

      // 1. 更新状态为发送中
      updateMessageStatus(setMessages, failedMessage.id, 'sending');

      // 2. 根据聊天类型重新发送
      if (chatType === 'private') {
        // 私聊：重新调用发送逻辑
        try {
          if (!currentAddress || !recipientAddress) {
            throw new Error('地址无效');
          }

          // 获取对方公钥 (不缓存)
          const recipientPublicKey = await fetchRecipientPublicKey(
            publicClient,
            recipientAddress
          );

          // 准备消息内容
          const originalText =
            failedMessage.originalContent || failedMessage.content;

          const { contentToSend } = encryptMessageIfNeeded(
            originalText,
            recipientPublicKey
          );

          // 发送到合约
          await writeContract({
            address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
            abi: DirectMessageAbi,
            functionName: 'sendMessage',
            args: [getAddress(recipientAddress), contentToSend],
            account: currentAddress
          });

          console.log('✅ 重发消息已提交');
        } catch (error: any) {
          console.error('❌ 重发消息失败:', error);
          // 失败后再次标记为 failed
          updateMessageStatus(setMessages, failedMessage.id, 'failed');
        }
      } else {
        // 群聊：重新调用群聊发送
        try {
          const isEncrypted = failedMessage.isEncrypted;
          const contentToSend =
            failedMessage.type === 'red-packet'
              ? failedMessage.content
              : failedMessage.originalContent || failedMessage.content;

          await sendGroupMessage(contentToSend, isEncrypted ? 1 : 0);

          // 注意：不要在这里立即清除 status！
          // 如果交易成功，会通过区块链事件或其他方式清除
          // 如果交易失败，会通过错误监听来设置为 failed
        } catch (error: any) {
          // 重发失败，设置状态为 failed
          updateMessageStatus(setMessages, failedMessage.id, 'failed');
        }
      }
    },
    [
      chatType,
      setMessages,
      currentAddress,
      recipientAddress,
      publicClient,
      writeContract,
      sendGroupMessage
    ]
  );

  return {
    handleSendMessage,
    handleRetryMessage
  };
}
