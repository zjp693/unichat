'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Search,
  CirclePlus,
  Wallet,
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
import dayjs from 'dayjs';
import {
  useGetPeersOf,
  useCountReceivedTodayBetween
} from '@/lib/DirectMessageAbi';
import { Address } from 'viem';
import { useToast } from '@/hooks/use-toast';
import {
  usePeerLastMessage,
  formatMessageTime
} from '@/hooks/usePeerLastMessage';
import { useChatListSync } from '@/hooks/useChatListSync';
import { useCommunitiesWithStatus } from '@/hooks/useCommunities';
import { useJoinCommunity } from '@/hooks/useJoinCommunity';
import { CommunityWithStatus } from '@/lib/types/community';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { NewUserSetupModal } from '@/components/profile/NewUserSetupModal';

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
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  memberCount?: number;
  groupCondition?: string;
  address?: string; // 群聊地址或私聊对方地址
  // 群聊状态
  canJoin?: boolean;
  isJoined?: boolean;
  proofData?: any;
}

// 将链上群聊数据转换为 ChatItem 格式
function convertCommunityToChat(community: CommunityWithStatus): ChatItem {
  return {
    id: community.communityAddress,
    name: community.name,
    avatar: community.avatarCid || '/me/me1.png',
    lastMessage: community.communityAddress, // 显示群聊地址而不是代币地址
    time: '-',
    isGroup: true,
    level: community.maxTier as 1 | 2 | 3 | 4 | 5 | 6,
    memberCount: 0, // 可以后续从合约获取
    groupCondition: `档位 ${community.maxTier}`,
    address: community.communityAddress,
    // 添加状态标识
    canJoin: community.canJoin,
    isJoined: community.isJoined,
    proofData: community.proofData
  };
}
export default function ChatPage() {
  const router = useRouter();
  const { address: currentAddress, isConnected } = useAccount();
  const { toast } = useToast();

  // 新用户检测
  const { isNewUser, isLoading: isCheckingProfile } = useProfileCheck();
  const [showSetupModal, setShowSetupModal] = useState(false);

  // 检测新用户并显示设置弹窗
  useEffect(() => {
    if (isNewUser && !isCheckingProfile) {
      setShowSetupModal(true);
    }
  }, [isNewUser, isCheckingProfile]);

  // 获取链上群聊数据
  const {
    communities: chainCommunities,
    isLoading: isCommunitiesLoading,
    error: communitiesError,
    refetch: refetchCommunities
  } = useCommunitiesWithStatus(currentAddress);

  // 获取当前用户的对端列表
  const {
    data: peers,
    isLoading: isPeersLoading,
    refetch: refetchPeers
  } = useGetPeersOf(currentAddress as Address);

  // 监听新消息，自动刷新列表
  useChatListSync(
    currentAddress as Address,
    (from, to) => {
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
      unreadCount: undefined, // 将由 ChatListItem 组件通过 useCountReceivedTodayBetween 动态获取
      isGroup: false,
      copy: false
    }));
  }, [peers]);

  // 将链上群聊转换为 ChatItem 格式
  const groupChats: ChatItem[] = useMemo(() => {
    return chainCommunities.map(convertCommunityToChat);
  }, [chainCommunities]);

  // 合并群聊和私聊列表
  const allChats = useMemo(() => {
    return [...groupChats, ...privateChats];
  }, [groupChats, privateChats]);

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部导航栏 */}
      <div className="flex-shrink-0">
        <TopNavbar />
      </div>

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
      <div
        className="bg-gray-50 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        {!isConnected ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <p className="text-sm text-gray-400">请连接钱包以查看聊天列表</p>
          </div>
        ) : isPeersLoading || isCommunitiesLoading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <p className="text-sm text-gray-400">加载中...</p>
          </div>
        ) : allChats.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <p className="text-sm text-gray-400">暂无聊天记录</p>
          </div>
        ) : (
          <div className="p-1">
            {allChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                currentAddress={currentAddress}
                onJoinSuccess={refetchCommunities}
              />
            ))}
          </div>
        )}
      </div>

      {/* 新用户设置弹窗 */}
      <NewUserSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSuccess={() => {
          setShowSetupModal(false);
          toast({
            title: '欢迎加入 UniChat！',
            description: '您的个人资料已创建成功',
            variant: 'success'
          });
        }}
      />
    </div>
  );
}

function ChatListItem({
  chat,
  currentAddress,
  onJoinSuccess
}: {
  chat: ChatItem;
  currentAddress?: Address;
  onJoinSuccess?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { joinCommunity, isJoining } = useJoinCommunity();

  // 获取私聊的最后消息时间
  const { timestamp } = usePeerLastMessage(
    !chat.isGroup && currentAddress ? currentAddress : undefined,
    !chat.isGroup ? (chat.id as Address) : (undefined as any)
  );

  // 获取私聊的今日消息总数
  // 根据网页测试结果，可能需要交换参数
  // 将聊天对象作为接收者(me)，当前用户作为发送者(peer)
  const me = !chat.isGroup ? (chat.id as Address) : (undefined as any);
  const peer =
    !chat.isGroup && currentAddress ? currentAddress : (undefined as any);

  // 注意：根据合约定义，me 是接收者，peer 是发送者
  // 统计的是：me（接收者）从 peer（发送者）那里今天收到的消息数
  const useCountReceivedTodayBetweenResult = useCountReceivedTodayBetween(
    me, // me: 接收者（当前用户）
    peer, // peer: 发送者（聊天对象）
    {
      query: {
        enabled: !chat.isGroup && !!currentAddress && !!chat.id
      }
    }
  );

  // 提取原始数据
  const {
    data: todayMessageCount,
    isLoading: isTodayCountLoading,
    error: todayCountError
  } = useCountReceivedTodayBetweenResult;

  // 将 bigint 转换为 number（今日消息数）
  const todayCount = todayMessageCount ? Number(todayMessageCount) : 0;

  // 格式化时间
  const displayTime =
    !chat.isGroup && timestamp ? formatMessageTime(timestamp) : chat.time;

  // 决定显示的消息数：私聊显示今日消息数，群聊显示原有的 unreadCount
  const displayUnreadCount = chat.isGroup
    ? chat.unreadCount
    : todayCount > 0
      ? todayCount
      : undefined;

  const handleChatClick = () => {
    // 群聊：如果未加入，不跳转
    if (chat.isGroup && !chat.isJoined) {
      return;
    }

    // 根据 chat.isGroup 动态构建 URL
    if (chat.isGroup) {
      const params = new URLSearchParams({
        type: 'group',
        ...(chat.name && { name: encodeURIComponent(chat.name) }),
        ...(chat.address && { address: chat.address }),
        ...(chat.level && { level: chat.level.toString() }),
        ...(chat.memberCount && { memberCount: chat.memberCount.toString() }),
        ...(chat.groupCondition && {
          groupCondition: encodeURIComponent(chat.groupCondition)
        })
      });
      router.push(`/chat/${chat.id}?${params.toString()}`);
    } else {
      router.push(`/chat/${chat.id}?type=private`);
    }
  };

  const handleJoinClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!chat.proofData) {
      toast({
        title: '无法加入',
        description: '您没有加入此群聊的资格',
        variant: 'destructive'
      });
      return;
    }

    const result = await joinCommunity(chat.id, chat.proofData);

    if (result.success) {
      toast({
        title: '加入成功',
        description: '正在进入群聊...',
        variant: 'success'
      });

      // 刷新群聊状态
      if (onJoinSuccess) {
        onJoinSuccess();
      }

      // 延迟跳转到聊天页面
      setTimeout(() => {
        const params = new URLSearchParams({
          type: 'group',
          name: encodeURIComponent(chat.name),
          address: chat.address || chat.id,
          level: (chat.level || 1).toString(),
          memberCount: (chat.memberCount || 0).toString(),
          groupCondition: encodeURIComponent(chat.groupCondition || '')
        });
        router.push(`/chat/${chat.id}?${params.toString()}`);
      }, 500);
    } else {
      console.error('❌ [加入群聊] 加入失败:', result.error);
      toast({
        title: '加入失败',
        description: result.error || '请重试',
        variant: 'destructive'
      });
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
    <div
      onClick={handleChatClick}
      className={`block ${chat.isGroup && !chat.isJoined ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className="relative flex items-center py-3 px-2 bg-white">
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
            {displayUnreadCount && (
              <Badge
                variant="destructive"
                className="absolute top-0 right-[-0.6rem] ml-2 h-5 min-w-[20px] text-xs flex items-center justify-center rounded-full"
              >
                {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">
                {chat.isGroup ? (
                  <>
                    {chat.name} Lv{chat.level}
                  </>
                ) : (
                  chat.name
                )}
              </h3>
              {/* 群聊认证标识 */}
              {chat.isGroup && (
                <div className="bg-white border border-[#1769df] rounded-sm text-[10px] text-[#1769df] px-1 flex-shrink-0">
                  认证
                </div>
              )}
              {/* 群聊加入按钮 - 放在群名后面 */}
              {chat.isGroup && !chat.isJoined && (
                <Button
                  size="sm"
                  className="h-6 text-xs px-3 flex-shrink-0"
                  onClick={handleJoinClick}
                  disabled={isJoining || !chat.canJoin}
                  title={!chat.canJoin ? '暂无加入资格（proof 数据无效）' : ''}
                >
                  {isJoining ? '加入中...' : '加入'}
                </Button>
              )}
              {/* 调试信息 - 显示状态 */}
              {chat.isGroup && (
                <span className="text-xs text-gray-400 ml-2">
                  {chat.isJoined ? '(已加入)' : chat.canJoin ? '' : '(无资格)'}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {displayTime}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-sm leading-[1.3] text-gray-500 break-all font-mono tracking-tight">
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
          <div
            className="pt-2 px-2 flex items-center"
            onClick={handleGroupChatClick}
          >
            <div className="w-4 h-4 mb-2 flex-shrink-0 mr-2 flex items-center justify-center">
              <Image
                src="/chats/Group chat.png"
                alt="Group chat"
                width={16}
                height={16}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="w-full text-left">
              <div className="w-full pb-2  border-b border-[#585858]">
                Group chat
              </div>
            </div>
          </div>
          <div
            className="py-2 px-2 flex items-center"
            onClick={handleItemClick}
          >
            <div className="w-4 h-4 mb-2 flex-shrink-0 mr-2 flex items-center justify-center">
              <Image
                src="/chats/Global Contacts.png"
                alt="Global Contacts"
                width={16}
                height={16}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="w-full text-left">
              <div className="w-full pb-2  border-b border-[#585858]">
                Global Contacts
              </div>
            </div>
          </div>
          <div
            className="py-2 px-2 flex items-center"
            onClick={handleItemClick}
          >
            <div className="w-4 h-4 mb-2 flex-shrink-0 mr-2 flex items-center justify-center">
              <Image
                src="/chats/Scan.png"
                alt="Scan"
                width={16}
                height={16}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="w-full text-left">
              <div className="w-full pb-2  border-b border-[#585858]">Scan</div>
            </div>
          </div>
          <div
            className="py-2 px-2 flex items-center"
            onClick={handleItemClick}
          >
            <div className="w-4 h-4 mb-2 flex-shrink-0 mr-2 flex items-center justify-center">
              <Image
                src="/chats/payment.png"
                alt="Payment"
                width={16}
                height={16}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="w-full text-left">
              <div className="w-full pb-2  border-b border-[#585858]">
                Payment
              </div>
            </div>
          </div>
          <div
            className="py-2 px-2 flex items-center"
            onClick={handleItemClick}
          >
            <div className="w-4 h-4 flex-shrink-0 mr-2 flex items-center justify-center">
              <Image
                src="/chats/Airdrop.png"
                alt="Airdrop"
                width={16}
                height={16}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="w-full text-left">
              <div className="w-full">Airdrop</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
