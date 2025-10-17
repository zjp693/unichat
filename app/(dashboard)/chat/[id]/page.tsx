'use client';

// 导入React的核心钩子函数
import { useState, useRef, useEffect, useMemo } from 'react';
// 导入UI组件库和工具
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MoreHorizontal,
  Image as ImageIcon,
  Camera,
  Phone,
  Bot,
  Redo,
  ShoppingCart,
  Vote,
  Gift,
  Plus,
  Smile,
  AudioLines
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
// 导入加密功能相关的模块
import { KeyManagementModal } from '@/components/chat/KeyManagementModal';
import { useKeyManagement } from '@/hooks/useKeyManagement';
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

// 定义消息对象的数据结构
interface Message {
  id: string;
  sender: 'user' | 'other';
  timestamp: Date | string; // 允许字符串以便从API接收
  type: 'text' | 'image';
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
const FOOTER_HEIGHT = 58;
const TOTAL_HEADER_HEIGHT = TOP_BAR_HEIGHT + NAV_BAR_HEIGHT;
// const LOCAL_STORAGE_KEY = 'chat_latest_cid'; // 暂时保留，后续会移除

// DirectMessage 合约地址从环境变量中获取
const DIRECT_MESSAGE_CONTRACT_ADDRESS: Address =
  '0xdDF2B78d9Cd8E2219d6a15bC9A3455f0aC056678';

export default function ChatPage() {
  // --- 基础钩子 ---
  const params = useParams();
  const router = useRouter();
  const { decryptMessage, encryptMessage, keys, decryptMessages } =
    useKeyManagement();

  // --- Wagmi 钩子 --- //
  const { address: currentAddress, isConnected } = useAccount(); // 直接解构获取 address
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const chains = useChains();
  // 移除 openConnectModal 和 openChainModal 的解构
  // const { openConnectModal, openChainModal } = useAppKit();
  const currentChain = chains.find((chain) => chain.id === chainId);
  // const recipientAddress = params.id as Address; // 从 URL 获取接收者地址
  const recipientAddress: Address =
    '0x1234567890123456789012345678901234567890'; // 临时固定接收者地址，请替换为您要聊天的实际地址

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
    recipientAddress
  );
  const totalMessages = totalMessagesBigInt ? Number(totalMessagesBigInt) : 0;

  const pageSize = 10; // 获取最近 10 条消息
  const start = totalMessages > pageSize ? totalMessages - pageSize : 0;
  const count = totalMessages > pageSize ? pageSize : totalMessages;

  const { data: rawMessages } = useGetMessages(
    currentAddress as Address,
    recipientAddress,
    BigInt(start),
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
    if (!currentAddress || !recipientAddress) return undefined;
    return computeConvoId(currentAddress, recipientAddress);
  }, [currentAddress, recipientAddress]);

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

        try {
          const userPrivateKey =
            keys.length > 0 ? keys[0].privateKey : DEFAULT_KEY_PAIR.privateKey;
          decryptedContent = decryptMessage(content, userPrivateKey);
          isMessageEncrypted = false;
        } catch (error) {
          console.warn('接收到的消息解密失败:', error);
          decryptedContent = content;
          isMessageEncrypted = true;
        }

        const newMessage: Message = {
          id: `${timestamp?.toString()}-${from?.toLowerCase()}`,
          content: decryptedContent || content,
          sender:
            from?.toLowerCase() === currentAddress?.toLowerCase()
              ? 'user'
              : 'other',
          timestamp: new Date(Number(timestamp) * 1000),
          type: 'text',
          isEncrypted: isMessageEncrypted,
          originalContent: isMessageEncrypted ? content : null,
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
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);

  // --- Refs 管理 ---
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // --- 数据获取与同步 ---

  // 页面加载时，从localStorage读取指针，调用API获取历史记录
  useEffect(() => {
    const fetchAndProcessMessages = async () => {
      setIsLoading(true);

      if (
        !isConnected ||
        !currentAddress ||
        !recipientAddress ||
        totalMessagesBigInt === undefined ||
        rawMessages === undefined ||
        rawMessages === null ||
        rawMessages.length === 0
      ) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      if (totalMessages === 0) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      try {
        // 3. 格式化并解密消息
        const formattedAndDecryptedMessages: Message[] = (
          rawMessages as DMMessage[]
        ).map((msg: DMMessage) => {
          let decryptedContent: string | undefined;
          let isMessageEncrypted = true;

          try {
            const userPrivateKey =
              keys.length > 0
                ? keys[0].privateKey
                : DEFAULT_KEY_PAIR.privateKey;
            decryptedContent = decryptMessage(
              msg.content as string,
              userPrivateKey
            );
            isMessageEncrypted = false;
          } catch (error) {
            console.warn(
              '消息解密失败，可能使用了不同的密钥或消息未加密:',
              error
            );
            decryptedContent = msg.content as string;
            isMessageEncrypted = true;
          }

          return {
            id: `${msg.timestamp.toString()}-${msg.sender.toLowerCase()}`,
            content: decryptedContent || (msg.content as string),
            sender:
              msg.sender.toLowerCase() === currentAddress?.toLowerCase()
                ? 'user'
                : 'other',
            timestamp: new Date(Number(msg.timestamp) * 1000),
            type: 'text',
            isEncrypted: isMessageEncrypted,
            originalContent: isMessageEncrypted
              ? (msg.content as string)
              : null,
            recipient: msg.recipient as Address
          };
        });

        setMessages(formattedAndDecryptedMessages);
      } catch (error) {
        console.error('获取聊天记录失败:', error);
      }
      setIsLoading(false);
    };

    fetchAndProcessMessages();
  }, [
    isConnected,
    currentAddress,
    recipientAddress,
    publicClient,
    keys,
    decryptMessage,
    totalMessagesBigInt,
    rawMessages
  ]);

  // 发送新消息（加密 -> 乐观更新UI -> 调用合约上传）
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) {
      return;
    }

    if (!isConnected || !currentAddress) {
      alert('请先连接您的钱包以发送消息。');
      connect({ connector: connectors[0] });
      return;
    }

    if (!recipientAddress) {
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
      recipient: recipientAddress // 确保 recipient 属性正确设置
    };

    // 2. 乐观更新UI：立即在界面上显示新消息，让用户感觉流畅
    setMessages((prev) => [...prev, newMessageObject]);

    try {
      // 3. 调用合约发送消息
      if (!currentAddress || !recipientAddress || !writeContract) {
        alert('钱包未连接或接收地址无效。');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessageObject.id ? { ...msg, status: 'failed' } : msg
          )
        );
        return;
      }
      writeContract({
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
    // 如果panelHeight为0（表示软键盘从未打开过或已完全收起），则使用默认高度250
    if (panelHeight === 0) {
      setPanelHeight(250);
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

  // 点击"解密"按钮
  const handleDecryptClick = (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (!message || !message.isEncrypted) return;
    // 单击消息解密按钮也执行批量解密
    setShowKeyModal(true);
    setSelectedMessageId(''); // 清空选中的单条消息ID，表示执行批量解密
  };

  // 在弹窗中选择密钥后进行解密
  const handleKeySelect = (key: KeyPair) => {
    // 所有解密操作都使用批量解密功能
    handleBatchDecrypt(key);
  };

  // 批量解密功能
  const handleBatchDecrypt = (key: KeyPair) => {
    // 获取所有加密的消息
    const encryptedMessages = messages
      .filter((msg) => msg.isEncrypted)
      .map((msg) => msg.content);

    if (encryptedMessages.length === 0) {
      alert('没有需要解密的消息');
      return;
    }

    try {
      // 使用批量解密功能
      const results = decryptMessages(encryptedMessages, key.privateKey);

      // 更新所有消息的状态
      setMessages((prev) => {
        return prev.map((msg) => {
          if (!msg.isEncrypted) return msg;

          const index = encryptedMessages.indexOf(msg.content);
          if (index !== -1 && results[index].success) {
            return {
              ...msg,
              content: results[index].decrypted,
              isEncrypted: false
            };
          }
          return msg;
        });
      });

      // alert(`成功解密 ${results.filter(r => r.success).length} 条消息`);
      console.log(`成功解密 ${results.filter((r) => r.success).length} 条消息`);
    } catch (error: any) {
      console.error('批量解密失败:', error);
      alert(`批量解密失败: ${error.message || '未知错误'}`);
    }

    setShowKeyModal(false);
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
          <h1 className="text-base font-medium text-black">张三</h1>
          <Button variant="ghost">
            <MoreHorizontal className="h-6 w-6 text-black" />
          </Button>
        </div>
      </div>

      {/* 滚动的内容区域 */}
      <div
        className="fixed w-full overflow-hidden"
        style={{
          top: `${TOTAL_HEADER_HEIGHT}px`,
          // 重新计算底部偏移，包含 FOOTER_HEIGHT、安全区域和功能面板高度
          bottom: `calc(${FOOTER_HEIGHT}px + env(safe-area-inset-bottom, 0px) + ${isActionsOpen ? panelHeight : 0}px)`,
          left: 0,
          right: 0,
          // 添加过渡动画使布局变化更平滑
          transition: 'bottom 0.3s ease-in-out'
        }}
      >
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-5">
            {messages.map((message) => (
              // 消息行
              <div
                key={message.id}
                className={cn(
                  'flex w-full items-start gap-3',
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
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
                            // 单击解密按钮也执行批量解密
                            setShowKeyModal(true);
                            setSelectedMessageId(''); // 清空选中的单条消息ID，表示执行批量解密
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-1"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
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
            ))}
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
            paddingBottom: `env(safe-area-inset-bottom, 0px)`,
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
            placeholder=""
            onFocus={() => {
              handleCloseActions();
              // 焦点聚焦时滚动到底部并确保输入框可见
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
            }}
            className="flex-1 bg-white border-none rounded-sm h-8 px-1 py-0 text-base focus-visible:ring-1 focus-visible:ring-transparent"
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
          <Button
            variant="ghost"
            onClick={handleOpenActions}
            className="flex-shrink-0 rounded-full pl-0 pr-2 py-0"
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
          <div className="p-4 pt-6 grid grid-cols-4 gap-y-6 gap-x-4 text-center">
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <ImageIcon className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">Album</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <Camera className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">Photography</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <Phone className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">Voice call</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <Bot className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">AI</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <Gift className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">Red envelope</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <Redo className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">Transfer</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <ShoppingCart className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">Send goods</span>
            </div>
            <div
              onClick={() => setIsActionsOpen(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <Vote className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">Vote</span>
            </div>
          </div>
        </div>
      </div>
      {/* 密钥管理弹窗 */}
      <KeyManagementModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onKeySelect={handleKeySelect}
        onBatchDecrypt={handleBatchDecrypt}
      />
    </div>
  );
}
