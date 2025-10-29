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
import { TopNavbar } from '@/components/ui/top-navbar';
import Image from 'next/image';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import {
  useGetPeersOf,
  useGetMessageCount,
  useGetMessages
} from '@/lib/DirectMessageAbi';
import { Address } from 'viem';

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

// 群聊 Mock 数据（保留）
const mockGroupChats: ChatItem[] = [
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
  }
];
export default function ChatPage() {
  const router = useRouter();
  const { address: currentAddress, isConnected } = useAccount();

  // 获取当前用户的对端列表
  const { data: peers, isLoading: isPeersLoading } = useGetPeersOf(
    currentAddress as Address
  );

  // 将对端地址转换为 ChatItem
  const privateChats: ChatItem[] = useMemo(() => {
    if (!peers || !Array.isArray(peers)) return [];

    return peers.map((peerAddress: Address) => ({
      id: peerAddress,
      name: `${peerAddress.slice(0, 6)}...${peerAddress.slice(-4)}`,
      avatar: '/placeholder-user.jpg',
      lastMessage: '点击查看聊天',
      time: '-',
      unreadCount: 10, // 显示未读徽标
      isGroup: false,
      copy: false
    }));
  }, [peers]);

  // 合并群聊和私聊列表
  const allChats = useMemo(() => {
    return [...mockGroupChats, ...privateChats];
  }, [privateChats]);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航栏 */}
      <TopNavbar />

      {/* 搜索栏和操作按钮 */}
      <div className="pr-4 pb-3 bg-white border-b border-gray-200 text-right">
        <button
          className="p-2 rounded-full mr-2 hover:bg-gray-100 transition-colors"
          onClick={() => router.push('/search')}
        >
          <Search size={18} />
        </button>
        <DropdownMenu />
      </div>

      {/* 聊天列表 */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!isConnected ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-gray-400">请连接钱包以查看聊天列表</p>
          </div>
        ) : isPeersLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-gray-400">加载中...</p>
          </div>
        ) : allChats.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-gray-400">暂无聊天记录</p>
          </div>
        ) : (
          allChats.map((chat) => <ChatListItem key={chat.id} chat={chat} />)
        )}
      </div>
    </div>
  );
}

function ChatListItem({ chat }: { chat: ChatItem }) {
  const router = useRouter();
  const { address: currentAddress } = useAccount();

  // 仅在私聊时获取消息总数
  // 群聊时传入空字符串地址，利用钩子内置的 enabled 条件自动禁用查询
  const { data: messageCountBigInt } = useGetMessageCount(
    currentAddress as Address,
    (chat.isGroup ? '' : chat.id) as Address
  );

  const messageCount = messageCountBigInt ? Number(messageCountBigInt) : 0;

  // 获取最后一条消息（仅当有消息且为私聊时）
  // 群聊时传入空字符串地址，利用钩子内置的 enabled 条件自动禁用查询
  const { data: lastMessages } = useGetMessages(
    currentAddress as Address,
    (chat.isGroup ? '' : chat.id) as Address,
    BigInt(messageCount > 0 ? messageCount - 1 : 0), // start = total - 1
    BigInt(messageCount > 0 ? 1 : 0) // count = 1
  );

  // 提取最后一条消息的内容
  const lastMessageContent = useMemo(() => {
    if (
      !lastMessages ||
      !Array.isArray(lastMessages) ||
      lastMessages.length === 0
    ) {
      return null;
    }
    const lastMsg = lastMessages[0];
    // 显示消息内容的前30个字符
    const content = lastMsg.content || '';
    return content.length > 30 ? `${content.slice(0, 30)}...` : content;
  }, [lastMessages]);

  // 动态更新 lastMessage 显示
  const displayLastMessage = chat.isGroup
    ? chat.lastMessage
    : lastMessageContent
      ? lastMessageContent
      : messageCount > 0
        ? '加载中...'
        : '暂无消息';

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
          <div className="h-12 w-12 rounded-sm overflow-hidden">
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
                {displayLastMessage}
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
