'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { ChatNavbar } from '@/components/ui/chat-navbar';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { ChatListSkeleton } from '@/components/chat/ChatListSkeleton';
import { NewUserSetupModal } from '@/components/profile/NewUserSetupModal';
import { useToast } from '@/hooks/use-toast';
import { useGetPeersOf } from '@/lib/DirectMessageAbi';
import { useChatListSync } from '@/hooks/useChatListSync';
import { useCommunitiesWithStatus } from '@/hooks/useCommunities';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { useSortedChats } from '@/hooks/useSortedChats';
import { useBatchPeerProfiles } from '@/hooks/useBatchPeerProfiles';
import { convertCommunityToChat } from '@/lib/chat/utils';
import type { ChatItem } from '@/lib/types/chat';

export default function ChatPage() {
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
    () => {
      refetchPeers()
        .then((result) => {
          console.log('✅ 对端列表刷新完成:', {
            success: result.isSuccess,
            peersCount: (result.data as Address[])?.length || 0
          });
        })
        .catch((error) => {
          console.error('❌ 刷新对端列表失败:', error);
        });
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
      lastMessage: peerAddress,
      time: '-',
      unreadCount: undefined,
      isGroup: false,
      copy: false
    }));
  }, [peers]);

  // 将链上群聊转换为 ChatItem 格式
  const groupChats: ChatItem[] = useMemo(() => {
    return chainCommunities.map(convertCommunityToChat);
  }, [chainCommunities]);

  // 合并群聊和私聊列表（未排序）
  const allChatsRaw = useMemo(() => {
    return [...groupChats, ...privateChats];
  }, [groupChats, privateChats]);

  // 使用 useSortedChats 按最后消息时间排序
  const allChats = useSortedChats(allChatsRaw);

  // 批量获取所有私聊的 Profile（P0 优化：减少 RPC 调用）
  const privateChatAddresses = useMemo(() => {
    return privateChats.map((chat) => chat.id as Address);
  }, [privateChats]);
  const { profileMap } = useBatchPeerProfiles(privateChatAddresses);

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部导航栏 */}
      <div className="flex-shrink-0">
        <ChatNavbar />
      </div>

      {/* 聊天列表 */}
      <div
        className="bg-gray-50 overflow-y-auto flex-1"
        style={{ maxHeight: 'calc(100vh - 134px)' }}
      >
        {!isConnected ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <p className="text-sm text-gray-400">请连接钱包以查看聊天列表</p>
          </div>
        ) : isPeersLoading || isCommunitiesLoading ? (
          <ChatListSkeleton count={5} />
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
                peerProfile={
                  chat.isGroup
                    ? undefined
                    : profileMap.get(chat.id.toLowerCase())
                }
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
