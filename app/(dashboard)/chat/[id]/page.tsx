'use client';

// 导入React的核心钩子函数
import { useState, useRef, useEffect } from 'react';
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
  AudioLines,
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

// 定义消息对象的数据结构
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'other';
  timestamp: Date | string; // 允许字符串以便从API接收
  type: 'text' | 'image';
  isEncrypted?: boolean;
  originalContent?: string;
  status?: 'sending' | 'failed'; // 用于UI反馈发送状态
}

// 定义布局常量
const TOP_BAR_HEIGHT = 56;
const NAV_BAR_HEIGHT = 56;
const FOOTER_HEIGHT = 58;
const TOTAL_HEADER_HEIGHT = TOP_BAR_HEIGHT + NAV_BAR_HEIGHT;
// 定义用于在浏览器本地存储中保存最新CID的Key
const LOCAL_STORAGE_KEY = 'chat_latest_cid';

export default function ChatPage() {
  // --- 基础钩子 ---
  const params = useParams();
  const router = useRouter();
  const { decryptMessage, encryptMessage, keys } = useKeyManagement();

  // --- State 管理 ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true); // 用于在获取历史记录时显示加载动画
  const [inputMessage, setInputMessage] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0); // 初始值为0

  // --- Refs 管理 ---
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // --- 数据获取与同步 ---

  // 页面加载时，从localStorage读取指针，调用API获取历史记录
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      // 从浏览器本地存储中获取最新消息的CID
      const latestCid = localStorage.getItem(LOCAL_STORAGE_KEY);

      // 如果没有CID，说明是新对话，无需加载
      if (!latestCid) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      try {
        // 调用我们自己的后端API来获取完整的历史记录
        const response = await fetch(`/api/chat/history?cid=${latestCid}`);
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        if (data.history) {
          // 将从后端获取的字符串时间戳转换为Date对象，以便格式化
          const formattedMessages = data.history.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('获取聊天记录失败:', error);
      }
      setIsLoading(false);
    };

    fetchHistory();
  }, []);

  // 发送新消息（加密 -> 乐观更新UI -> 调用API上传）
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

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
      content: encryptedContent, // 保存的是密文
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      isEncrypted: true,
      originalContent: originalMessageText,
    };

    // 2. 乐观更新UI：立即在界面上显示新消息，让用户感觉流畅
    setMessages((prev) => [...prev, newMessageObject]);

    try {
      // 从localStorage获取前一个CID
      const previousCid = localStorage.getItem(LOCAL_STORAGE_KEY);

      // 3. 调用后端API，在后台进行上传并更新指针
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newMessageObject: {
            ...newMessageObject,
            timestamp: (newMessageObject.timestamp as Date).toISOString(),
          },
          previousCid: previousCid,
        }),
      });

      const result = await response.json();
      if (result.success && result.newCid) {
        // 4. **关键一步**: 将后端返回的最新CID保存回localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, result.newCid);
      } else {
        throw new Error(result.error || '未知的API错误');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      // 可以在此更新UI显示发送失败
    }
  };

  // --- 其他交互逻辑 (useEffect, handlers) ---

  // 动态"学习"软键盘高度
  useEffect(() => {
    if (!isClient) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const updateKeyboardHeight = () => {
      // 使用 visualViewport API 获取更准确的高度信息
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        
        // 只有当键盘高度足够大时才更新（避免误判）
        if (keyboardHeight > 100) {
          setPanelHeight(keyboardHeight);
          // 当键盘弹起时，确保滚动到底部
          timeoutId = setTimeout(() => scrollToBottom('smooth'), 100);
        } else if (keyboardHeight <= 100 && panelHeight > 250) {
          // 键盘收起时也滚动到底部
          timeoutId = setTimeout(() => scrollToBottom('smooth'), 100);
          // 重置面板高度为默认值
          setPanelHeight(250);
        } else if (keyboardHeight <= 100 && panelHeight > 0 && panelHeight <= 250) {
          // 如果面板高度在0到250之间，重置为0
          setPanelHeight(0);
        }
      }
    };

    // 同时监听 resize 和 scroll 事件以提高兼容性
    window.visualViewport?.addEventListener('resize', updateKeyboardHeight);
    window.visualViewport?.addEventListener('scroll', updateKeyboardHeight);
    
    // 添加 focusin 事件监听器，当输入框获得焦点时确保滚动到底部
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // 确保输入框可见
        setTimeout(() => {
          if (window.visualViewport) {
            const keyboardHeight = window.innerHeight - window.visualViewport.height;
            if (keyboardHeight > 100) {
              setPanelHeight(keyboardHeight);
            }
          }
          scrollToBottom('smooth');
        }, 300); // 增加延迟确保键盘完全弹出
      }
    };
    
    document.addEventListener('focusin', handleFocusIn);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardHeight);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardHeight);
      document.removeEventListener('focusin', handleFocusIn);
      clearTimeout(timeoutId);
    };
  }, [isClient, panelHeight]);

  // 滚动到底部的辅助函数
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (viewport) {
      // 在iOS上确保输入框可见
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
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
    // 如果panelHeight为0（表示软键盘从未打开过），则使用默认高度250
    if (panelHeight === 0) {
      setPanelHeight(250);
    }
    setIsActionsOpen(true);
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
    setSelectedMessageId(messageId);
    setShowKeyModal(true);
  };

  // 在弹窗中选择密钥后进行解密
  const handleKeySelect = (key: KeyPair) => {
    if (!selectedMessageId) return;
    const message = messages.find((msg) => msg.id === selectedMessageId);
    if (!message) return;
    try {
      const decryptedContent = decryptMessage(message.content, key.privateKey);
      if (decryptedContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === selectedMessageId
              ? { ...msg, content: decryptedContent, isEncrypted: false }
              : msg
          )
        );
      } else {
        alert('解密返回null，可能是密钥不匹配或消息格式错误');
      }
    } catch (error) {
      alert('解密失败，可能是密钥不匹配或消息格式错误');
    }
    setSelectedMessageId('');
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
            <Button variant="outline" className="rounded-full">
              BNB Chain
            </Button>
            <Button variant="outline" className="rounded-full">
              Connect wallet
            </Button>
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
          bottom: `${FOOTER_HEIGHT + (isActionsOpen ? panelHeight : 0)}px`,
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
                          onClick={() => handleDecryptClick(message.id)}
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
        className="fixed bottom-0 left-0 right-0 z-20"
        style={{ 
          paddingBottom: `env(safe-area-inset-bottom, 0px)`,
          transform: isActionsOpen ? `translateY(-0px)` : 'translateY(0)',
          transition: 'transform 0.3s ease-in-out',
          // 添加背景色以确保输入框区域可见
          backgroundColor: 'white'
        }}
      >
        {/* 输入框栏 */}
        <div
          className="p-2 flex items-center bg-gray-100 border-t"
          style={{ 
            height: `${FOOTER_HEIGHT}px`,
            // 添加过渡动画使布局变化更平滑
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
              setIsActionsOpen(false);
              // 焦点聚焦时滚动到底部并确保输入框可见
              setTimeout(() => {
                scrollToBottom('smooth');
                // 检查键盘高度并更新面板高度
                if (window.visualViewport) {
                  const keyboardHeight = window.innerHeight - window.visualViewport.height;
                  if (keyboardHeight > 100) {
                    setPanelHeight(keyboardHeight);
                  }
                }
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
          className={cn(
            'bg-gray-100 overflow-hidden'
          )}
          style={{ 
            height: isActionsOpen ? `${panelHeight}px` : '0px',
            transition: 'height 0.3s ease-in-out'
          }}
        >
          <div className="p-4 pt-6 grid grid-cols-4 gap-y-6 gap-x-4 text-center">
            <div onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center"><ImageIcon className="h-7 w-7 text-gray-600" /></div>
              <span className="text-xs text-gray-500">Album</span>
            </div>
            <div onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center"><Camera className="h-7 w-7 text-gray-600" /></div>
              <span className="text-xs text-gray-500">Photography</span>
            </div>
            <div onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center"><Phone className="h-7 w-7 text-gray-600" /></div>
              <span className="text-xs text-gray-500">Voice call</span>
            </div>
            <div onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center"><Bot className="h-7 w-7 text-gray-600" /></div>
              <span className="text-xs text-gray-500">AI</span>
            </div>
            <div onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center"><Gift className="h-7 w-7 text-gray-600" /></div>
              <span className="text-xs text-gray-500">Red envelope</span>
            </div>
            <div onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center"><Redo className="h-7 w-7 text-gray-600" /></div>
              <span className="text-xs text-gray-500">Transfer</span>
            </div>
            <div onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center"><ShoppingCart className="h-7 w-7 text-gray-600" /></div>
              <span className="text-xs text-gray-500">Send goods</span>
            </div>
            <div onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center"><Vote className="h-7 w-7 text-gray-600" /></div>
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
      />
    </div>
  );
}