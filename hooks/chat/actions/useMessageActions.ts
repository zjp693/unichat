import { useCallback } from 'react';
import type { Message } from '@/lib/chat/types';
import type { KeyPair } from '@/lib/encryption';
import type { Address } from 'viem';
import {
  DirectMessageAbi,
  DIRECT_MESSAGE_CONTRACT_ADDRESS
} from '@/lib/DirectMessageAbi';

interface UseMessageActionsProps {
  inputMessage: string;
  setInputMessage: (msg: string) => void;
  chatType: 'private' | 'group';
  currentAddress: Address | undefined;
  recipientAddress: Address;
  groupAddress: string | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
  keys: KeyPair[];
  publicClient: any;
  writeContract: any;
  sendGroupMessage: (content: string, kind?: 0 | 1) => Promise<void>;
  encryptMessage: (content: string, publicKey: string) => string;
  setPendingGroupMessage?: (msg: string) => void;
  setShowSendModeModal?: (show: boolean) => void;
}

/**
 * 消息操作 Hook
 * 处理消息发送、重试等逻辑
 */
export function useMessageActions({
  inputMessage,
  setInputMessage,
  chatType,
  currentAddress,
  recipientAddress,
  groupAddress,
  setMessages,
  scrollToBottom,
  keys,
  publicClient,
  writeContract,
  sendGroupMessage,
  encryptMessage,
  setPendingGroupMessage,
  setShowSendModeModal
}: UseMessageActionsProps) {
  // 发送新消息
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) {
      return;
    }

    const originalMessageText = inputMessage;

    // 1. 获取接收者公钥 (仅私聊需要)
    let recipientPublicKey: string;

    if (chatType === 'group') {
      // 群聊逻辑
      if (!groupAddress) {
        alert('群聊地址无效');
        return;
      }

      if (setPendingGroupMessage && setShowSendModeModal) {
        setPendingGroupMessage(originalMessageText);
        setShowSendModeModal(true);
        // Do not clear input message here, wait for modal action or cancellation
        return;
      }

      setInputMessage(''); // 立即清空输入框 (Only if not using modal)

      // Fallback if modals are not provided (should not happen in current flow)
      // 1. 乐观更新：立即显示消息
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        sender: 'user',
        content: originalMessageText,
        timestamp: new Date(),
        type: 'text',
        isEncrypted: false,
        originalContent: originalMessageText,
        recipient: groupAddress as Address,
        status: 'sending', // 🆕 标记为发送中
        senderAddress: currentAddress as Address // 🆕 群聊需要发送者地址
      };

      console.log('🔵 [群聊] 创建乐观消息:', {
        id: optimisticMessage.id,
        sender: optimisticMessage.sender,
        status: optimisticMessage.status,
        senderAddress: optimisticMessage.senderAddress
      });

      setMessages((prev) => {
        console.log('🔵 [群聊] 添加消息前 prev 数量:', prev.length);
        const newMessages = [...prev, optimisticMessage];
        console.log('🔵 [群聊] 添加消息后数量:', newMessages.length);
        return newMessages;
      });

      // 滚动到底部
      setTimeout(() => scrollToBottom('smooth'), 100);

      try {
        // 2. 发送到合约 (kind: 0=明文)
        await sendGroupMessage(originalMessageText, 0);

        // 注意：不要立即移除 sending 状态
        // 状态会在交易确认后通过 useEffect 自动更新
        console.log('📤 群聊消息已提交到区块链');
      } catch (error) {
        console.error('❌ [发送群聊消息] 失败:', error);

        // 4. 发送失败，标记为失败状态
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'failed' } : msg
          )
        );
      }

      return;
    }

    // 私聊逻辑
    setInputMessage('');
    try {
      if (!currentAddress || !recipientAddress) {
        throw new Error('地址无效');
      }

      if (!publicClient) {
        throw new Error('Public client 未初始化');
      }

      // 尝试从合约获取接收者公钥
      const result = await publicClient.readContract({
        address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
        abi: DirectMessageAbi,
        functionName: 'getPublicKeyOrDefault',
        args: [recipientAddress]
      });

      if (!result || (typeof result === 'string' && result.length === 0)) {
        throw new Error('获取公钥失败');
      }

      recipientPublicKey = result as string;
      console.log('🔑 获取到接收者公钥:', recipientPublicKey);
    } catch (error) {
      console.error('❌ 获取公钥失败:', error);
      alert('无法获取接收者公钥，无法发送加密消息。');
      setInputMessage(originalMessageText); // 恢复输入
      return;
    }

    // 3. 单公钥加密消息（只用接收者公钥）
    let encryptedContent: string;
    try {
      console.log('🔐 开始单公钥加密（只用接收者公钥）...');
      encryptedContent = encryptMessage(
        originalMessageText,
        recipientPublicKey
      );
      console.log('✅ 单公钥加密成功');
    } catch (error) {
      console.error('❌ 加密失败:', error);
      alert(
        '加密失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
      setInputMessage(originalMessageText); // 恢复输入
      return;
    }

    const newMessageObject: Message = {
      id: Date.now().toString(),
      content: encryptedContent,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      isEncrypted: true,
      originalContent: originalMessageText,
      status: 'sending',
      recipient: recipientAddress // <-- 使用动态接收者地址作为 recipient
    };

    // 2. 乐观更新UI：立即在界面上显示新消息，让用户感觉流畅
    setMessages((prev) => [...prev, newMessageObject]);
    // 发送消息后滚动到底部
    setTimeout(() => scrollToBottom('smooth'), 100);

    try {
      // 验证合约地址是否配置正确
      const contractAddrStr = String(DIRECT_MESSAGE_CONTRACT_ADDRESS);
      if (
        !DIRECT_MESSAGE_CONTRACT_ADDRESS ||
        contractAddrStr === '0x0000000000000000000000000000000000000000' ||
        contractAddrStr === 'NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS' ||
        !contractAddrStr.startsWith('0x') ||
        contractAddrStr.length !== 42
      ) {
        console.error('❌ 合约地址配置错误:', DIRECT_MESSAGE_CONTRACT_ADDRESS);
        alert(
          `合约地址配置错误！请检查环境变量 NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS\n当前值: ${DIRECT_MESSAGE_CONTRACT_ADDRESS}`
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessageObject.id ? { ...msg, status: 'failed' } : msg
          )
        );
        return;
      }

      // 私聊：调用合约发送到固定地址
      if (!currentAddress || !writeContract) {
        alert('钱包未连接或接收地址无效。');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessageObject.id ? { ...msg, status: 'failed' } : msg
          )
        );
        return;
      }

      // 验证接收者地址
      if (!recipientAddress || recipientAddress.length !== 42) {
        alert('接收者地址无效，无法发送消息。');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessageObject.id ? { ...msg, status: 'failed' } : msg
          )
        );
        return;
      }

      console.log('📤 发送消息到合约:', {
        contractAddress: DIRECT_MESSAGE_CONTRACT_ADDRESS,
        recipient: recipientAddress,
        contentLength: encryptedContent.length,
        functionName: 'sendMessage'
      });

      await writeContract({
        address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
        abi: DirectMessageAbi,
        functionName: 'sendMessage',
        args: [recipientAddress, encryptedContent],
        account: currentAddress
      });

      // 交易发送成功后，等待确认。这里的状态更新会通过 useWaitForTransactionReceipt 间接触发。
    } catch (error: any) {
      console.error('发送消息失败:', error);
      // 更新 UI 显示发送失败
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessageObject.id ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  }, [
    inputMessage,
    setInputMessage,
    chatType,
    groupAddress,
    currentAddress,
    setMessages,
    scrollToBottom,
    sendGroupMessage,
    recipientAddress,
    publicClient,
    encryptMessage,
    writeContract
  ]);

  // 重发失败的消息
  const handleRetryMessage = useCallback(
    async (failedMessage: Message) => {
      console.log('🔄 [重发] 开始重发消息:', {
        id: failedMessage.id,
        chatType,
        content: failedMessage.content.substring(0, 20)
      });

      // 1. 更新状态为发送中
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === failedMessage.id ? { ...msg, status: 'sending' } : msg
        )
      );

      // 2. 根据聊天类型重新发送
      if (chatType === 'private') {
        // 私聊：重新调用发送逻辑
        try {
          if (!currentAddress || !recipientAddress) {
            throw new Error('地址无效');
          }

          // 获取对方公钥
          let recipientPublicKey: string;
          if (!publicClient) {
            throw new Error('Public client 未初始化');
          }

          const result = await publicClient.readContract({
            address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
            abi: DirectMessageAbi,
            functionName: 'getPublicKeyOrDefault',
            args: [recipientAddress as Address]
          });

          if (!result || (typeof result === 'string' && result.length === 0)) {
            throw new Error('获取公钥失败');
          }

          recipientPublicKey = result as string;

          // 加密消息（使用原始内容）
          const encryptedContent = encryptMessage(
            failedMessage.originalContent || failedMessage.content,
            recipientPublicKey
          );

          // 发送到合约
          await writeContract({
            address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
            abi: DirectMessageAbi,
            functionName: 'sendMessage',
            args: [recipientAddress, encryptedContent],
            account: currentAddress
          });

          console.log('✅ 重发消息已提交');
        } catch (error: any) {
          console.error('❌ 重发消息失败:', error);
          // 失败后再次标记为 failed
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === failedMessage.id ? { ...msg, status: 'failed' } : msg
            )
          );
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
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === failedMessage.id ? { ...msg, status: 'failed' } : msg
            )
          );
        }
      }
    },
    [
      chatType,
      setMessages,
      currentAddress,
      recipientAddress,
      publicClient,
      encryptMessage,
      writeContract,
      sendGroupMessage
    ]
  );

  return {
    handleSendMessage,
    handleRetryMessage
  };
}
