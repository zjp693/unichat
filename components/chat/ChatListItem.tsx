'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDispatch } from 'react-redux';
import { Address } from 'viem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IPFSImg } from '@/components/ui/ipfs-img';
import { useToast } from '@/hooks/use-toast';
import { usePeerProfile } from '@/hooks/usePeerProfile';
import { useJoinCommunity } from '@/hooks/useJoinCommunity';
import { useJoinRedPacketGroup } from '@/hooks/useJoinRedPacketGroup';
import { useChatTimestamp } from '@/hooks/useChatTimestamp';
import { useCountReceivedTodayBetween } from '@/lib/DirectMessageAbi';
import { setChatMeta } from '@/lib/chatMetaSlice';
import type { ChatItem } from '@/lib/types/chat';
import type { PeerProfile } from '@/hooks/usePeerProfile';

interface ChatListItemProps {
  chat: ChatItem;
  currentAddress?: Address;
  onJoinSuccess?: () => void;
  peerProfile?: PeerProfile; // 批量预获取的 Profile（可选）
}

export function ChatListItem({
  chat,
  currentAddress,
  onJoinSuccess,
  peerProfile
}: ChatListItemProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { toast } = useToast();

  // 根据群组类型选择不同的加入 hook
  const { joinCommunity, isJoining: isJoiningCommunity } = useJoinCommunity();
  const { joinRedPacketGroup, isJoining: isJoiningRedPacket } =
    useJoinRedPacketGroup();

  // 统一的 isJoining 状态
  const isJoining = chat.isRedPacketGroup
    ? isJoiningRedPacket
    : isJoiningCommunity;

  // 获取对方 Profile（仅私聊且没有传入 peerProfile 时才查询）
  const { profile: fallbackProfile, isLoading: isFallbackLoading } =
    usePeerProfile(
      !chat.isGroup && !peerProfile ? (chat.id as Address) : undefined
    );

  // 优先使用传入的 peerProfile，否则使用回退查询的结果
  const profile = peerProfile || fallbackProfile;
  const isLoadingProfile = !peerProfile && isFallbackLoading;

  // 提取头像 CID 和名称
  const avatarCid = useMemo(() => {
    if (chat.isGroup) {
      return chat.avatar || '';
    }
    return profile?.avatarCid || '';
  }, [chat.isGroup, chat.avatar, profile]);

  const displayName = useMemo(() => {
    if (chat.isGroup) {
      return chat.name;
    }
    return profile?.name || chat.name;
  }, [chat.isGroup, chat.name, profile]);

  // 使用统一的 useChatTimestamp 获取时间戳和群消息总数（自动上报到 Redux）
  const { displayTime, messageCount: groupMessageCount } = useChatTimestamp({
    chatId: chat.id,
    isGroup: !!chat.isGroup,
    currentAddress,
    isJoined: chat.isJoined,
    groupType: chat.isRedPacketGroup ? 'redpacket' : 'community'
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
    // 存储群聊元信息到 Redux
    dispatch(
      setChatMeta({
        chatId: chat.id,
        meta: {
          type: 'group',
          groupType: chat.isRedPacketGroup ? 'redpacket' : 'community',
          name: chat.name ?? '',
          address: chat.address ?? chat.id,
          level: chat.level ?? 1,
          memberCount: chat.memberCount ?? 0,
          groupCondition: chat.groupCondition ?? '',
          avatar: chat.avatar ?? ''
        }
      })
    );
    router.push(`/chat/${chat.id}?type=group`);
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

    // 红包群和社区群使用不同的加入逻辑
    if (chat.isRedPacketGroup) {
      // 红包群：使用 join(uint32, bytes32) 方法，不需要 proofData
      console.log('🔵 [加入红包群] 开始加入红包群...', chat.id);

      const result = await joinRedPacketGroup(chat.id);

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
        console.error('❌ [加入红包群] 加入失败:', result.error);
        toast({
          title: '加入失败',
          description: result.error || '请重试',
          variant: 'destructive'
        });
      }
    } else {
      // 社区群：使用 joinCommunity 方法，需要 proofData
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
                      {chat.name} {!chat.isRedPacketGroup && `Lv${chat.level}`}
                    </>
                  ) : (
                    displayName
                  )}
                </h3>
              )}
              {/* 群聊认证标识 */}
              {chat.isGroup && !chat.isRedPacketGroup && (
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
