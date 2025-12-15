import { useCallback } from 'react';
import type { Message } from '@/lib/chat/types';
import type { KeyPair } from '@/lib/keyManagement';
import { chatEncryption } from '@/lib/keyManagement';
import type { Address, Abi } from 'viem';
import type { ChatInputAreaRef } from '@/components/chat/ChatInputArea';
import communityABI from '@/contract/abi/community.json';

interface UseEncryptionActionsProps {
  // State setters
  setShowKeyModal: (show: boolean) => void;
  setShowGenerationModal: (show: boolean) => void;
  setShowDecryptModal: (show: boolean) => void;
  setShowSendModeModal: (show: boolean) => void;
  setPendingGroupMessage: (msg: string) => void;
  setSelectedMessageId: (id: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;

  // State values
  selectedMessageId: string;
  messages: Message[];
  keys: KeyPair[];
  pendingGroupMessage: string;
  currentAddress: Address | undefined;
  groupAddress: string | null;
  publicClient: any;

  // Functions
  sendGroupMessage: (
    content: string,
    kind?: 0 | 1,
    cid?: string
  ) => Promise<`0x${string}`>;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
  inputRef: React.RefObject<ChatInputAreaRef | null>;
}

/**
 * 加密操作 Hook
 * 处理密钥生成、解密、加密发送等逻辑
 */
export function useEncryptionActions({
  setShowKeyModal,
  setShowGenerationModal,
  setShowDecryptModal,
  setShowSendModeModal,
  setPendingGroupMessage,
  setSelectedMessageId,
  setMessages,
  selectedMessageId,
  messages,
  keys,
  pendingGroupMessage,
  currentAddress,
  groupAddress,
  sendGroupMessage,
  scrollToBottom,
  inputRef,
  publicClient
}: UseEncryptionActionsProps) {
  // 打开密钥生成弹窗
  const handleOpenKeyGeneration = useCallback(() => {
    setShowKeyModal(false);
    setShowGenerationModal(true);
  }, [setShowKeyModal, setShowGenerationModal]);

  // 打开解密弹窗
  const handleOpenDecryption = useCallback(() => {
    setShowKeyModal(false);
    setShowDecryptModal(true);
  }, [setShowKeyModal, setShowDecryptModal]);

  // 批量解密功能
  const handleBatchDecrypt = useCallback(
    (key: KeyPair) => {
      let messagesToDecrypt: Message[] = [];

      if (selectedMessageId) {
        // 如果有选中消息ID，则以其为中心选择前后25条，总共最多50条
        const messageIndex = messages.findIndex(
          (msg) => msg.id === selectedMessageId
        );
        if (messageIndex !== -1) {
          const start = Math.max(0, messageIndex - 25);
          const end = Math.min(messages.length, messageIndex + 25 + 1); // +1 是因为 slice 的 end 是非包含的
          messagesToDecrypt = messages
            .slice(start, end)
            .filter((msg) => msg.isEncrypted);
        } else {
          // 如果找不到选中消息，则解密所有已加载的加密消息
          messagesToDecrypt = messages.filter((msg) => msg.isEncrypted);
        }
      } else {
        // 如果没有选中消息ID，则解密所有已加载的加密消息
        messagesToDecrypt = messages.filter((msg) => msg.isEncrypted);
      }

      const encryptedContents = messagesToDecrypt.map((msg) => msg.content);

      if (encryptedContents.length === 0) {
        alert('没有需要解密的消息');
        return;
      }

      try {
        const results = chatEncryption.decryptMessages(
          encryptedContents,
          key.privateKey
        );

        // 创建 ID 到解密结果的映射（使用消息 ID 而不是 content 来匹配）
        const decryptedMap = new Map<string, string>();
        messagesToDecrypt.forEach((msg, index) => {
          if (results[index].success) {
            decryptedMap.set(
              msg.id,
              (results[index] as { success: true; decrypted: string }).decrypted
            );
          }
        });

        setMessages((prev) => {
          return prev.map((msg) => {
            // 使用 ID 来查找解密结果，而不是 content
            const decryptedContent = decryptedMap.get(msg.id);
            if (decryptedContent) {
              return {
                ...msg,
                content: decryptedContent,
                isEncrypted: false
              };
            }
            return msg;
          });
        });

        console.log(
          `✅ 成功解密 ${results.filter((r) => r.success).length} 条消息`
        );
      } catch (error: any) {
        console.error('批量解密失败:', error);
        alert(`批量解密失败: ${error.message || '未知错误'}`);
      }

      setShowDecryptModal(false);
      setSelectedMessageId(''); // <-- 新增：解密完成后清除选中消息ID
    },
    [
      selectedMessageId,
      messages,
      setMessages,
      setShowDecryptModal,
      setSelectedMessageId
    ]
  );

  // 在弹窗中选择密钥后进行解密
  const handleKeySelect = useCallback(
    (key: KeyPair) => {
      // 所有解密操作都使用批量解密功能
      handleBatchDecrypt(key);
    },
    [handleBatchDecrypt]
  );

  // 点击"解密"按钮
  const handleDecryptClick = useCallback(
    (messageId: string) => {
      const message = messages.find((msg) => msg.id === messageId);
      if (!message || !message.isEncrypted) return;
      setSelectedMessageId(messageId);
      setShowDecryptModal(true);
    },
    [messages, setSelectedMessageId, setShowDecryptModal]
  );

  // 处理群聊发送模式选择
  const handleSendModeSelect = useCallback(
    async (mode: 'plaintext' | 'encrypted') => {
      if (!pendingGroupMessage) return;

      const messageContent = pendingGroupMessage;
      const tempId = `temp-${Date.now()}`;
      const isEncrypted = mode === 'encrypted';

      // 如果选择密文，需要加密
      let contentToSend = messageContent;
      if (isEncrypted) {
        // 检查用户是否有密钥
        if (keys.length === 0) {
          alert('密文发送需要先生成密钥对！');
          setShowGenerationModal(true);
          setPendingGroupMessage(''); // 清空待发送消息
          return;
        }

        try {
          // 使用用户的公钥加密（群聊中每个人用自己的私钥解密）
          const userPublicKey = keys[0].publicKey;
          contentToSend = chatEncryption.encryptMessage(
            messageContent,
            userPublicKey
          );
          console.log('✅ 群聊消息加密成功');
        } catch (error) {
          console.error('❌ 群聊消息加密失败:', error);
          setPendingGroupMessage(''); // 清空待发送消息
          return;
        }
      }

      // 1. 乐观更新：立即显示消息
      const optimisticMessage: Message = {
        id: tempId,
        sender: 'user',
        content: isEncrypted ? contentToSend : messageContent, // 显示加密后的内容或明文
        timestamp: new Date(),
        type: 'text',
        isEncrypted: isEncrypted,
        originalContent: messageContent, // 保存原始明文
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
      setPendingGroupMessage(''); // 清空待发送消息
      inputRef.current?.setValue(''); // 清空输入框

      // 滚动到底部
      setTimeout(() => scrollToBottom('smooth'), 100);

      try {
        // 2. 发送到合约 (kind: 0=明文, 1=密文)
        await sendGroupMessage(contentToSend, isEncrypted ? 1 : 0);

        // 注意：不要立即移除 sending 状态
        // 状态会在交易确认后通过 useEffect 自动更新
        console.log(
          `📤 群聊消息已提交到区块链 (${isEncrypted ? '密文' : '明文'})`
        );

        // 3. 手动拉取最新消息作为兜底 (防止事件监听失败)
        try {
          if (!isEncrypted && publicClient && groupAddress) {
            console.log('🔄 [兜底] 尝试手动拉取最新消息...');
            // 等待一小会儿让节点同步
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // 获取消息总数
            const count = await publicClient.readContract({
              address: groupAddress as Address,
              abi: communityABI.abi as Abi,
              functionName: 'communityMessageCount'
            });

            if (count && Number(count) > 0) {
              const lastSeq = Number(count) - 1;
              // 获取最后一条消息
              const result = await publicClient.readContract({
                address: groupAddress as Address,
                abi: communityABI.abi as Abi,
                functionName: 'getPlaintextMessages',
                args: [BigInt(lastSeq), BigInt(1)]
              });

              if (result && Array.isArray(result) && result.length > 0) {
                const lastMsg = result[0];
                // 检查内容是否匹配
                if (lastMsg.content === contentToSend) {
                  console.log('✅ [兜底] 手动拉取成功，更新消息状态');
                  const realId = `${lastMsg.ts}-${lastMsg.sender}-${lastSeq}`;

                  setMessages((prev) => {
                    const pendingIndex = prev.findIndex(
                      (msg) => msg.id === tempId
                    );
                    if (pendingIndex !== -1) {
                      const newPrev = [...prev];
                      newPrev[pendingIndex] = {
                        ...newPrev[pendingIndex],
                        id: realId,
                        status: undefined, // 清除 sending 状态
                        timestamp: new Date(Number(lastMsg.ts) * 1000),
                        senderAddress: lastMsg.sender
                      };
                      return newPrev;
                    }
                    return prev;
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ [兜底] 手动拉取失败 (非致命):', err);
        }
      } catch (error) {
        console.error('❌ [发送群聊消息] 失败:', error);

        // 4. 发送失败，标记为失败状态
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'failed' } : msg
          )
        );
      }
    },
    [
      pendingGroupMessage,
      keys,
      setShowGenerationModal,
      setPendingGroupMessage,
      groupAddress,
      currentAddress,
      setMessages,
      scrollToBottom,
      sendGroupMessage,
      publicClient,
      inputRef
    ]
  );

  // 处理密钥生成完成
  const handleKeyGenerated = useCallback(
    (key: KeyPair) => {
      // 仅保存密钥，不触发解密操作
      setShowGenerationModal(false);
    },
    [setShowGenerationModal]
  );

  return {
    handleOpenKeyGeneration,
    handleOpenDecryption,
    handleKeySelect,
    handleDecryptClick,
    handleSendModeSelect,
    handleBatchDecrypt,
    handleKeyGenerated
  };
}
