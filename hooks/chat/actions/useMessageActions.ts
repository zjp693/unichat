import { useCallback } from 'react';
import type { Message } from '@/lib/chat/types';
import type { KeyPair } from '@/lib/keyManagement';
import { chatEncryption } from '@/lib/keyManagement';
import type { Address } from 'viem';
import { getAddress } from 'viem';
import {
  DirectMessageAbi,
  DIRECT_MESSAGE_CONTRACT_ADDRESS
} from '@/lib/DirectMessageAbi';

interface UseMessageActionsProps {
  chatType: 'private' | 'group';
  currentAddress: Address | undefined;
  recipientAddress: Address;
  groupAddress: string | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
  keys: KeyPair[];
  publicClient: any;
  writeContract: any;
  sendGroupMessage: (
    content: string,
    kind?: 0 | 1,
    cid?: string
  ) => Promise<`0x${string}`>;
  setPendingGroupMessage?: (msg: string) => void;
  setShowSendModeModal?: (show: boolean) => void;
  setShowKeyModal?: (show: boolean) => void;
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
  keys,
  publicClient,
  writeContract,
  sendGroupMessage,
  setPendingGroupMessage,
  setShowSendModeModal,
  setShowKeyModal
}: UseMessageActionsProps) {
  // 发送新消息
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        return;
      }

      const originalMessageText = content;
      console.log('🔵 [消息操作] 开始处理发送消息:', originalMessageText);

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

        // Fallback if modals are not provided (should not happen in current flow)
        const tempId = `temp-${Date.now()}`;
        console.log('🔵 [消息操作] [群聊] 创建乐观消息 (转圈圈状态):', tempId);
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
          console.log('🔵 [消息操作] [群聊] 正在请求钱包签名 (支付 Gas)...');
          // 2. 发送到合约 (kind: 0=明文)
          await sendGroupMessage(originalMessageText, 0);

          // 注意：不要立即移除 sending 状态
          // 状态会在交易确认后通过 useEffect 自动更新
          console.log('✅ [消息操作] [群聊] 交易已提交，等待上链确认...');
        } catch (error) {
          console.error('❌ [消息操作] [群聊] 发送失败或用户取消:', error);

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
      if (!currentAddress || !recipientAddress) {
        alert('地址无效或未连接钱包');
        return;
      }

      if (!publicClient) {
        console.error('Public client 未初始化');
        return;
      }

      // 1. 尝试从合约获取接收者公钥 (不使用默认公钥，不缓存)
      let recipientPublicKey = '';
      try {
        const result = await publicClient.readContract({
          address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
          abi: DirectMessageAbi,
          functionName: 'getPublicKey',
          args: [getAddress(recipientAddress)]
        });

        if (result && typeof result === 'string' && result.length > 0) {
          recipientPublicKey = result;
          // console.log('🔑 获取到接收者公钥:', recipientPublicKey);
        } else {
          console.log('⚠️ 接收者未注册公钥，将发送明文消息');
        }
      } catch (error) {
        console.warn('⚠️ 未获取到接收者公钥，将发送明文消息:');
        // console.log(error);
        // 这里的错误不应该阻断发送，而是回退到明文
      }

      // 2. 根据是否有公钥决定是否加密
      let contentToSend: string;
      let isEncrypted = false;

      if (recipientPublicKey) {
        // 有公钥，进行单公钥加密
        try {
          console.log('🔐 开始单公钥加密（只用接收者公钥）...');
          contentToSend = chatEncryption.encryptMessage(
            originalMessageText,
            recipientPublicKey
          );
          isEncrypted = true;
          console.log('✅ 单公钥加密成功');
        } catch (error) {
          console.error('❌ 加密失败:', error);
          alert(
            '加密失败: ' + (error instanceof Error ? error.message : '未知错误')
          );
          return;
        }
      } else {
        // 无公钥，发送明文
        contentToSend = originalMessageText;
        isEncrypted = false;
      }

      const newMessageObject: Message = {
        id: Date.now().toString(),
        content: contentToSend,
        sender: 'user',
        timestamp: new Date(),
        type: 'text',
        isEncrypted: isEncrypted,
        originalContent: originalMessageText,
        status: 'sending',
        recipient: recipientAddress // <-- 使用动态接收者地址作为 recipient
      };

      console.log(
        '🔵 [消息操作] [私聊] 创建乐观消息 (转圈圈状态):',
        newMessageObject.id
      );

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
          console.error(
            '❌ 合约地址配置错误:',
            DIRECT_MESSAGE_CONTRACT_ADDRESS
          );
          alert(
            `合约地址配置错误！请检查环境变量 NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS\n当前值: ${DIRECT_MESSAGE_CONTRACT_ADDRESS}`
          );
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newMessageObject.id
                ? { ...msg, status: 'failed' }
                : msg
            )
          );
          return;
        }

        // 私聊：调用合约发送到固定地址
        if (!currentAddress || !writeContract) {
          alert('钱包未连接或接收地址无效。');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newMessageObject.id
                ? { ...msg, status: 'failed' }
                : msg
            )
          );
          return;
        }

        // 验证接收者地址
        if (!recipientAddress || recipientAddress.length !== 42) {
          alert('接收者地址无效，无法发送消息。');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newMessageObject.id
                ? { ...msg, status: 'failed' }
                : msg
            )
          );
          return;
        }

        console.log('🔵 [消息操作] [私聊] 正在请求钱包签名 (支付 Gas)...');
        await writeContract({
          address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
          abi: DirectMessageAbi,
          functionName: 'sendMessage',
          args: [getAddress(recipientAddress), contentToSend],
          account: currentAddress
        });

        console.log('✅ [消息操作] [私聊] 交易已提交，等待上链确认...');

        // 3. 手动拉取最新消息作为兜底 (防止事件监听失败)
        try {
          console.log('🔄 [兜底] [私聊] 尝试手动拉取最新消息...');
          // 等待一小会儿让节点同步
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // 获取消息总数
          const count = await publicClient.readContract({
            address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
            abi: DirectMessageAbi,
            functionName: 'messageCount',
            args: [currentAddress, getAddress(recipientAddress)]
          });

          if (count && Number(count) > 0) {
            const lastIndex = Number(count) - 1;
            // 获取最后一条消息
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
              // 检查内容是否匹配
              if (lastMsg.content === contentToSend) {
                console.log('✅ [兜底] [私聊] 手动拉取成功，更新消息状态');
                const realId = `${lastMsg.timestamp}-${lastMsg.sender.toLowerCase()}-${Date.now()}`;

                setMessages((prev) => {
                  const pendingIndex = prev.findIndex(
                    (msg) => msg.id === newMessageObject.id
                  );
                  if (pendingIndex !== -1) {
                    const newPrev = [...prev];
                    newPrev[pendingIndex] = {
                      ...newPrev[pendingIndex],
                      id: realId,
                      status: undefined, // 清除 sending 状态
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

        // 交易发送成功后，等待确认。这里的状态更新会通过 useWaitForTransactionReceipt 间接触发。
      } catch (error: any) {
        console.error('❌ [消息操作] [私聊] 发送失败或用户取消:', error);
        // 更新 UI 显示发送失败
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessageObject.id ? { ...msg, status: 'failed' } : msg
          )
        );
      }
    },
    [
      chatType,
      groupAddress,
      currentAddress,
      setMessages,
      scrollToBottom,
      sendGroupMessage,
      recipientAddress,
      publicClient,
      writeContract,
      setPendingGroupMessage,
      setShowSendModeModal,
      setShowKeyModal,
      keys
    ]
  );

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

          // 获取对方公钥 (不缓存)
          let recipientPublicKey = '';
          try {
            const result = await publicClient.readContract({
              address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
              abi: DirectMessageAbi,
              functionName: 'getPublicKey',
              args: [getAddress(recipientAddress)]
            });

            if (result && typeof result === 'string' && result.length > 0) {
              recipientPublicKey = result;
            }
          } catch (error) {
            console.warn('⚠️ 重发时获取公钥失败，将使用明文:', error);
          }

          // 准备消息内容
          let contentToSend: string;
          const originalText =
            failedMessage.originalContent || failedMessage.content;

          if (recipientPublicKey) {
            // 有公钥，加密
            contentToSend = chatEncryption.encryptMessage(
              originalText,
              recipientPublicKey
            );
          } else {
            // 无公钥，明文
            contentToSend = originalText;
          }

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
      writeContract,
      sendGroupMessage,
      keys
    ]
  );

  return {
    handleSendMessage,
    handleRetryMessage
  };
}
