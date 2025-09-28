'use client';

import { useState, useRef, useEffect } from 'react';
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
  Gift
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { KeyManagementModal } from '@/components/chat/KeyManagementModal';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import { KeyPair, chatEncryption, DEFAULT_KEY_PAIR } from '@/lib/encryption';
import dayjs from 'dayjs';

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

const TOP_BAR_HEIGHT = 56;
const NAV_BAR_HEIGHT = 56;
const FOOTER_HEIGHT = 58;
const TOTAL_HEADER_HEIGHT = TOP_BAR_HEIGHT + NAV_BAR_HEIGHT;

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { decryptMessage, encryptMessage, keys } = useKeyManagement();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content:
        'QPPMDEWEYBTI5L003WQV8AXQGMIPIVEUFLUC7X5QKWD0GBQ7S2E20GWTXXR47JRU7V3KYXI+HNZYVR60UM0PULFVIEBCH1TG1M5HIEG+DWKKQVW34MR5X8UIIRQKFTNWT3JGAKCPMIUD/H51XZA/R2YVITMD8FYTDW9NC5+PE=',
      sender: 'other',
      timestamp: new Date('2025-09-27T10:32:00'),
      type: 'text',
      isEncrypted: true,
      originalContent: 'Original message before encryption.'
    },
    {
      id: '2',
      content:
        'QPPMDEWEYBTI5L003WQV8AXQGMIPIVEUFLUC7X5QKWD0GBQ7S2E20GWTXXR47JRU7V3KYXI+HNZYVR60UM0PULFVIEBCH1TG1M5HIEG+DWKKQVW34MR5X8UIIRQKFTNWT3JGAKCPMIUD/H51XZA/R2YVITMD8FYTDW9NC5+PE=',
      sender: 'user',
      timestamp: new Date('2025-09-27T10:34:00'),
      type: 'text',
      isEncrypted: true,
      originalContent: 'Original message for user sender.'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(250);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    if (!isClient) return;
    const listener = () => {
      const currentKeyboardHeight =
        window.innerHeight -
        (window.visualViewport?.height ?? window.innerHeight);
      if (currentKeyboardHeight > 100) {
        setPanelHeight(currentKeyboardHeight);
      }
    };
    window.visualViewport?.addEventListener('resize', listener);
    return () => window.visualViewport?.removeEventListener('resize', listener);
  }, [isClient]);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      setTimeout(() => scrollToBottom('smooth'), 50);
      if (messages.length > prevMessagesLengthRef.current && !isActionsOpen) {
        const focusTimeout = setTimeout(() => inputRef.current?.focus(), 300);
        return () => clearTimeout(focusTimeout);
      }
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages, isActionsOpen, isClient]);

  const handleOpenActions = () => {
    setIsActionsOpen(true);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    let content = inputMessage.trim();
    let isEncrypted = true;
    try {
      const publicKeyToUse =
        keys.length > 0 ? keys[0].publicKey : DEFAULT_KEY_PAIR.publicKey;
      console.log('加密消息:', {
        message: inputMessage.trim(),
        keyId: keys.length > 0 ? keys[0].id : 'default',
        keyName: keys.length > 0 ? keys[0].name : 'default',
        publicKeyLength: publicKeyToUse.length
      });
      content = encryptMessage(inputMessage.trim(), publicKeyToUse);
      console.log('加密成功:', content.substring(0, 50) + '...');
    } catch (error) {
      content = '⚠️ 加密失败: ' + inputMessage.trim();
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

  const handleDecryptClick = (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (!message || !message.isEncrypted) return;
    setSelectedMessageId(messageId);
    setShowKeyModal(true);
  };

  const handleKeySelect = (key: KeyPair) => {
    if (!selectedMessageId) return;
    const message = messages.find((msg) => msg.id === selectedMessageId);
    if (!message) return;

    console.log('尝试解密消息:', {
      messageId: message.id,
      encryptedContent: message.content.substring(0, 50) + '...',
      keyId: key.id,
      keyName: key.name,
      privateKeyLength: key.privateKey.length
    });

    try {
      const decryptedContent = decryptMessage(message.content, key.privateKey);
      if (decryptedContent) {
        console.log('解密成功:', decryptedContent);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === selectedMessageId
              ? { ...msg, content: decryptedContent, isEncrypted: false }
              : msg
          )
        );
      } else {
        console.error('解密返回null');
        alert('解密返回null，可能是密钥不匹配或消息格式错误');
      }
    } catch (error) {
      console.error('解密失败:', error);
      alert('解密失败，可能是密钥不匹配或消息格式错误');
    }
    setSelectedMessageId('');
    setShowKeyModal(false);
  };

  return (
    <div className="bg-gray-100 w-full h-full">
      <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm">
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

      <div
        className="h-screen w-full"
        style={{
          paddingTop: `${TOTAL_HEADER_HEIGHT}px`,
          paddingBottom: `${FOOTER_HEIGHT + (isActionsOpen ? panelHeight : 0)}px`
        }}
      >
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-5">
            {messages.map((message) => (
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

      <div
        className="fixed bottom-0 left-0 right-0 z-20"
        style={{ paddingBottom: `env(safe-area-inset-bottom)` }}
      >
        <div
          className="p-2 flex items-center  bg-gray-100 border-t  "
          style={{ height: `${FOOTER_HEIGHT}px` }}
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
            onFocus={() => setIsActionsOpen(false)}
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
            className="flex-shrink-0 rounded-full pl-0  pr-2 py-0"
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

        <div
          className={cn(
            'bg-gray-100 overflow-hidden transition-all duration-300 ease-in-out'
          )}
          style={{ height: isActionsOpen ? `${panelHeight}px` : '0px' }}
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

      <KeyManagementModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onKeySelect={handleKeySelect}
      />
    </div>
  );
}
