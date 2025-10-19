'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Search,
  CirclePlus,
  Copy,
  Wallet,
  Users,
  Globe,
  QrCode,
  CreditCard,
  Gift
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ChatItem {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  isOnline?: boolean;
  isGroup?: boolean;
  copy?: boolean;
}

const mockChats: ChatItem[] = [
  {
    id: '1',
    name: 'Arbitrum Vote Group',
    avatar: '/me/me1.png',
    lastMessage: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    time: '9:28',
    unreadCount: 5,
    isGroup: true
  },
  {
    id: '2',
    name: 'BNB Chain持币群',
    avatar: '/top/bnb1.jpg',
    lastMessage: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    time: '9:22',
    unreadCount: 65,
    isGroup: true
  },
  {
    id: '3',
    name: 'Publicleader Group',
    avatar: '/me/me1.png',
    lastMessage: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    time: '9:14',
    unreadCount: 65,
    isGroup: true
  },
  {
    id: '4',
    name: 'Arbitrim Project Team',
    avatar: '/me/me1.png',
    lastMessage: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    time: '9:11',
    unreadCount: 65,
    isGroup: true
  },
  {
    id: '5',
    name: 'Vitalik Musk',
    avatar: '/me/me2.png',
    lastMessage: 'welcome',
    time: '8:28',
    unreadCount: 65,
    copy: true
  },
  {
    id: '6',
    name: 'Musk JedMcCaleb',
    avatar: '/me/me2.png',
    lastMessage: 'welcome',
    time: '6:28',
    unreadCount: 65,
    copy: true
  }
];
const address = '0xE0438Eb3703bF871E31Ce639bd351109c88666ea';
export default function ChatPage() {
  const router = useRouter(); // <-- 添加 useRouter 钩子
  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航栏 */}
      <div className="flex justify-between items-center py-4 px-1 bg-white">
        {/* <Button variant="outline" className="px-3 py-1 text-xs">
          <Image
            src="/top/bnb.png"
            alt="usa"
            className="object-cover mr-1"
            width={19}
            height={19}
          />
          BNB Chain
        </Button> */}
        {/* 使用 AppKit 钱包连接按钮替换原有的地址显示 */}
        <appkit-button />
        <Button variant="outline" className="flex items-center space-x-1">
          <div className="inline-block align-middle mr-1 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src="/top/usa.png"
              alt="usa"
              className="w-full h-full object-cover"
              width={20}
              height={20}
            />
          </div>
          <span className="text-xs">USA</span>
        </Button>
      </div>

      {/* 搜索栏和操作按钮 */}
      <div className="pr-4 pb-3 bg-white border-b border-gray-200 text-right">
        <button className="p-2 rounded-full mr-2">
          <Search size={18} />
        </button>
        <DropdownMenu />
      </div>

      {/* 聊天列表 */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {mockChats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} />
        ))}
      </div>
    </div>
  );
}

function ChatListItem({ chat }: { chat: ChatItem }) {
  const router = useRouter(); // <-- 添加 useRouter 钩子

  const handleChatClick = () => {
    // 根据 chat.isGroup 动态构建 URL
    if (chat.isGroup) {
      // 对于群聊，如果需要，可以添加不同的参数
      router.push(`/chat/${chat.id}?type=group`);
    } else {
      // 对于单对单聊天，显式添加 type=private
      router.push(`/chat/${chat.id}?type=private`);
    }
  };

  return (
    // 将 <a> 标签替换为 div，并添加 onClick 事件
    <div onClick={handleChatClick} className="block cursor-pointer">
      <div className="relative flex items-center p-3 hover:bg-gray-100/50 bg-white">
        <div className="relative">
          <div className="h-12 w-12 rounded overflow-hidden border border-gray-200">
            {chat.unreadCount && (
              <Badge
                variant="destructive"
                className="absolute top-0 right-[-0.6rem] ml-2 h-5 min-w-[20px] text-xs flex items-center justify-center rounded-full"
              >
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </Badge>
            )}
            <Image
              src={chat.avatar}
              alt={chat.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </div>
          {chat.isOnline && (
            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>

        <div className="flex-1 ml-3 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm truncate">{chat.name}</h3>
            <span className="text-xs text-gray-400">{chat.time}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="w-[100%]">
              <p className="text-xs text-gray-500 truncate max-w-[94%] inline-block align-middle">
                {chat.lastMessage}
              </p>
              {!chat.copy && <Copy className="h-4 w-4 inline-block ml-1" />}
            </div>
          </div>
          {/* 下边框 */}
          <div className="border-t w-[calc(100%-5rem)] border-border absolute bottom-0"></div>
        </div>
      </div>
    </div>
  );
}

function DropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleGroupChatClick = () => {
    setIsOpen(false);
    router.push('/chat/create-group');
    console.log('✅ 创建群聊...');
  };

  const handleItemClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button className="p-2 rounded-full" onClick={() => setIsOpen(!isOpen)}>
        <CirclePlus size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-[#424242] text-xs text-white shadow-lg rounded-md z-50">
          {/* 添加向上箭头 */}
          <div className="absolute -top-3 right-2 w-0 h-0 border-l-8 border-r-8 border-b-[16px] border-l-transparent border-r-transparent border-b-[#424242]"></div>
          <div className="pt-2 px-2 flex" onClick={handleGroupChatClick}>
            <Users className="mr-2 h-4 w-4" />
            <div className="w-full text-left">
              <div className="w-full pb-2  border-b border-[#585858]">
                Group chat
              </div>
            </div>
          </div>
          <div className="py-2 px-2 flex" onClick={handleItemClick}>
            <Users className="mr-2 h-4 w-4" />
            <div className="w-full text-left">
              <div className="w-full pb-2  border-b border-[#585858]">
                Global Contacts
              </div>
            </div>
          </div>
          <div className="py-2 px-2 flex" onClick={handleItemClick}>
            <Users className="mr-2 h-4 w-4" />
            <div className="w-full text-left">
              <div className="w-full pb-2  border-b border-[#585858]">Scan</div>
            </div>
          </div>
          <div className="py-2 px-2 flex" onClick={handleItemClick}>
            <Users className="mr-2 h-4 w-4" />
            <div className="w-full text-left">
              <div className="w-full pb-2  border-b border-[#585858]">
                Payment
              </div>
            </div>
          </div>
          <div className="py-2 px-2 flex" onClick={handleItemClick}>
            <Users className="mr-2 h-4 w-4" />
            <div className="w-full text-left">
              <div className="w-full">Airdrop</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
