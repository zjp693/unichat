'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreHorizontal, Plus, Smile } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { KeyManagementModal } from '@/components/chat/KeyManagementModal';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import { KeyPair, chatEncryption, DEFAULT_KEY_PAIR } from '@/lib/encryption';

// 消息类型定义
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'other';
  timestamp: Date;
  type: 'text' | 'image';
  isEncrypted?: boolean;
  originalContent?: string; // 保存原始加密内容
}

export default function ChatPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { decryptMessage, encryptMessage, keys } = useKeyManagement();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '你好！这是一条测试消息',
      sender: 'other',
      timestamp: new Date('2024-01-01T10:32:00'),
      type: 'text',
      isEncrypted: false
    },
    {
      id: '2',
      content: '欢迎使用加密聊天功能',
      sender: 'other',
      timestamp: new Date('2024-01-01T10:33:00'),
      type: 'text',
      isEncrypted: false
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部 - 只滚动消息容器内部
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      // 查找 ScrollArea 的视口容器
      const scrollContainer = messagesEndRef.current.closest('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }
  };

  useEffect(() => {
    // 防止页面滚动
    document.body.classList.add('chat-page');
    
    // 监听键盘弹出/收起
    const handleViewportChange = () => {
      // 当键盘弹出时，确保滚动到底部显示最新消息
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        if (keyboardHeight > 0) {
          // 键盘弹出，滚动到底部
          setTimeout(() => {
            scrollToBottom(false);
          }, 100);
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
    
    return () => {
      document.body.classList.remove('chat-page');
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, []);

  useEffect(() => {
    // 使用 setTimeout 确保 DOM 更新完成后再滚动
    const timer = setTimeout(() => {
      if (isFirstLoad) {
        scrollToBottom(false); // 首次加载不使用动画
        setIsFirstLoad(false);
      } else {
        scrollToBottom(true); // 后续使用平滑滚动
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [messages, isFirstLoad]);

  // 发送消息 - 优化版本
  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      let content = inputMessage.trim();
      let isEncrypted = false;

      try {
        let publicKeyToUse: string;
        
        if (keys.length > 0) {
          // 优先使用用户的密钥
          publicKeyToUse = keys[0].publicKey;
          console.log('使用用户密钥进行加密');
        } else {
          // 没有用户密钥时，使用默认密钥
          publicKeyToUse = DEFAULT_KEY_PAIR.publicKey;
          console.log('使用默认密钥进行加密');
        }
        
        content = encryptMessage(inputMessage.trim(), publicKeyToUse);
        isEncrypted = true;
        console.log('消息加密成功');
      } catch (error) {
        console.error('加密失败详情:', error);
        
        // 显示用户友好的错误提示
        alert(`加密失败: ${error instanceof Error ? error.message : '未知错误'}\n\n消息将以明文形式发送。\n\n建议：\n1. 检查密钥是否有效\n2. 尝试重新生成密钥\n3. 刷新页面重试`);
        
        // 加密失败时保持原文，但标记为未加密
        isEncrypted = false;
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        sender: 'user',
        timestamp: new Date(),
        type: 'text',
        isEncrypted
      };
      
      setMessages((prev) => [...prev, newMessage]);
      setInputMessage('');
      
      // 发送消息后收起键盘
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  // 按回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理解密按钮点击
  const handleDecryptClick = (messageId: string) => {
    console.log('点击解密按钮，消息ID:', messageId);
    setSelectedMessageId(messageId);
    setShowKeyModal(true);
  };

  // 处理密钥选择
  const handleKeySelect = (key: KeyPair) => {
    if (!selectedMessageId) return;

    const message = messages.find((msg) => msg.id === selectedMessageId);
    if (!message) return;

    try {
      const decryptedContent = decryptMessage(message.content, key.privateKey);

      // 更新消息状态
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === selectedMessageId) {
            return {
              ...msg,
              content: decryptedContent,
              isEncrypted: false,
              originalContent: msg.content
            };
          }
          return msg;
        })
      );
      
      console.log('解密成功');
    } catch (error) {
      console.error('解密失败:', error);
      alert('解密失败，请检查密钥是否正确');
    }

    // 清空选中的消息ID，关闭弹窗
    setSelectedMessageId('');
    setShowKeyModal(false);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="chat-container flex flex-col bg-white">
      {/* 顶部状态栏 */}
      <div className="bg-white px-2 py-2 flex items-center justify-between flex-shrink-0 relative z-10">
        <div
          className="ml-2"
          style={{ transform: 'scale(1)', transformOrigin: 'left center' }}
        >
          <appkit-button />
        </div>
        <Button
          className="ml-auto flex items-center space-x-1 !px-4 !h-7 !py-1 text-sm rounded-md border-gray-200"
          variant="outline"
        >
          <div className="inline-block align-middle mr-1 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src="/top/usa.png"
              alt="usa"
              className="w-full h-full object-cover"
              width={16}
              height={16}
            />
          </div>
          <span className="text-xs">USA</span>
        </Button>
      </div>

      {/* 导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-8 w-8 p-0"
        >
          <Image
            src="/chats/arrow_left.png"
            alt="返回"
            width={10}
            height={12}
          />
        </Button>

        <h1 className="text-base font-medium text-black">张三</h1>

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-5 w-5 text-black" />
        </Button>
      </div>

      {/* 聊天消息区域 - 自适应高度，内部滚动 */}
      <div className="flex-1 px-2 bg-[#f4f4f4] overflow-hidden min-h-0">
        <ScrollArea className="h-full" style={{ touchAction: 'pan-y' }}>
          <div className="space-y-2 py-2">
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={cn(
                    'flex items-start space-x-3',
                    message.sender === 'user'
                      ? 'flex-row-reverse space-x-reverse'
                      : ''
                  )}
                >
                  {/* 头像 */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-sm bg-gray-300 overflow-hidden">
                      <Image
                        src="/placeholder-user.jpg"
                        alt="用户头像"
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* 消息内容容器 */}
                  <div
                    className={cn(
                      'flex-1 flex',
                      message.sender === 'user'
                        ? 'justify-end'
                        : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-2 py-1 relative overflow-hidden',
                        message.sender === 'user'
                          ? 'bg-[#95ec69] text-[#303133]'
                          : 'bg-white text-[#303133] shadow-sm'
                      )}
                    >
                      <p className="text-sm break-all leading-6 font-mono whitespace-pre-wrap mb-1 py-1 overflow-hidden">
                        {message.content}
                      </p>

                      {/* 解密按钮 - 在消息内部 */}
                      <div className="flex items-center justify-start">
                        <button
                          onClick={() => {
                            // 如果已经解密，则不执行任何操作
                            if (!message.isEncrypted) return;
                            handleDecryptClick(message.id);
                          }}
                          disabled={!message.isEncrypted}
                          className={cn(
                            'flex items-center rounded-sm mr-2 px-1 py-0.5 transition-colors',
                            // 根据加密状态设置样式
                            message.isEncrypted 
                              ? 'hover:bg-gray-200 cursor-pointer' 
                              : 'cursor-not-allowed opacity-70',
                            message.sender === 'user'
                              ? 'bg-[#c9f3b5]'
                              : 'bg-[#f9ebeb]'
                          )}
                        >
                          <Image
                            src="/chats/keyIcon.png"
                            alt={message.isEncrypted ? "解密" : "已解密"}
                            width={14}
                            height={14}
                            className="mr-0.5"
                          />
                          <div className="text-[#606266] text-xs font-medium">
                            {message.isEncrypted ? '解密' : '已解密'}
                          </div>
                        </button>
                        <button
                          className={cn(
                            'flex items-center hover:bg-gray-200 rounded-sm px-1 py-0.5 transition-colors',
                            message.sender === 'user'
                              ? 'bg-[#c9f3b5]'
                              : 'bg-[#e8f7ed]'
                          )}
                        >
                          <Image
                            src="/chats/news.png"
                            alt="剩余次数"
                            width={14}
                            height={14}
                            className="mr-0.5"
                          />
                          <div className="text-[#606266] text-xs font-medium">
                            165
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* 底部输入区域 - 固定在底部 */}
      <div className="bg-[#f4f4f4] border-t border-gray-200 flex-shrink-0 relative z-20">
        <div className="px-4 py-3 safe-area-inset-bottom">
          <div className="flex items-center space-x-3">
            {/* 语音按钮 */}
            <Button variant="ghost" size="sm" className="p-0 text-gray-500">
              <div className="w-5 h-5 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.49 6-3.3 6-6.72h-1.7z" />
                </svg>
              </div>
            </Button>

            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder=""
                className="bg-white border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-sm px-2 text-sm"
                style={{ fontSize: '16px' }} // 防止iOS缩放
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>

            {/* 表情按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-gray-500"
            >
              <Smile className="h-5 w-5" />
            </Button>

            {/* 发送按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-gray-500"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
            >
              {inputMessage.trim() ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-blue-500"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
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