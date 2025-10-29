'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Search,
  CirclePlus,
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
import { useGetPeersOf } from '@/lib/DirectMessageAbi';
import { Address } from 'viem';
import { useToast } from '@/hooks/use-toast';
import {
  usePeerLastMessage,
  formatMessageTime
} from '@/hooks/usePeerLastMessage';
import { useChatListSync } from '@/hooks/useChatListSync';

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
  const {
    data: peers,
    isLoading: isPeersLoading,
    refetch: refetchPeers
  } = useGetPeersOf(currentAddress as Address);

  // 添加调试日志，监控对端列表变化
  useEffect(() => {
    console.log('📋 对端列表更新:', {
      peers,
      peersCount: Array.isArray(peers) ? peers.length : 0,
      isLoading: isPeersLoading,
      currentAddress
    });
  }, [peers, isPeersLoading, currentAddress]);

  // 监听新消息，自动刷新列表
  useChatListSync(
    currentAddress as Address,
    (from, to) => {
      console.log('🔄 收到新消息，刷新对端列表:', { from, to, currentAddress });
      // 当收到新消息时，重新获取对端列表
      // 这样如果有新的对端，会自动添加到列表中
      refetchPeers()
        .then((result) => {
          console.log('✅ 对端列表刷新完成:', {
            success: result.isSuccess,
            data: result.data,
            peersCount: (result.data as Address[])?.length || 0
          });
        })
        .catch((error) => {
          console.error('❌ 刷新对端列表失败:', error);
        });

      // usePeerLastMessage 会自动更新最后消息时间（因为依赖了 timestamp）
      // 这里不需要额外操作
    },
    isConnected && !!currentAddress
  );

  // 将对端地址转换为 ChatItem
  const privateChats: ChatItem[] = useMemo(() => {
    if (!peers || !Array.isArray(peers)) return [];

    return peers.map((peerAddress: Address) => ({
      id: peerAddress,
      name: `${peerAddress.slice(0, 6)}...${peerAddress.slice(-4)}`,
      avatar: '/me/me2.png',
      lastMessage: peerAddress, // 直接显示完整钱包地址
      time: '-',
      unreadCount: 1, // 显示未读徽标
      isGroup: false,
      copy: false
    }));
  }, [peers]);

  // 合并群聊和私聊列表
  const allChats = useMemo(() => {
    return [...mockGroupChats, ...privateChats];
  }, [privateChats]);

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部导航栏 */}
      <TopNavbar />

      {/* 搜索栏和操作按钮 */}
      <div className="pr-4 pb-3 bg-white border-b border-gray-200 text-right flex-shrink-0">
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
          allChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              currentAddress={currentAddress}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChatListItem({
  chat,
  currentAddress
}: {
  chat: ChatItem;
  currentAddress?: Address;
}) {
  const router = useRouter();
  const { toast } = useToast();

  // 获取私聊的最后消息时间
  const { timestamp } = usePeerLastMessage(
    !chat.isGroup && currentAddress ? currentAddress : undefined,
    !chat.isGroup ? (chat.id as Address) : (undefined as any)
  );

  // 格式化时间
  const displayTime =
    !chat.isGroup && timestamp ? formatMessageTime(timestamp) : chat.time;

  const handleChatClick = () => {
    // 根据 chat.isGroup 动态构建 URL
    if (chat.isGroup) {
      router.push(`/chat/${chat.id}?type=group`);
    } else {
      router.push(`/chat/${chat.id}?type=private`);
    }
  };

  const handleCopyAddress = async (e: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发父元素的点击事件
    e.stopPropagation();

    try {
      // 复制地址到剪贴板
      await navigator.clipboard.writeText(chat.lastMessage);
      toast({
        title: '复制成功',
        description: '钱包地址已复制到剪贴板',
        variant: 'success'
      });
    } catch (err) {
      toast({
        title: '复制失败',
        description: '无法复制地址',
        variant: 'destructive'
      });
    }
  };

  return (
    // 将 <a> 标签替换为 div，并添加 onClick 事件
    <div onClick={handleChatClick} className="block cursor-pointer">
      <div className="relative flex items-center p-3 bg-white">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // 私聊时点击头像跳转到个人资料页（需要判断是否好友，这里先用nonfriend）
              if (!chat.isGroup && chat.id) {
                router.push(`/contacts/profile/${chat.id}?type=nonfriend`);
              }
            }}
            className="h-12 w-12 rounded-sm overflow-hidden"
          >
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
          </button>
          {chat.isOnline && (
            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>

        <div className="flex-1 ml-3 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-sm truncate">{chat.name}</h3>
            <span className="text-xs text-gray-400">{displayTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-xs leading-[1.3] text-gray-500 break-all font-mono tracking-tight">
              {chat.lastMessage}
            </p>
            {!chat.copy && (
              <button
                onClick={handleCopyAddress}
                className="flex-shrink-0 p-0.5 rounded  mt-0.5"
                title="复制地址"
              >
                <img
                  src="/contacts/copy.svg"
                  alt="复制"
                  className="w-3.5 h-3.5 object-cover"
                />
              </button>
            )}
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
