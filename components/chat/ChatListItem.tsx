'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useReadContract } from 'wagmi';
import { Address, Abi } from 'viem';
import communityABI from '@/contract/abi/community.json';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IPFSImg } from '@/components/ui/ipfs-img';
import { useToast } from '@/hooks/use-toast';
import { usePeerProfile } from '@/hooks/usePeerProfile';
import { useJoinCommunity } from '@/hooks/useJoinCommunity';
import { useChatTimestamp } from '@/hooks/useChatTimestamp';
import { useCountReceivedTodayBetween } from '@/lib/DirectMessageAbi';
import type { ChatItem } from '@/lib/types/chat';

interface ChatListItemProps {
  chat: ChatItem;
  currentAddress?: Address;
  onJoinSuccess?: () => void;
}

export function ChatListItem({
  chat,
  currentAddress,
  onJoinSuccess
}: ChatListItemProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { joinCommunity, isJoining } = useJoinCommunity();

  // 获取对方 Profile（仅私聊）
  const { profile, isLoading: isLoadingProfile } = usePeerProfile(
    !chat.isGroup ? (chat.id as Address) : undefined
  );

  // 提取头像 CID 和名称
  const avatarCid = useMemo(() => {
    if (chat.isGroup) {
      return chat.avatar || '';
    }
    return (profile as any)?.avatarCid || '';
  }, [chat.isGroup, chat.avatar, profile]);

  const displayName = useMemo(() => {
    if (chat.isGroup) {
      return chat.name;
    }
    return (profile as any)?.name || chat.name;
  }, [chat.isGroup, chat.name, profile]);

  // 获取群聊消息总数（只有已加入的群聊才获取）
  const { data: groupMessageCountData } = useReadContract({
    address: chat.isGroup && chat.isJoined ? (chat.id as Address) : undefined,
    abi: communityABI.abi as Abi,
    functionName: 'communityMessageCount',
    query: {
      enabled: chat.isGroup && chat.isJoined && !!chat.id
    }
  });
  const groupMessageCount = groupMessageCountData
    ? Number(groupMessageCountData)
    : 0;

  // 使用统一的 useChatTimestamp 获取时间戳（自动上报到 Redux）
  const { displayTime } = useChatTimestamp({
    chatId: chat.id,
    isGroup: !!chat.isGroup,
    currentAddress,
    isJoined: chat.isJoined
  });

  // 获取私聊的今日消息总数
  const me = !chat.isGroup ? (chat.id as Address) : (undefined as any);
  const peer =
    !chat.isGroup && currentAddress ? currentAddress : (undefined as any);

  const useCountReceivedTodayBetweenResult = useCountReceivedTodayBetween(
    me,
    peer,
    {
      query: {
        enabled: !chat.isGroup && !!currentAddress && !!chat.id
      }
    }
  );

  const {
    data: todayMessageCount,
    isLoading: isTodayCountLoading,
    error: todayCountError
  } = useCountReceivedTodayBetweenResult;

  const todayCount = todayMessageCount ? Number(todayMessageCount) : 0;

  // 决定显示的消息数
  const displayUnreadCount = chat.isGroup
    ? chat.isJoined && groupMessageCount > 0
      ? groupMessageCount
      : undefined
    : todayCount > 0
      ? todayCount
      : undefined;

  // 统一的群聊跳转函数
  const navigateToGroupChat = () => {
    const params = new URLSearchParams({
      type: 'group',
      name: chat.name ?? '',
      address: chat.address ?? chat.id,
      level: String(chat.level ?? 1),
      memberCount: String(chat.memberCount ?? 0),
      groupCondition: chat.groupCondition ?? '',
      avatar: chat.avatar ?? ''
    });
    router.push(`/chat/${chat.id}?${params.toString()}`);
  };

  const handleChatClick = () => {
    if (chat.isGroup && !chat.isJoined) {
      return;
    }

    if (chat.isGroup) {
      navigateToGroupChat();
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

      if (onJoinSuccess) {
        onJoinSuccess();
      }

      setTimeout(() => navigateToGroupChat(), 500);
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
    e.stopPropagation();

    try {
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
    <div
      onClick={handleChatClick}
      className={`block ${chat.isGroup && !chat.isJoined ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className="relative flex items-center py-3 px-2 bg-white">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!chat.isGroup && chat.id) {
                router.push(`/contacts/profile/${chat.id}?type=nonfriend`);
              }
            }}
            className="h-14 w-14 rounded-sm overflow-hidden"
          >
            {displayUnreadCount && (
              <Badge
                variant="destructive"
                className="absolute top-0 right-[-0.6rem] ml-2 h-5 min-w-[20px] text-xs flex items-center justify-center rounded-full"
              >
                {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
              </Badge>
            )}
            {!chat.isGroup && isLoadingProfile ? (
              <Skeleton className="h-full w-full" />
            ) : chat.isGroup ? (
              <Image
                src={chat.avatar || '/me/me1.png'}
                alt={displayName}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <IPFSImg
                src={avatarCid}
                fallbackSrc="/me/me2.png"
                alt={displayName}
                className="h-full w-full object-cover"
                width={48}
                height={48}
                enableLogging={true}
                maxRetries={5}
              />
            )}
          </button>
          {chat.isOnline && (
            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>

        <div className="flex-1 ml-3 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {!chat.isGroup && isLoadingProfile ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <h3 className="font-medium text-sm truncate">
                  {chat.isGroup ? (
                    <>
                      {chat.name} Lv{chat.level}
                    </>
                  ) : (
                    displayName
                  )}
                </h3>
              )}
              {/* 群聊认证标识 */}
              {chat.isGroup && (
                <div className="bg-white border border-[#1769df] rounded-sm text-[10px] text-[#1769df] px-1 flex-shrink-0">
                  认证
                </div>
              )}
              {/* 群聊加入按钮 */}
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
              {/* 调试信息 */}
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
                className="flex-shrink-0 p-0.5 rounded mt-0.5"
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
