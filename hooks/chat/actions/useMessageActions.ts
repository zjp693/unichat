import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { clearDraftInput } from '@/lib/chatSlice';
import type { Message } from '@/lib/chat/types';
import { chatEncryption } from '@/lib/keyManagement';
import type { Address } from 'viem';
import { getAddress } from 'viem';
import {
  DirectMessageAbi,
  useDirectMessageAddress
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
 * @param contractAddress 当前链的合约地址
 * @returns 公钥字符串或空字符串
 */
async function fetchRecipientPublicKey(
  publicClient: any,
  recipientAddress: Address,
  contractAddress: string
): Promise<string> {
  try {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: DirectMessageAbi,
      functionName: 'getPublicKey',
      args: [getAddress(recipientAddress)]
    });

    if (result && typeof result === 'string' && result.length > 0) {
      return result;
    }
    console.log('⚠️ 接收者未注册公钥，将发送明文消息');
    return '';
  } catch (error) {
    console.warn('⚠️ 未获取到接收者公钥，将发送明文消息', error);
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
  writeContract: any,
  contractAddress: string | undefined
): { valid: boolean; error?: string } {
  if (!currentAddress || !recipientAddress) {
    return { valid: false, error: '地址无效或未连接钱包' };
  }

  if (!publicClient) {
    return { valid: false, error: 'Public client 未初始化' };
  }

  // 验证合约地址
  if (!contractAddress || !contractAddress.startsWith('0x')) {
    return {
      valid: false,
      error: `当前网络不支持私聊或合约地址未配置。`
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
 * @param contractAddress 合约地址
 */
async function pollForMessageConfirmation(
  publicClient: any,
  currentAddress: Address,
  recipientAddress: Address,
  contentToMatch: string,
  messageId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  contractAddress: string
): Promise<void> {
  try {
    console.log('🔄 [兜底] [私聊] 尝试手动拉取最新消息...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const count = await publicClient.readContract({
      address: contractAddress,
      abi: DirectMessageAbi,
      functionName: 'messageCount',
      args: [currentAddress, getAddress(recipientAddress)]
    });

    if (count && Number(count) > 0) {
      const lastIndex = Number(count) - 1;
      const result = await publicClient.readContract({
        address: contractAddress,
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
  groupType?: string;
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
  // 直接调用加密模块的发送逻辑（带兜底），messageOverride 用于直接传入消息内容
  handleSendModeSelect?: (
    mode: 'plaintext' | 'encrypted',
    messageOverride?: string
  ) => Promise<void>;
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
  groupType,
  setMessages,
  scrollToBottom,
  publicClient,
  writeContract,
  sendGroupMessage,
  setPendingGroupMessage,
  setShowSendModeModal,
  handleSendModeSelect
}: UseMessageActionsProps) {
  // 动态获取当前链的 DirectMessage 合约地址
  const directMessageAddress = useDirectMessageAddress();

  /**
   * 处理群聊消息发送
   */
  const handleGroupMessage = useCallback(
    async (originalMessageText: string) => {
      if (!groupAddress) {
        toast({ title: '群聊地址无效', variant: 'destructive' });
        return;
      }

      // 对于 community 和 redpacket 群，直接以明文模式发送，不弹框
      // 复用 handleSendModeSelect 的完整逻辑（包括兜底）
      if (
        (groupType === 'community' || groupType === 'redpacket') &&
        handleSendModeSelect
      ) {
        // 直接调用明文发送，传入消息内容（不依赖 Redux 状态）
        await handleSendModeSelect('plaintext', originalMessageText);
        return;
      }

      // 其他群类型：弹框让用户选择加密/明文
      if (setPendingGroupMessage && setShowSendModeModal) {
        setPendingGroupMessage(originalMessageText);
        setShowSendModeModal(true);
        return;
      }

      // Fallback: 如果没有配置弹窗逻辑，直接发送明文（无兜底）
      const optimisticMessage = createOptimisticMessage({
        chatType: 'group',
        content: originalMessageText,
        originalContent: originalMessageText,
        isEncrypted: false,
        recipient: groupAddress as Address,
        currentAddress: currentAddress
      });

      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(() => scrollToBottom('smooth'), 100);

      try {
        console.log('🔵 [消息操作] [群聊] 正在请求钱包签名 (支付 Gas)...');
        await sendGroupMessage(originalMessageText, 0);
        console.log('✅ [消息操作] [群聊] 交易已提交');
        // 简单清除 sending 状态
        updateMessageStatus(setMessages, optimisticMessage.id, undefined);
      } catch (error: any) {
        console.error('❌ [消息操作] [群聊] 发送失败或用户取消:', error);
        updateMessageStatus(setMessages, optimisticMessage.id, 'failed');
        toast({
          title: '发送失败',
          description: error?.message || '发送失败',
          variant: 'destructive'
        });
      }
    },
    [
      groupAddress,
      groupType,
      setPendingGroupMessage,
      setShowSendModeModal,
      handleSendModeSelect,
      currentAddress,
      setMessages,
      scrollToBottom,
      sendGroupMessage
    ]
  );

  /**
   * 处理私聊消息发送
   */
  const handlePrivateMessage = useCallback(
    async (originalMessageText: string) => {
      // 验证发送前置条件（地址、合约、钱包等）
      const validation = validatePrivateChatPrerequisites(
        currentAddress,
        recipientAddress,
        publicClient,
        writeContract,
        directMessageAddress || undefined
      );

      if (!validation.valid || !directMessageAddress) {
        toast({
          title: validation.error || '无法获取合约地址',
          variant: 'destructive'
        });
        return;
      }

      // 从合约获取接收者公钥（不缓存，每次实时获取）
      const recipientPublicKey = await fetchRecipientPublicKey(
        publicClient,
        recipientAddress,
        directMessageAddress
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
          address: directMessageAddress,
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
          setMessages,
          directMessageAddress
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
      scrollToBottom,
      directMessageAddress
    ]
  );

  /**
   * 发送新消息（统一入口）
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
   */
  const handleRetryMessage = useCallback(
    async (failedMessage: Message) => {
      console.log('🔄 [重发] 开始重发消息:', {
        id: failedMessage.id,
        chatType,
        content: failedMessage.content.substring(0, 20)
      });

      updateMessageStatus(setMessages, failedMessage.id, 'sending');

      if (chatType === 'private') {
        try {
          if (!currentAddress || !recipientAddress || !directMessageAddress) {
            throw new Error('地址无效或合约地址获取失败');
          }

          // 获取对方公钥
          const recipientPublicKey = await fetchRecipientPublicKey(
            publicClient,
            recipientAddress,
            directMessageAddress
          );

          const originalText =
            failedMessage.originalContent || failedMessage.content;

          const { contentToSend } = encryptMessageIfNeeded(
            originalText,
            recipientPublicKey
          );

          // 发送到合约
          await writeContract({
            address: directMessageAddress,
            abi: DirectMessageAbi,
            functionName: 'sendMessage',
            args: [getAddress(recipientAddress), contentToSend],
            account: currentAddress
          });

          console.log('✅ 重发消息已提交');
          updateMessageStatus(setMessages, failedMessage.id, 'sent');
        } catch (error: any) {
          console.error('❌ 重发消息失败:', error);
          updateMessageStatus(setMessages, failedMessage.id, 'failed');
        }
      } else {
        try {
          const isEncrypted = failedMessage.isEncrypted;
          const contentToSend =
            failedMessage.type === 'red-packet'
              ? failedMessage.content
              : failedMessage.originalContent || failedMessage.content;

          await sendGroupMessage(contentToSend, isEncrypted ? 1 : 0);
          updateMessageStatus(setMessages, failedMessage.id, 'sent');
        } catch (error: any) {
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
      sendGroupMessage,
      directMessageAddress
    ]
  );

  // ============== 补充的辅助功能 ==============

  // 复制消息内容
  const copyMessage = useCallback((content: string) => {
    if (!content) return;
    navigator.clipboard
      .writeText(content)
      .then(() => {
        toast({ title: '已复制' });
      })
      .catch(() => {
        toast({ title: '复制失败', variant: 'destructive' });
      });
  }, []);

  // 删除消息 (仅本地乐观删除)
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        // setIsDeleting(true); // 如果有 state 控制 loading
        await new Promise((resolve) => setTimeout(resolve, 300));

        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        toast({ title: '消息已删除', variant: 'success' });
        return true;
      } catch (error) {
        console.error('删除消息失败:', error);
        toast({ title: '删除失败', variant: 'destructive' });
        return false;
      }
    },
    [setMessages]
  );

  // 撤回消息 (Placeholder)
  const recallMessage = useCallback(async (messageId: string) => {
    toast({
      title: '功能开发中',
      description: '撤回功能暂不可用'
    });
  }, []);

  // 清除草稿
  const dispatch = useDispatch();
  const clearDraft = useCallback(
    (chatId: string) => {
      dispatch(clearDraftInput(chatId));
    },
    [dispatch]
  );

  return {
    handleSendMessage,
    handleRetryMessage,
    copyMessage,
    deleteMessage,
    recallMessage,
    clearDraft
  };
}
