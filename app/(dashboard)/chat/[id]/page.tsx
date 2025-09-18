'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, MoreHorizontal, Plus, Smile } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { KeyManagementModal } from '@/components/chat/KeyManagementModal';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import { KeyPair, chatEncryption } from '@/lib/encryption';

// 消息类型定义
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'other';
  timestamp: Date;
  type: 'text' | 'image';
  isEncrypted?: boolean;
}

export default function ChatPage({ params }: { params: { id: string } }) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      let content = inputMessage.trim();
      let isEncrypted = true; // 默认所有消息都加密

      try {
        if (keys.length > 0) {
          // 如果有本地密钥，使用第一个可用密钥的公钥加密
          content = encryptMessage(inputMessage.trim(), keys[0].publicKey);
        } else {
          // 如果没有本地密钥，生成临时密钥对进行加密
          const { publicKey } = chatEncryption.generateKeyPair(2048);
          content = encryptMessage(inputMessage.trim(), publicKey);
        }
      } catch (error) {
        console.error('加密失败:', error);
        // 如果加密失败，仍然标记为加密（显示解密按钮）
        // 这样用户可以知道这条消息原本应该是加密的
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
    
    const message = messages.find(msg => msg.id === selectedMessageId);
    if (!message) return;

    try {
      const decryptedContent = decryptMessage(message.content, key.privateKey);
      
      // 更新消息状态
      setMessages(prev => prev.map(msg => {
        if (msg.id === selectedMessageId) {
          return {
            ...msg,
            content: decryptedContent,
            isEncrypted: false,
            originalContent: msg.content
          };
        }
        return msg;
      }));
    } catch (error) {
      console.error('解密失败:', error);
      alert('解密失败，请检查密钥是否正确');
    }
    
    setSelectedMessageId('');
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
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* 顶部状态栏 */}
      <div className="bg-white px-2 py-2  flex items-center justify-between">
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
          size="icon"
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

        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-5 w-5 text-black" />
        </Button>
      </div>

      {/* 聊天消息区域 - 固定高度，内部滚动 */}
      <div className="flex-1 px-2 bg-[#f4f4f4]">
        <ScrollArea className="h-[calc(100vh-220px)]">
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
                   <div className={cn(
                     'flex-1 flex',
                     message.sender === 'user' ? 'justify-end' : 'justify-start'
                   )}>
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
                          onClick={() => handleDecryptClick(message.id)}
                          className={cn(
                            "flex items-center hover:bg-gray-200 rounded-sm mr-2 px-1 py-0.5 transition-colors",
                            message.sender === 'user' 
                              ? 'bg-[#c9f3b5]' 
                              : 'bg-[#f9ebeb]'
                          )}
                        >
                            <Image
                              src="/chats/keyIcon.png"
                              alt="解密"
                              width={14}
                              height={14}
							  className='mr-0.5'
                            />
                          <div className="text-[#606266] text-xs font-medium">
                            解密
                          </div>
                        </button>
						<button 
                          className={cn(
                            "flex items-center hover:bg-gray-200 rounded-sm px-1 py-0.5 transition-colors",
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
							  className='mr-0.5'
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
      <div className="bg-[#f4f4f4] px-4 py-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* 语音按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-gray-500"
          >
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
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="今天群聊会很有利"
              className="bg-white border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-sm px-2 text-sm"
            />
          </div>

          {/* 表情按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 text-gray-500"
          >
            <Smile className="h-5 w-5" />
          </Button>

          {/* 发送/添加按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 text-gray-500"
          >
            <Plus className="h-5 w-5" />
          </Button>
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
