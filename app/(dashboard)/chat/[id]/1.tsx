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
  originalContent?: string;
}

// 定义头部和底部的高度，用于内边距占位
const HEADER_HEIGHT = 56; // 您的头部导航栏高度
const FOOTER_HEIGHT = 60; // 您的底部输入框高度

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { decryptMessage, encryptMessage, keys } = useKeyManagement();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', content: '这是固定定位布局的最终版', sender: 'other', timestamp: new Date(), type: 'text', isEncrypted: false },
    { id: '2', content: '现在输入框和键盘弹出都会滚动', sender: 'other', timestamp: new Date(), type: 'text', isEncrypted: false }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  };

  useEffect(() => { setIsClient(true); }, []);

  // **NEW**: 新增的 useEffect，专门处理键盘弹出时的滚动
  useEffect(() => {
    if (!isClient) return;

    const handleViewportResize = () => {
      // 当视口大小变化（即键盘弹出）时，平滑滚动到底部
      setTimeout(() => scrollToBottom('smooth'), 50);
    };

    window.visualViewport?.addEventListener('resize', handleViewportResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, [isClient]);

  // 这个 useEffect 负责处理“发送新消息”后的滚动和聚焦
  useEffect(() => {
    if (isClient) {
      if (initialLoadRef.current) {
        setTimeout(() => scrollToBottom('auto'), 150);
        initialLoadRef.current = false;
      } else {
        setTimeout(() => scrollToBottom('smooth'), 50);
        const focusTimeout = setTimeout(() => inputRef.current?.focus(), 300);
        return () => clearTimeout(focusTimeout);
      }
    }
  }, [messages, isClient]);

  // 所有其他函数 (handleSendMessage, handleKeyPress, 等) 保持不变...
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    let content = inputMessage.trim();
    let isEncrypted = true;
    try {
      const publicKeyToUse = keys.length > 0 ? keys[0].publicKey : DEFAULT_KEY_PAIR.publicKey;
      content = encryptMessage(inputMessage.trim(), publicKeyToUse);
    } catch (error) {
      content = "⚠️ 加密失败: " + inputMessage.trim();
      isEncrypted = false;
      alert(`加密失败`);
    }
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      isEncrypted,
      originalContent: inputMessage.trim()
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDecryptClick = (messageId: string) => { /* ... */ };
  const handleKeySelect = (key: KeyPair) => { /* ... */ };

  return (
    <div className="bg-slate-50 w-full h-full">
      
      {/* 头部容器: 固定定位 */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm" style={{ height: `${HEADER_HEIGHT}px` }}>
        <div className="flex items-center justify-between px-4 h-full">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0">
                <Image src="/chats/arrow_left.png" alt="返回" width={10} height={12} />
            </Button>
            <h1 className="text-base font-medium text-black">张三</h1>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-5 w-5 text-black" />
            </Button>
        </div>
      </div>

      {/* 聊天消息区域: 使用 padding 为固定的头部和尾部留出空间 */}
      <div 
        className="h-screen w-full"
        style={{
            paddingTop: `${HEADER_HEIGHT}px`,
            paddingBottom: `${FOOTER_HEIGHT}px`,
        }}
      >
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={cn('w-full flex', message.sender === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('flex items-start gap-3', message.sender === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <Image src={message.sender === 'user' ? "/placeholder-user-2.jpg" : "/placeholder-user.jpg"} alt="Avatar" width={40} height={40} className="rounded-md flex-shrink-0" />
                  <div className={cn('max-w-[70vw] rounded-lg px-3 py-2 text-sm break-words shadow-sm', message.sender === 'user' ? 'bg-[#95ec69] text-black' : 'bg-white text-black')}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.isEncrypted && (
                      <div className="flex justify-start mt-2">
                        <button onClick={() => handleDecryptClick(message.id)} className="flex items-center rounded-md px-2 py-1 bg-black/10 hover:bg-black/20 transition-colors text-xs font-medium">
                           <Image src="/chats/keyIcon.png" alt="解密" width={14} height={14} className="mr-1" />
                           解密
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 底部输入区域: 固定定位 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-100 border-t" style={{ height: `${FOOTER_HEIGHT}px` }}>
        <div className="p-2 flex items-center gap-2 h-full" style={{ marginBottom: `env(safe-area-inset-bottom)` }}>
          <Input ref={inputRef} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type a message"
            className="flex-1 bg-white border-none rounded-md h-10 text-base focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0" autoComplete="off" />
          <Button variant="ghost" size="icon" className="text-gray-500"><Smile className="h-6 w-6" /></Button>
          <Button variant="ghost" size="icon" onClick={handleSendMessage} disabled={!inputMessage.trim()}>
            {/* Send/Plus Icon */}
          </Button>
        </div>
      </div>

      <KeyManagementModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onKeySelect={handleKeySelect}
      />
    </div>
  );
}