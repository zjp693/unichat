'use client';

// 导入React的核心钩子函数
import { useState, useRef, useEffect, useMemo } from 'react';
// 导入UI组件库和工具
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreHorizontal, Plus, Smile, AudioLines, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
// 导入加密功能相关的模块
import { KeyGenerationModal } from '@/components/chat/KeyGenerationModal';
import { DecryptionModal } from '@/components/chat/DecryptionModal';
import { useKeyManagementRedux } from '@/hooks/useKeyManagementRedux';
import { KeyPair, chatEncryption, DEFAULT_KEY_PAIR } from '@/lib/encryption';
// 导入dayjs用于格式化时间
import dayjs from 'dayjs';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
  useChains,
  usePublicClient
} from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { keccak256, encodePacked, getAddress } from 'viem';
import {
  DirectMessageAbi,
  useGetMessageCount,
  useGetMessages,
  useSendMessage,
  useListenMessageSent,
  DMMessage
} from '@/lib/DirectMessageAbi';
import { computeConvoId, Address, isValidEthereumAddress } from '@/lib/utils';
import { useWaitForTransactionReceipt } from 'wagmi';
import GroupChatInfoPanel from '@/components/chat/GroupChatInfoPanel'; // <-- 导入 GroupChatInfoPanel 组件

// 定义消息对象的数据结构
interface Message {
  id: string;
  sender: 'user' | 'other';
  timestamp: Date | string; // 允许字符串以便从API接收
  type: 'text' | 'image' | 'system' | 'system-time'; // <-- 添加 'system-time' 类型
  isEncrypted?: boolean;
  originalContent: string | null; // 修正为 string 或 null
  status?: 'sending' | 'failed'; // 用于UI反馈发送状态
  // 从 DMMessage 手动复制的属性
  recipient: Address;
  content: string; // 确保 content 属性存在
}

// 定义布局常量
const TOP_BAR_HEIGHT = 56;
const NAV_BAR_HEIGHT = 56;
const FOOTER_HEIGHT = 58; // 输入框内容区域的基础高度
const DEFAULT_BOTTOM_INSET_PADDING = 8; // 默认底部填充，例如 8px
const TOTAL_HEADER_HEIGHT = TOP_BAR_HEIGHT + NAV_BAR_HEIGHT;
// const LOCAL_STORAGE_KEY = 'chat_latest_cid'; // 暂时保留，后续会移除
const MESSAGES_PER_LOAD = 15; // 每次加载15条消息

// DirectMessage 合约地址从环境变量中获取
const DIRECT_MESSAGE_CONTRACT_ADDRESS: Address =
  '0xdDF2B78d9Cd8E2219d6a15bC9A3455f0aC056678';

const CONTRACT_RECIPIENT_FOR_WAGMI: Address =
  '0xdDF2B78d9Cd8E2219d6a15bC9A3455f0aC056678'; // <-- 固定接收者地址

export default function ChatPage() {
  // --- 基础钩子 ---
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams(); // <-- 添加这一行
  const {
    keys,
    loading,
    loadKeysFromStorage,
    generateNewKeyPair,
    saveKeyToStorage,
    decryptMessage,
    encryptMessage,
    decryptMessages
  } = useKeyManagementRedux();
  const [loadedMessageCount, setLoadedMessageCount] =
    useState(MESSAGES_PER_LOAD); // 新增：跟踪已加载的消息数量
  const [isFetchingMore, setIsFetchingMore] = useState(false); // 新增：防止重复加载

  // --- Wagmi 钩子 --- //
  const { address: currentAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const chains = useChains();

  // 移除 openConnectModal 和 openChainModal 的解构
  // const { openConnectModal, openChainModal } = useAppKit();
  const currentChain = chains.find((chain) => chain.id === chainId);

  // 从 URL 解析 conversationId, chatType, invitedMembersMessage, memberCount
  const conversationId = params.id as string; // <-- 将 Address 改为 string
  const chatType = searchParams.get('type') === 'group' ? 'group' : 'private';
  const invitedMembersMessage = searchParams.get('invitedMembers')
    ? decodeURIComponent(searchParams.get('invitedMembers') as string)
    : null;
  const memberCount = parseInt(searchParams.get('memberCount') || '0', 10);

  // 确保 recipientAddress 是一个有效的以太坊地址
  // if (!isValidEthereumAddress(recipientAddress)) {
  //   console.error("Invalid recipient address in URL params:", params.id);
  //   // 可以重定向到聊天列表或显示错误信息
  //   // 例如：router.push('/chat');
  //   // 为了演示，我们暂时返回一个空页面或错误提示
  //   return <div className="flex items-center justify-center min-h-screen text-red-500">无效的聊天地址。</div>;
  // }
  const publicClient = usePublicClient();

  // --- 新增：使用封装的钩子获取消息总数和消息列表 ---
  const { data: totalMessagesBigInt } = useGetMessageCount(
    currentAddress as Address,
    CONTRACT_RECIPIENT_FOR_WAGMI // <-- 使用固定地址
  );

  const totalMessages = totalMessagesBigInt ? Number(totalMessagesBigInt) : 0;

  // 计算要加载的消息的起始索引和数量
  const messagesToLoad = Math.min(loadedMessageCount, totalMessages);
  const start = totalMessages - messagesToLoad;
  const count = messagesToLoad;

  const { data: rawMessages, refetch: refetchMessages } = useGetMessages(
    currentAddress as Address,
    CONTRACT_RECIPIENT_FOR_WAGMI, // <-- 使用固定地址
    BigInt(start < 0 ? 0 : start), // 确保 start 不小于 0
    BigInt(count)
  );

  const {
    writeContract,
    data: writeHash,
    isPending: isSendingMessage,
    isError: sendError,
    error: sendErrorMessage
  } = useSendMessage();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError
  } = useWaitForTransactionReceipt({
    hash: writeHash
  });

  // 计算 convoId
  const currentConvoId = useMemo(() => {
    if (!currentAddress || !CONTRACT_RECIPIENT_FOR_WAGMI) return undefined;
    return computeConvoId(currentAddress, CONTRACT_RECIPIENT_FOR_WAGMI);
  }, [currentAddress, CONTRACT_RECIPIENT_FOR_WAGMI]);

  // 实时消息监听
  useListenMessageSent(
    (logs) => {
      logs.forEach((log) => {
        const { from, to, timestamp, content: rawContent } = log.args;
        const content = rawContent as string;

        // 避免重复添加自己发送的乐观更新消息
        if (from?.toLowerCase() === currentAddress?.toLowerCase()) {
          // 尝试找到乐观更新的消息并更新其状态
          setMessages((prev) =>
            prev.map((msg) =>
              msg.originalContent === content
                ? { ...msg, status: undefined }
                : msg
            )
          );
          return;
        }

        let decryptedContent: string | undefined;
        let isMessageEncrypted = true;

        // 移除自动解密逻辑，默认显示密文
        // try {
        //   const userPrivateKey =
        //     keys.length > 0 ? keys[0].privateKey : DEFAULT_KEY_PAIR.privateKey;
        //   decryptedContent = decryptMessage(content, userPrivateKey);
        //   isMessageEncrypted = false;
        // } catch (error) {
        //   console.warn('接收到的消息解密失败:', error);
        //   decryptedContent = content;
        //   isMessageEncrypted = true;
        // }

        const newMessage: Message = {
          id: `${timestamp?.toString()}-${from?.toLowerCase()}`,
          content: content, // 直接使用原始密文
          sender:
            from?.toLowerCase() === currentAddress?.toLowerCase()
              ? 'user'
              : 'other',
          timestamp: new Date(Number(timestamp) * 1000),
          type: 'text',
          isEncrypted: true, // 始终标记为加密
          originalContent: content, // 存储原始密文
          recipient: to as Address
        };

        setMessages((prev) => [...prev, newMessage]);
        // 滚动到底部
        setTimeout(() => scrollToBottom('smooth'), 100);
      });
    },
    !!currentConvoId, // 只有当 convoId 存在时才启用监听
    { convoId: currentConvoId }
  );

  // --- State 管理 ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const [showGroupInfoPanel, setShowGroupInfoPanel] = useState(false); // <-- 新增状态变量

  // --- Refs 管理 ---
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const actionsPanelContentRef = useRef<HTMLDivElement>(null); // 新增 ref
  const prevMessagesLengthRef = useRef(messages.length);

  // --- 数据获取与同步 ---
  // 页面加载时，从localStorage读取指针，调用API获取历史记录
  useEffect(() => {
    const fetchAndProcessMessages = async () => {
      setIsLoading(true);
      loadKeysFromStorage(); // 加载密钥

      // 从本地存储中查找并获取聊天记录CID
      const savedCID = localStorage.getItem('chat_latest_cid');
      console.log('Saved CID:', savedCID);

      if (
        !isConnected ||
        !currentAddress ||
        !conversationId || // 使用 conversationId 替代 recipientAddress
        totalMessagesBigInt === undefined ||
        false // 简化条件，始终允许加载硬编码消息
      ) {
        // 仅在关键依赖缺失时才清空消息并停止加载
        if (!isConnected || !currentAddress || !conversationId) {
          setMessages([]);
          setIsLoading(false);
          setIsFetchingMore(false); // 重置加载状态
          return;
        }
      }

      // totalMessages === 0 的检查现在可以移除或调整，因为我们硬编码消息
      let initialMessages: Message[] = [];

      if (chatType === 'private') {
        // 单聊：处理从链上获取的原始消息
        if (
          rawMessages &&
          Array.isArray(rawMessages) &&
          rawMessages.length > 0
        ) {
          initialMessages = rawMessages.map((msg: DMMessage) => {
            // 假设从链上获取的消息是加密的
            return {
              id: `${msg.timestamp.toString()}-${msg.sender.toLowerCase()}`,
              sender:
                msg.sender.toLowerCase() === currentAddress?.toLowerCase()
                  ? 'user'
                  : 'other',
              content: msg.content,
              timestamp: new Date(Number(msg.timestamp) * 1000),
              type: 'text',
              isEncrypted: true,
              originalContent: msg.content,
              recipient: msg.recipient
            };
          });
        }
      } else if (chatType === 'group') {
        // 群聊：不加载历史记录，只显示邀请成功消息
        if (invitedMembersMessage) {
          initialMessages.push({
            id: `system-time-${Date.now()}`,
            sender: 'other',
            content: dayjs().format('A h:mm'), // 例如：下午 1:49
            timestamp: new Date(),
            type: 'system-time',
            isEncrypted: false,
            originalContent: dayjs().format('A h:mm'),
            recipient: CONTRACT_RECIPIENT_FOR_WAGMI
          });

          initialMessages.push({
            id: `system-${Date.now()}`,
            sender: 'other', // 系统消息
            content: invitedMembersMessage,
            timestamp: new Date(),
            type: 'system', // <-- 将类型设置为 'system'
            isEncrypted: false,
            originalContent: invitedMembersMessage,
            recipient: CONTRACT_RECIPIENT_FOR_WAGMI
          });
        }
      }

      // 3. 格式化并解密消息 (此部分现在对硬编码消息执行)
      // 保持原有逻辑，但要注意它会处理 initialMessages
      const formattedAndMaybeDecryptedMessages: Message[] = initialMessages.map(
        (msg: Message) => {
          // 对于从链上获取的消息，保持加密状态
          // 不再进行自动解密，保持 isEncrypted 状态不变
          return {
            ...msg,
            content: msg.content, // 保持原始内容（密文）
            isEncrypted: msg.isEncrypted, // 保持加密状态
            originalContent: msg.originalContent // 保持原始内容
          };
        }
      );

      // 如果是加载更多消息，则将新消息添加到旧消息的头部
      if (isFetchingMore) {
        setMessages((prev) => [...formattedAndMaybeDecryptedMessages, ...prev]);
      } else {
        setMessages(formattedAndMaybeDecryptedMessages);
      }
      setIsLoading(false);
      setIsFetchingMore(false);
    };

    fetchAndProcessMessages();
    // 确保依赖项包含所有影响初始消息加载的变量
  }, [
    chatType,
    invitedMembersMessage,
    isConnected,
    currentAddress,
    conversationId,
    totalMessagesBigInt,
    rawMessages,
    publicClient,
    loadKeysFromStorage,
    loadedMessageCount, // 新增：将 loadedMessageCount 添加到依赖项
    isFetchingMore
  ]);

  // 发送新消息（加密 -> 乐观更新UI -> 调用合约上传）
  const handleSendMessage = async () => {
    if (chatType === 'group') {
      alert('此群聊功能暂不支持发送消息。因群聊需要另一个合约。'); // <-- 群聊拦截提示
      return;
    }

    if (!inputMessage.trim()) {
      return;
    }

    // 检查用户是否拥有密钥
    if (keys.length === 0) {
      // 直接打开密钥生成弹窗，而不是让用户选择操作
      setShowGenerationModal(true);
      return;
    }

    if (!isConnected || !currentAddress) {
      alert('请先连接您的钱包以发送消息。');
      connect({ connector: connectors[0] });
      return;
    }

    if (!conversationId) {
      alert('聊天对象地址无效，无法发送消息。');
      return;
    }

    const originalMessageText = inputMessage;
    setInputMessage('');

    // 1. 加密消息
    let encryptedContent: string;
    try {
      const publicKeyToUse =
        keys.length > 0 ? keys[0].publicKey : DEFAULT_KEY_PAIR.publicKey;
      encryptedContent = encryptMessage(originalMessageText, publicKeyToUse);
    } catch (error) {
      alert('加密失败!');
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
      recipient: CONTRACT_RECIPIENT_FOR_WAGMI // <-- 总是使用固定地址作为 recipient
    };

    // 2. 乐观更新UI：立即在界面上显示新消息，让用户感觉流畅
    setMessages((prev) => [...prev, newMessageObject]);

    try {
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
      // console.log('发送消息请求参数：', {
      //   address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
      //   abi: DirectMessageAbi,
      //   functionName: 'sendMessage',
      //   args: [CONTRACT_RECIPIENT_FOR_WAGMI, encryptedContent],
      //   account: currentAddress,
      //   recipientAddressLength: CONTRACT_RECIPIENT_FOR_WAGMI.length,
      //   encryptedContentLength: encryptedContent.length
      // });
      writeContract({
        address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
        abi: DirectMessageAbi,
        functionName: 'sendMessage',
        args: [CONTRACT_RECIPIENT_FOR_WAGMI, encryptedContent],
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
      alert(`发送消息失败: ${error.message || '未知错误'}`);
    }
  };

  // 处理交易确认后的状态更新
  useEffect(() => {
    if (isConfirmed && writeHash) {
      // 消息已上链，更新UI状态
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === writeHash ? { ...msg, status: undefined } : msg
        )
      ); // 假设id是hash，实际需要更精确匹配
      // TODO: 考虑如何精确匹配乐观更新的消息和链上确认的消息。
      // 可以考虑在乐观更新时使用临时ID，然后通过事件监听匹配链上实际ID。
    }
    if (isReceiptError && writeHash) {
      // 交易失败
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === writeHash ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  }, [isConfirmed, isReceiptError, writeHash]);

  // --- 其他交互逻辑 (useEffect, handlers) ---

  // 动态"学习"软键盘高度
  useEffect(() => {
    if (!isClient) return;

    let timeoutId: NodeJS.Timeout;

    const updateKeyboardHeight = () => {
      // 使用 visualViewport API 获取更准确的高度信息
      if (window.visualViewport) {
        const keyboardHeight =
          window.innerHeight - window.visualViewport.height;

        // 只有当键盘高度足够大时才更新（避免误判）
        if (keyboardHeight > 100) {
          setPanelHeight(keyboardHeight);
          // 当键盘弹起时，确保滚动到底部
          timeoutId = setTimeout(() => scrollToBottom('smooth'), 100);
        } else if (
          keyboardHeight <= 100 &&
          panelHeight > 0 &&
          isActionsOpen === false
        ) {
          // 键盘收起时，并且功能面板是关闭状态，重置面板高度为0
          // 注意：此处不应将 panelHeight 重置为 250，因为 250 是功能面板的默认高度
          // 如果功能面板是打开状态，则 panelHeight 会保持为功能面板的高度 (250)
          setPanelHeight(0);
          timeoutId = setTimeout(() => scrollToBottom('smooth'), 100);
        }
      }
    };

    // 同时监听 resize 和 scroll 事件以提高兼容性
    window.visualViewport?.addEventListener('resize', updateKeyboardHeight);
    window.visualViewport?.addEventListener('scroll', updateKeyboardHeight);

    // 添加 focusin 事件监听器，当输入框获得焦点时确保滚动到底部
    const handleFocusIn = (e: FocusEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // 确保输入框可见
        setTimeout(() => {
          if (window.visualViewport) {
            const keyboardHeight =
              window.innerHeight - window.visualViewport.height;
            if (keyboardHeight > 100) {
              setPanelHeight(keyboardHeight);
            }
          }
          scrollToBottom('smooth');
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.visualViewport?.removeEventListener(
        'resize',
        updateKeyboardHeight
      );
      window.visualViewport?.removeEventListener(
        'scroll',
        updateKeyboardHeight
      );
      document.removeEventListener('focusin', handleFocusIn);
      clearTimeout(timeoutId);
    };
  }, [isClient, panelHeight, isActionsOpen]);

  // 滚动到底部的辅助函数
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (viewport) {
      // 在iOS上确保输入框可见
      if (window.visualViewport) {
        const keyboardHeight =
          window.innerHeight - window.visualViewport.height;
        if (keyboardHeight > 100) {
          setPanelHeight(keyboardHeight);
        }
      }
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  };

  // 客户端挂载标记
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 核心交互钩子：处理滚动和聚焦
  useEffect(() => {
    if (isClient) {
      // 延迟滚动以确保DOM已更新
      const scrollTimeout = setTimeout(() => scrollToBottom('smooth'), 0);

      prevMessagesLengthRef.current = messages.length;

      return () => clearTimeout(scrollTimeout);
    }
  }, [messages, isActionsOpen, isClient]);

  // 打开底部功能面板
  const handleOpenActions = () => {
    setIsActionsOpen(true);
    // 动态获取功能面板内容的实际高度
    if (actionsPanelContentRef.current) {
      setPanelHeight(actionsPanelContentRef.current.scrollHeight);
    } else if (panelHeight === 0) {
      // 作为备用，如果ref在初始渲染时尚未准备好，提供一个默认值
      setPanelHeight(200); // 你可以根据需要调整这个备用值
    }
  };

  // 关闭底部功能面板
  const handleCloseActions = () => {
    setIsActionsOpen(false);
    setPanelHeight(0);
  };

  // 处理回车键发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 打开密钥生成弹窗
  const handleOpenKeyGeneration = () => {
    setShowKeyModal(false);
    setShowGenerationModal(true);
  };

  // 打开解密弹窗
  const handleOpenDecryption = () => {
    setShowKeyModal(false);
    setShowDecryptModal(true);
  };

  // 在弹窗中选择密钥后进行解密
  const handleKeySelect = (key: KeyPair) => {
    // 所有解密操作都使用批量解密功能
    handleBatchDecrypt(key);
  };

  // 点击"解密"按钮
  const handleDecryptClick = (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (!message || !message.isEncrypted) return;
    setSelectedMessageId(messageId); // <-- 新增：设置被点击的消息ID
    // 直接打开解密弹窗
    setShowDecryptModal(true);
  };

  // 批量解密功能
  const handleBatchDecrypt = (key: KeyPair) => {
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
      const results = decryptMessages(encryptedContents, key.privateKey);

      setMessages((prev) => {
        return prev.map((msg) => {
          // 只处理需要解密的消息
          const targetMessage = messagesToDecrypt.find(
            (m) => m.id === msg.id && m.isEncrypted
          );
          if (!targetMessage) return msg; // 如果不是目标消息或未加密，则跳过

          const index = encryptedContents.indexOf(msg.content);
          if (index !== -1 && results[index].success) {
            return {
              ...msg,
              content: (results[index] as { success: true; decrypted: string })
                .decrypted,
              isEncrypted: false
            };
          }
          return msg;
        });
      });

      console.log(`成功解密 ${results.filter((r) => r.success).length} 条消息`);
    } catch (error: any) {
      console.error('批量解密失败:', error);
      alert(`批量解密失败: ${error.message || '未知错误'}`);
    }

    setShowDecryptModal(false);
    setSelectedMessageId(''); // <-- 新增：解密完成后清除选中消息ID
  };

  // 处理密钥生成完成
  const handleKeyGenerated = (key: KeyPair) => {
    // 仅保存密钥，不触发解密操作
    setShowGenerationModal(false);
  };

  // 处理滚动事件
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;

    // 检查是否滚动到顶部并且不在加载更多消息的状态
    if (
      scrollTop === 0 &&
      !isFetchingMore &&
      loadedMessageCount < totalMessages
    ) {
      setIsFetchingMore(true);
      // 延迟加载，给用户一个“加载中”的感觉
      setTimeout(() => {
        setLoadedMessageCount((prev) => prev + MESSAGES_PER_LOAD);
      }, 500); // 0.5秒延迟
    }
  };

  // --- JSX 渲染 ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        正在加载...
      </div>
    );
  }

  return (
    // 根容器
    <div className="bg-gray-100 w-full h-full relative">
      {/* 固定的头部区域 */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm">
        {/* 顶部钱包栏 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ height: `${TOP_BAR_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2">
            <appkit-button />
          </div>
          <Button
            variant="outline"
            className="rounded-full flex items-center gap-2"
          >
            <Image
              src="/top/usa.png"
              alt="USA Flag"
              width={20}
              height={20}
              className="rounded-full"
            />
            USA
          </Button>
        </div>
        {/* 聊天导航栏 */}
        <div
          className="flex items-center justify-between px-4"
          style={{ height: `${NAV_BAR_HEIGHT}px` }}
        >
          <Button variant="ghost" onClick={() => router.back()}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <h1 className="text-base font-medium text-black">
            {chatType === 'private'
              ? // 硬编码私聊对象名称，可以根据 conversationId 映射
                conversationId === CONTRACT_RECIPIENT_FOR_WAGMI
                ? '固定私聊好友'
                : '未知私聊对象'
              : // 群聊名称，现在包含动态成员数量
                `${conversationId === 'g_my_first_group' ? '我的群聊' : '未知群聊'} (${memberCount})`}
          </h1>
          <Button
            variant="ghost"
            onClick={() => {
              // 修改 onClick 事件
              if (chatType === 'group') {
                setShowGroupInfoPanel(true);
              }
            }}
          >
            <MoreHorizontal className="h-6 w-6 text-black" />
          </Button>
        </div>
      </div>

      {/* 滚动的内容区域 */}
      <div
        className="fixed w-full overflow-hidden"
        style={{
          top: `${TOTAL_HEADER_HEIGHT}px`,
          // 重新计算底部偏移，包含 FOOTER_HEIGHT、默认底部填充、安全区域和功能面板高度
          bottom: `calc(${FOOTER_HEIGHT}px + ${DEFAULT_BOTTOM_INSET_PADDING}px + env(safe-area-inset-bottom, 0px) + ${isActionsOpen ? panelHeight : 0}px)`,
          left: 0,
          right: 0,
          // 添加过渡动画使布局变化更平滑
          transition: 'bottom 0.3s ease-in-out'
        }}
      >
        <ScrollArea
          className="h-full w-full"
          ref={scrollAreaRef}
          onScroll={handleScroll}
        >
          <div className="p-4 space-y-5">
            {messages.map((message) => {
              if (message.type === 'system-time') {
                return (
                  <div
                    key={message.id}
                    className="flex justify-center text-gray-500 text-xs my-2"
                  >
                    <span className="bg-gray-200 px-3 py-1 rounded-lg">
                      {message.content}
                    </span>
                  </div>
                );
              } else if (message.type === 'system') {
                return (
                  <div
                    key={message.id}
                    className="flex justify-center text-gray-500 text-sm my-2"
                  >
                    <span className="bg-gray-200 px-3 py-1 rounded-lg">
                      {message.content}
                    </span>
                  </div>
                );
              } else {
                // 普通消息行 (type === 'text' || type === 'image')
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex w-full items-start gap-3',
                      message.sender === 'user'
                        ? 'flex-row-reverse'
                        : 'flex-row'
                    )}
                  >
                    <Image
                      src={
                        message.sender === 'user'
                          ? '/placeholder-user.jpg'
                          : '/placeholder-user.jpg'
                      }
                      alt="Avatar"
                      width={40}
                      height={40}
                      className="rounded-md flex-shrink-0"
                    />
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm',
                        message.sender === 'user'
                          ? 'bg-[#5637f5] text-white'
                          : 'bg-white text-black'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-all">
                        {message.content}
                      </p>
                      {(message.isEncrypted || message.originalContent) && (
                        <div className="flex items-center justify-between mt-2 min-w-[12rem]">
                          <div className="flex items-center gap-2">
                            {/* 解密按钮 */}
                            <button
                              onClick={() => {
                                handleDecryptClick(message.id);
                              }}
                              disabled={!message.isEncrypted}
                              className={cn(
                                'flex items-center rounded-md px-2 py-1 transition-colors text-xs font-medium',
                                message.sender === 'user'
                                  ? 'bg-[#785ff7]'
                                  : 'bg-[#fef0ee]',
                                message.isEncrypted && 'hover:bg-black/20',
                                'disabled:opacity-80 disabled:cursor-not-allowed'
                              )}
                            >
                              <Image
                                src="/chats/keyIcon.png"
                                alt="解密"
                                width={14}
                                height={14}
                                className="mr-1"
                              />
                              {message.isEncrypted ? '解密' : '已解密'}
                            </button>
                            {/* 计数器按钮 */}
                            <div
                              className={cn(
                                'flex items-center rounded-md px-2 py-1 text-xs font-medium',
                                message.sender === 'user'
                                  ? 'bg-[#785ff7]'
                                  : 'bg-[#e9f9ee]'
                              )}
                            >
                              <Image
                                src="/chats/news.png"
                                alt="计数"
                                width={14}
                                height={14}
                                className="mr-1"
                              />
                              156
                            </div>
                          </div>
                          {/* 时间戳 */}
                          <span
                            className={cn(
                              'text-xs pl-2',
                              message.sender === 'user'
                                ? 'text-purple-200'
                                : 'text-gray-400'
                            )}
                          >
                            {dayjs(message.timestamp).format('MM/DD HH:mm:ss')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </ScrollArea>
      </div>

      {/* 固定的底部区域 */}
      <div
        className="fixed bottom-0 left-0 right-0"
        style={{
          // 移除 paddingBottom，改为由内部的输入框栏处理安全区
          transform: isActionsOpen
            ? `translateY(-${panelHeight}px)`
            : 'translateY(0)',
          transition: 'transform 0.3s ease-in-out',
          backgroundColor: 'white'
        }}
      >
        {/* 输入框栏 */}
        <div
          className="p-2 flex items-center bg-gray-100 border-t"
          style={{
            height: `${FOOTER_HEIGHT}px`,
            paddingBottom: `calc(${DEFAULT_BOTTOM_INSET_PADDING}px + env(safe-area-inset-bottom, 0px))`,
            transition: 'all 0.3s ease-in-out'
          }}
        >
          <Button variant="ghost" className="flex-shrink-0 px-2 py-0">
            <Image
              src="/chats/voice.png"
              alt="Voice"
              width={24}
              height={24}
              className="text-gray-500"
            />
          </Button>
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={chatType === 'group' ? '群聊暂不支持发送消息' : ''} // <-- 动态 placeholder
            disabled={chatType === 'group'} // <-- 群聊禁用输入框
            className="flex-1 bg-white border-none rounded-sm h-8 px-1 py-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0" // 修改这里
            autoComplete="off"
          />
          <Button variant="ghost" className="flex-shrink-0 px-2 py-0">
            <Image
              src="/chats/face.png"
              alt="Face"
              width={24}
              height={24}
              className="text-gray-500"
            />
          </Button>
          {/* 发送按钮 */}
          <Button
            onClick={handleSendMessage}
            className={`rounded-lg transition-all duration-300 ease-in-out
              ${inputMessage.trim() !== '' ? 'opacity-100 h-4 w-6 py-4 px-6 pointer-events-auto' : 'opacity-0 w-0 p-0 m-0 overflow-hidden pointer-events-none'}`}
            style={{
              backgroundColor: '#5436f1',
              color: 'white',
              fontSize: '14px'
            }} // 应用发送按钮样式
          >
            发送
          </Button>

          {/* 加号按钮 */}
          <Button
            variant="ghost"
            onClick={handleOpenActions}
            className={`rounded-lg transition-all duration-300 ease-in-out
              ${inputMessage.trim() !== '' ? 'opacity-0 w-0 p-0 m-0 overflow-hidden pointer-events-none' : 'opacity-100 w-8 pl-0 pr-2 py-0 pointer-events-auto'}`}
          >
            <Image
              src="/chats/plus.png"
              alt="Plus"
              width={24}
              height={24}
              className="text-gray-600"
            />
          </Button>
        </div>
        {/* 功能面板 */}
        <div
          className={cn('bg-gray-100 overflow-hidden')}
          style={{
            height: isActionsOpen ? `${panelHeight}px` : '0px',
            transition: 'height 0.3s ease-in-out'
          }}
        >
          <div
            ref={actionsPanelContentRef}
            className="p-2 pt-4 grid grid-cols-4 gap-y-6 gap-x-4 text-center"
          >
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                <Image
                  src="/chats/Album.png"
                  alt="Album"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <span className="text-xs text-gray-500">Album</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                <Image
                  src="/chats/Photography.png"
                  alt="Photography"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <span className="text-xs text-gray-500">Photography</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                <Image
                  src="/chats/Voicecall.png"
                  alt="Voice call"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <span className="text-xs text-gray-500">Voice call</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                <Image
                  src="/chats/AI.png"
                  alt="AI"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <span className="text-xs text-gray-500">AI</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                <Image
                  src="/chats/Redenvelope.png"
                  alt="Red envelope"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <span className="text-xs text-gray-500">Red envelope</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                <Image
                  src="/chats/Transfer.png"
                  alt="Transfer"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <span className="text-xs text-gray-500">Transfer</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                <Image
                  src="/chats/Sendgoods.png"
                  alt="Send goods"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <span className="text-xs text-gray-500">Send goods</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                <Image
                  src="/chats/Vote.png"
                  alt="Vote"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <span className="text-xs text-gray-500">Vote</span>
            </div>
          </div>
        </div>
      </div>
      {/* 密钥管理弹窗 */}
      {/* {showKeyModal && (
        <div className="fixed bottom-14 w-full z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-normal text-black">
                  选择操作
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowKeyModal(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              
              <div className="space-y-4">
                <Button
                  onClick={handleOpenKeyGeneration}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-md h-12 text-sm font-normal"
                >
                  生成新密钥
                </Button>
                
                <Button
                  onClick={handleOpenDecryption}
                  className="w-full bg-green-500 hover:bg-green-600 text-white rounded-md h-12 text-sm font-normal"
                >
                  解密消息
                </Button>
              </div>
            </div>
          </div>
        </div>
      )} */}

      <KeyGenerationModal
        isOpen={showGenerationModal}
        onClose={() => setShowGenerationModal(false)}
        onKeyGenerated={handleKeyGenerated}
      />

      <DecryptionModal
        isOpen={showDecryptModal}
        onClose={() => setShowDecryptModal(false)}
        onKeySelect={handleKeySelect}
        onBatchDecrypt={handleBatchDecrypt}
      />
      {/* 条件性渲染 GroupChatInfoPanel */}
      {showGroupInfoPanel && chatType === 'group' && (
        <GroupChatInfoPanel
          conversationId={conversationId}
          chatType={chatType}
          memberCount={memberCount}
          onClose={() => setShowGroupInfoPanel(false)}
        />
      )}
    </div>
  );
}
