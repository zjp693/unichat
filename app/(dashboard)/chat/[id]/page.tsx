'use client';

// 导入React的核心钩子函数
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useLayoutEffect
} from 'react';
// 导入UI组件库和工具
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TopNavbar } from '@/components/ui/top-navbar';
import {
  MoreHorizontal,
  Plus,
  Smile,
  AudioLines,
  X,
  Loader2
} from 'lucide-react';
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
import PrivateChatSettingsPanel from '@/components/chat/PrivateChatSettingsPanel'; // <-- 导入 PrivateChatSettingsPanel 组件

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

// 已废弃：改为动态使用 conversationId 作为接收者地址
// const CONTRACT_RECIPIENT_FOR_WAGMI: Address =
//   '0xdDF2B78d9Cd8E2219d6a15bC9A3455f0aC056678';

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
  const [oldestLoadedIndex, setOldestLoadedIndex] = useState<number | null>(
    null
  ); // 新增：跟踪最早加载的消息索引
  const pendingScrollAdjustmentRef = useRef<{
    previousHeight: number;
    previousTop: number;
  } | null>(null); // 用于保存待调整的滚动信息

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

  // 验证并使用 conversationId 作为接收者地址（私聊时）
  // 群聊时使用空字符串，避免调用合约（空字符串会让钩子的 enabled 条件为 false）
  const recipientAddress: Address = (
    chatType === 'private' ? conversationId : ''
  ) as Address;

  // 验证地址格式（仅在私聊时）
  if (chatType === 'private' && !isValidEthereumAddress(recipientAddress)) {
    console.error('Invalid recipient address in URL params:', params.id);
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        无效的聊天地址。请返回重新选择。
      </div>
    );
  }

  const publicClient = usePublicClient();

  // --- 新增：使用封装的钩子获取消息总数和消息列表（仅私聊） ---
  const { data: totalMessagesBigInt } = useGetMessageCount(
    currentAddress as Address,
    recipientAddress, // <-- 使用动态接收者地址
    {
      query: {
        enabled: chatType === 'private' // 仅在私聊时启用
      }
    }
  );

  const totalMessages = totalMessagesBigInt ? Number(totalMessagesBigInt) : 0;

  // --- 用于加载范围计算的 Ref ---
  const currentLoadRangeRef = useRef<{ start: number; count: number } | null>(
    null
  ); // 当前应该加载的范围

  // 计算要加载的消息的起始索引和数量
  // 使用 useMemo 来稳定计算结果，避免不必要的重新计算
  const { start, count } = useMemo(() => {
    // 如果 oldestLoadedIndex 不为 null 且正在加载更多，计算增量范围
    if (oldestLoadedIndex !== null && isFetchingMore) {
      const newStart = Math.max(0, oldestLoadedIndex - MESSAGES_PER_LOAD);
      const newCount = oldestLoadedIndex - newStart;
      const range = { start: newStart, count: newCount };
      currentLoadRangeRef.current = range;
      return range;
    }

    // 初始加载：获取最新的 15 条
    if (oldestLoadedIndex === null && totalMessages > 0) {
      const messagesToLoad = Math.min(MESSAGES_PER_LOAD, totalMessages);
      const start = Math.max(0, totalMessages - messagesToLoad);
      const range = { start, count: messagesToLoad };
      currentLoadRangeRef.current = range;
      return range;
    }

    // 如果有缓存的加载范围，使用缓存（适用于 totalMessages 还未加载或已完成加载后的情况）
    if (currentLoadRangeRef.current) {
      return currentLoadRangeRef.current;
    }

    // 默认返回空范围（totalMessages 还未加载时）
    return { start: 0, count: 0 };
  }, [oldestLoadedIndex, isFetchingMore, totalMessages]);

  const { data: rawMessages, refetch: refetchMessages } = useGetMessages(
    currentAddress as Address,
    recipientAddress, // <-- 使用动态接收者地址（群聊时为空字符串，会禁用查询）
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

  // 计算 convoId（仅私聊）
  const currentConvoId = useMemo(() => {
    if (chatType !== 'private') return undefined; // 群聊不需要 convoId
    if (!currentAddress || !recipientAddress) return undefined;
    return computeConvoId(currentAddress, recipientAddress);
  }, [chatType, currentAddress, recipientAddress]);

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
          id: `${timestamp?.toString()}-${from?.toLowerCase()}-${Date.now()}`, // 添加时间戳避免 key 重复
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
  const [showPrivateChatSettingsPanel, setShowPrivateChatSettingsPanel] =
    useState(false); // <-- 新增状态变量
  const [isInitialLoad, setIsInitialLoad] = useState(true); // <-- 新增状态变量

  // --- Refs 管理 ---
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const actionsPanelContentRef = useRef<HTMLDivElement>(null); // 新增 ref
  const lastProcessedRangeRef = useRef<{ start: number; count: number } | null>(
    null
  ); // 跟踪上次处理的范围

  // --- 辅助函数 ---
  // 滚动到底部的辅助函数
  const scrollToBottom = useCallback(
    (behavior: 'smooth' | 'auto' = 'smooth') => {
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
    },
    []
  ); // setPanelHeight 是稳定的，不需要在依赖项中

  // --- 数据获取与同步 ---

  // 1️⃣ 初始化：仅在组件挂载时加载密钥和设置客户端标记
  useEffect(() => {
    loadKeysFromStorage();
    setIsClient(true);
  }, []); // 空依赖数组，只运行一次

  // 2️⃣ 连接状态检查：钱包未连接时清空消息
  useEffect(() => {
    if (!isConnected || !currentAddress || !conversationId) {
      setMessages([]);
      setIsLoading(false);
      setIsFetchingMore(false);
      setIsInitialLoad(true);
    }
  }, [isConnected, currentAddress, conversationId]);

  // 3️⃣ 处理 rawMessages 更新（从链上获取的消息）
  useEffect(() => {
    if (!isConnected || !currentAddress || !conversationId) return;

    // 群聊特殊处理：直接设置为加载完成并显示邀请消息
    if (chatType === 'group') {
      setIsLoading(false);
      setIsFetchingMore(false);
      // 群聊消息会在下面处理
    }

    // 私聊时，如果没有消息则提前返回
    if (chatType === 'private') {
      if (
        !rawMessages ||
        !Array.isArray(rawMessages) ||
        rawMessages.length === 0
      ) {
        setIsLoading(false);
        setIsFetchingMore(false);
        return;
      }
    }

    // 检查是否是新的数据范围（避免重复处理）
    const lastRange = lastProcessedRangeRef.current;

    // 群聊时跳过此检查，因为群聊不依赖 rawMessages
    if (chatType === 'private') {
      const currentRange = { start, count };

      if (
        lastRange &&
        lastRange.start === currentRange.start &&
        lastRange.count === currentRange.count
      ) {
        return;
      }
    }

    const processMessages = () => {
      let newMessages: Message[] = [];

      if (chatType === 'private' && rawMessages && Array.isArray(rawMessages)) {
        // 单聊：处理从链上获取的原始消息
        // 使用全局索引来生成唯一 ID，避免 key 重复
        newMessages = rawMessages.map((msg: DMMessage, index: number) => ({
          id: `${msg.timestamp.toString()}-${msg.sender.toLowerCase()}-${start + index}`, // 使用全局索引
          sender:
            msg.sender.toLowerCase() === currentAddress?.toLowerCase()
              ? 'user'
              : 'other',
          content: msg.content,
          timestamp: new Date(Number(msg.timestamp) * 1000),
          type: 'text' as const,
          isEncrypted: true, // 新加载的消息始终是加密状态
          originalContent: msg.content,
          recipient: msg.recipient
        }));
      } else if (chatType === 'group') {
        // 群聊：区分邀请消息和正常聊天
        if (invitedMembersMessage) {
          // 从邀请进入：显示邀请成功消息
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
          // 从聊天列表进入：显示正常群聊内容（暂时为空，等待后续实现群聊消息）
          newMessages = [];
        }
      }

      // 判断是初始加载还是增量加载
      const isIncrementalLoad =
        chatType === 'private' && lastRange !== null && start < lastRange.start;

      if (isIncrementalLoad && newMessages.length > 0) {
        // 增量加载（下拉加载更多）
        // 保存当前滚动位置到 ref，供 useLayoutEffect 使用
        const viewport = scrollAreaRef.current?.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLElement;
        if (viewport) {
          pendingScrollAdjustmentRef.current = {
            previousHeight: viewport.scrollHeight,
            previousTop: viewport.scrollTop
          };
        }

        // 将新消息添加到头部（保持旧消息状态不变，包括解密状态）
        setMessages((prev) => [...newMessages, ...prev]);

        // 更新最早加载的消息索引
        setOldestLoadedIndex(start);
      } else if (newMessages.length > 0) {
        // 首次加载
        setMessages(newMessages);
        setOldestLoadedIndex(start); // 记录最早加载的消息索引
        setIsLoading(false);
        setIsFetchingMore(false);
        // 首次加载后滚动到底部会由另一个 useEffect 处理
      } else {
        // 无消息（包括群聊从列表进入的场景）
        setMessages([]);
        setIsLoading(false);
        setIsFetchingMore(false);
      }

      // 记录已处理的数据范围（仅私聊需要）
      if (chatType === 'private') {
        const currentRange = { start, count };
        lastProcessedRangeRef.current = currentRange;
      }
    };

    processMessages();
    // 只依赖真正需要的数据，移除 isFetchingMore
  }, [
    rawMessages,
    chatType,
    invitedMembersMessage,
    isConnected,
    currentAddress,
    conversationId,
    start,
    count
  ]);

  // 4️⃣ 首次加载后滚动到底部
  useEffect(() => {
    if (isClient && isInitialLoad && messages.length > 0 && !isLoading) {
      setTimeout(() => {
        scrollToBottom('auto');
        setIsInitialLoad(false);
      }, 100);
    }
  }, [isClient, isInitialLoad, messages.length, isLoading, scrollToBottom]);

  // 5️⃣ 下拉加载后调整滚动位置（使用 useLayoutEffect 在 DOM 更新后、浏览器绘制前立即执行）
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

        // 直接设置 scrollTop，保持用户查看的消息位置不变
        viewport.scrollTop = newScrollTop;

        // 清除待调整标记
        pendingScrollAdjustmentRef.current = null;
        setIsFetchingMore(false);
      }
    }
  }, [messages]); // 当 messages 更新时触发

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
      recipient: recipientAddress // <-- 使用动态接收者地址作为 recipient
    };

    // 2. 乐观更新UI：立即在界面上显示新消息，让用户感觉流畅
    setMessages((prev) => [...prev, newMessageObject]);
    // 发送消息后滚动到底部
    setTimeout(() => scrollToBottom('smooth'), 100);

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
      //   args: [recipientAddress, encryptedContent],
      //   account: currentAddress,
      //   recipientAddressLength: recipientAddress.length,
      //   encryptedContentLength: encryptedContent.length
      // });
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

    // 添加 focusin 事件监听器，当聊天输入框获得焦点时确保滚动到底部
    const handleFocusIn = (e: FocusEvent) => {
      // 只有当聚焦的元素是聊天输入框时才滚动到底部
      if (e.target === inputRef.current) {
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
  }, [isClient, panelHeight, isActionsOpen, scrollToBottom]);

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
  };

  // 处理密钥生成完成
  const handleKeyGenerated = (key: KeyPair) => {
    // 仅保存密钥，不触发解密操作
    setShowGenerationModal(false);
  };

  // 处理滚动事件
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;

    // 检查是否接近顶部（距离顶部小于30px）并且不在加载更多消息的状态
    // 只有当还有更早的消息时才允许加载
    const hasMoreMessages = oldestLoadedIndex !== null && oldestLoadedIndex > 0;
    const LOAD_MORE_THRESHOLD = 30; // 距离顶部30px时就开始加载

    if (scrollTop < LOAD_MORE_THRESHOLD && !isFetchingMore && hasMoreMessages) {
      setIsFetchingMore(true);
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
        <TopNavbar className="" />
        {/* 聊天导航栏 */}
        <div
          className="flex items-center justify-between px-3"
          style={{ height: `${NAV_BAR_HEIGHT}px` }}
        >
          <Button variant="ghost" onClick={() => router.back()}>
            <Image
              src="/chats/arrow_left.png"
              alt="返回"
              width={10}
              height={10}
              className="text-black"
            />
          </Button>
          <h1 className="text-base font-medium text-black">
            {chatType === 'private'
              ? // 显示钱包地址的缩略形式
                `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
              : // 群聊名称，现在包含动态成员数量
                `${conversationId === 'g_my_first_group' ? '我的群聊' : '未知群聊'} (${memberCount})`}
          </h1>
          <Button
            variant="ghost"
            onClick={() => {
              if (chatType === 'group') {
                setShowGroupInfoPanel(true);
              } else if (chatType === 'private') {
                setShowPrivateChatSettingsPanel(true);
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
          // 计算底部偏移：输入框高度 + 安全区域 + 功能面板高度（如果打开）
          bottom: `calc(${FOOTER_HEIGHT}px + env(safe-area-inset-bottom, 0px) + ${isActionsOpen ? panelHeight : 0}px)`,
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
            {/* 加载更多消息的指示器 - 现代渐变效果 */}
            {isFetchingMore && (
              <div className="flex justify-center items-center py-4">
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    加载中...
                  </span>
                </div>
              </div>
            )}

            {/* 空状态提示（仅群聊从列表进入时显示） */}
            {messages.length === 0 &&
              chatType === 'group' &&
              !invitedMembersMessage && (
                <div className="flex flex-col items-center justify-center py-20">
                  <p className="text-sm text-gray-400">群聊功能开发中...</p>
                  <p className="text-xs text-gray-300 mt-2">
                    暂不支持发送和接收群聊消息
                  </p>
                </div>
              )}

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

      {/* 固定的底部区域 - 类似微信的布局 */}
      <div
        className="fixed left-0 right-0 bg-gray-100"
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transition: 'all 0.3s ease-in-out'
        }}
      >
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

        {/* 输入框栏 */}
        <div
          className="p-2 flex items-center bg-gray-100 border-t border-gray-300"
          style={{
            minHeight: `${FOOTER_HEIGHT}px`
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
      {/* 新增：条件性渲染 PrivateChatSettingsPanel */}
      {showPrivateChatSettingsPanel && chatType === 'private' && (
        <PrivateChatSettingsPanel
          isOpen={showPrivateChatSettingsPanel}
          onClose={() => setShowPrivateChatSettingsPanel(false)}
          conversationId={conversationId} // 传递当前的 conversationId
          // topOffset={TOP_BAR_HEIGHT} // 移除此行
        />
      )}
    </div>
  );
}
