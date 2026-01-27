'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  useAccount,
  useChainId,
  useChains,
  usePublicClient,
  useReadContract
} from 'wagmi';
import { Address, parseAbi } from 'viem';

import { ChatNavigationBar } from '@/components/chat/chat-navigation-bar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import { chatEncryption } from '@/lib/keyManagement';
import { usePeerAvatar, usePeerProfile } from '@/hooks/usePeerProfile';
import {
  useSendMessage,
  useRegisterPublicKey,
  useDirectMessageAddress,
  DirectMessageAbi
} from '@/lib/DirectMessageAbi';
import { getContractAddress } from '@/lib/web3/contracts';
import { useSendCommunityMessage } from '@/hooks/useSendCommunityMessage';
import { useChatParams } from '@/hooks/chat/data/useChatParams';
import { useChatRefs } from '@/hooks/chat/state/useChatRefs';
import { useScrollManager } from '@/hooks/chat/ui/useScrollManager';
import { useKeyboardManager } from '@/hooks/chat/ui/useKeyboardManager';
import { useRedPacketActions } from '@/hooks/chat/actions/useRedPacketActions';
import { useRedPacketEvents } from '@/hooks/chat/events/useRedPacketEvents';
import { useEncryptionActions } from '@/hooks/chat/actions/useEncryptionActions';
import { useMessageActions } from '@/hooks/chat/actions/useMessageActions';
import { useMessageLoader } from '@/hooks/chat/data/useMessageLoader';
import { useCommunityMembersCount } from '@/hooks/useCommunityMembers';
import { useCommunityMeta } from '@/hooks/useCommunityMeta';
import { useUserSubgroup } from '@/hooks/useUserSubgroup';
import {
  ChatInputArea,
  ChatInputAreaRef
} from '@/components/chat/ChatInputArea';
import { ChatModals } from '@/components/chat/ChatModals';
import { MessageList } from '@/components/chat/MessageList';
import { ChatActionsPanel } from '@/components/chat/ChatActionsPanel';
import { OpenRedPacketModalNew } from '@/components/chat/red-packet/OpenRedPacketModal';
import { RedPacketDetailsModal } from '@/components/chat/red-packet/RedPacketDetailsModal';
import { SubgroupTabs } from '@/components/chat/SubgroupTabs';
import { NAV_BAR_HEIGHT, FOOTER_HEIGHT } from '@/lib/chat/constants';
import {
  setIsActionsOpen,
  setPanelHeight,
  setShowKeyModal,
  setShowGenerationModal,
  setShowDecryptModal,
  setShowSendModeModal,
  setPendingGroupMessage,
  setSelectedMessageId,
  setShowGroupInfoPanel,
  setShowPrivateChatSettingsPanel,
  resetChatState,
  setActiveSubgroupTab,
  setUserSubgroupId
} from '@/lib/chatSlice';
import type { RootState } from '@/lib/store';
import type { Message } from '@/lib/chat/types';

function ChatContent() {
  const dispatch = useDispatch();

  // --- Redux State ---
  const {
    isActionsOpen,
    panelHeight,
    selectedMessageId,
    pendingGroupMessage,
    activeSubgroupTab,
    userSubgroupId
  } = useSelector((state: RootState) => state.chat);

  // --- Local State ---
  const [isClient, setIsClient] = useState(false);
  const [selectedRedPacket, setSelectedRedPacket] = useState<Message | null>(
    null
  );
  const [detailsRedPacket, setDetailsRedPacket] = useState<Message | null>(
    null
  );

  // --- Refs ---
  const chatInputAreaRef = useRef<ChatInputAreaRef>(null);

  // --- URL 参数解析 ---
  const {
    conversationId,
    chatType,
    recipientAddress,
    groupName,
    groupAddress,
    groupAvatar,
    memberCount,
    groupLevel,
    groupCondition,
    invitedMembersMessage,
    groupType,
    from
  } = useChatParams();

  // --- 基础钩子 ---
  const router = useRouter();
  /* Key Management & Registration */
  const {
    keys,
    generateNewKeyPair,
    loading: isGeneratingKey
  } = useKeyManagement();

  // Public Key Registration
  const { writeContractAsync: registerPublicKey } = useRegisterPublicKey();
  const directMessageAddress = useDirectMessageAddress();
  const [isRegistering, setIsRegistering] = useState(false);

  // Combined Loading State
  const isKeyActionLoading = isGeneratingKey || isRegistering;

  // Handle Key Generation & Registration
  const handleGenerateKey = async () => {
    if (!directMessageAddress) {
      console.error('无法获取合约地址');
      return;
    }

    try {
      // 1. Generate Key Pair Locally
      const defaultName = `Key-${new Date().toISOString().slice(0, 10)}`;
      const keyPair = await generateNewKeyPair(defaultName);

      if (!keyPair) {
        throw new Error('密钥生成失败');
      }

      // 2. Register Public Key On-Chain
      console.log('开始注册公钥:', keyPair.publicKey);
      setIsRegistering(true);
      await registerPublicKey({
        address: directMessageAddress,
        abi: DirectMessageAbi,
        functionName: 'registerPublicKey',
        args: [keyPair.publicKey]
      });
      console.log('公钥注册成功');

      // 3. Close Modal
      dispatch(setShowGenerationModal(false));
    } catch (error) {
      console.error('密钥生成或注册失败:', error);
      // Optional: Add toast notification here
    } finally {
      setIsRegistering(false);
    }
  };

  // --- 实时从合约读取群名（针对红包群） ---
  const isRedPacket = groupType === 'redpacket';
  const redPacketGroupAddress = (conversationId ||
    groupAddress) as `0x${string}`;

  const { data: contractGroupName } = useReadContract({
    address: redPacketGroupAddress,
    abi: parseAbi(['function groupName() view returns (string)']),
    functionName: 'groupName',
    query: { enabled: isRedPacket && !!redPacketGroupAddress }
  });

  // 读取入群费
  const { data: entryFee } = useReadContract({
    address: redPacketGroupAddress,
    abi: parseAbi(['function entryFeeAmount() view returns (uint256)']),
    functionName: 'entryFeeAmount',
    query: { enabled: isRedPacket && !!redPacketGroupAddress }
  });

  // 读取入群代币地址
  const { data: entryTokenAddress } = useReadContract({
    address: redPacketGroupAddress,
    abi: parseAbi(['function entryToken() view returns (address)']),
    functionName: 'entryToken',
    query: { enabled: isRedPacket && !!redPacketGroupAddress }
  });

  // 读取代币符号
  const { data: tokenSymbol } = useReadContract({
    address: entryTokenAddress as `0x${string}`,
    abi: parseAbi(['function symbol() view returns (string)']),
    functionName: 'symbol',
    query: { enabled: isRedPacket && !!entryTokenAddress }
  });

  // 格式化入群费显示
  const formattedEntryFee = useMemo(() => {
    if (!entryFee || !tokenSymbol) return null;
    // 假设 18 位小数，实际可以再读取 decimals
    const formatted = (Number(entryFee) / 1e18).toLocaleString(undefined, {
      maximumFractionDigits: 6
    });
    return `入群费: ${formatted} ${tokenSymbol}`;
  }, [entryFee, tokenSymbol]);

  // 最终显示的群名优先使用合约里的
  const displayName =
    (contractGroupName as string) || (groupName as string) || undefined;

  // --- Wagmi 钩子 ---
  const { address: currentAddress } = useAccount();
  const chainId = useChainId();
  const chains = useChains();
  const publicClient = usePublicClient();

  // --- 头像获取 ---
  // --- 头像获取 ---
  const { profile: peerProfile, isLoading: isPeerAvatarLoading } =
    usePeerProfile(chatType === 'private' ? recipientAddress : undefined);

  const peerAvatarCid = peerProfile?.avatarCid;
  const peerName = peerProfile?.name;
  const peerAvatarUrl = peerProfile?.avatarCid; // Use CID as URL for now, components should handle it using IPFSImg or similar logic

  const { profile: myProfile, isLoading: isMyAvatarLoading } = usePeerProfile(
    currentAddress as Address | undefined
  );

  const myAvatarCid = myProfile?.avatarCid;
  const myAvatarUrl = myProfile?.avatarCid;

  // --- 群成员数量（实时从链上获取）---
  const { memberCount: realTimeMemberCount, isLoading: isMemberCountLoading } =
    useCommunityMembersCount(
      chatType === 'group' ? groupAddress : undefined,
      groupType
    );

  // --- 群聊元信息（进入页面后从链上刷新）---
  useCommunityMeta(chatType === 'group' ? groupAddress : undefined);

  // --- 用户分群信息 (红包群专用) ---
  const { subgroupId: fetchedSubgroupId, hasSubgroup } = useUserSubgroup(
    chatType === 'group' && groupType === 'redpacket'
      ? (groupAddress as Address)
      : undefined,
    currentAddress as Address
  );

  // 同步用户分群 ID 到 Redux（用于发送分群消息时使用）
  useEffect(() => {
    if (groupType === 'redpacket' && fetchedSubgroupId !== undefined) {
      dispatch(setUserSubgroupId(fetchedSubgroupId));
    }
  }, [groupType, fetchedSubgroupId, dispatch]);

  // 使用实时成员数，如果加载中则使用 URL 参数的回退值
  const displayMemberCount =
    chatType === 'group'
      ? isMemberCountLoading
        ? memberCount || 0
        : realTimeMemberCount
      : 0;

  // --- Refs 管理 ---
  const { inputRef, scrollAreaRef, actionsPanelContentRef } = useChatRefs();

  // --- 辅助函数 ---
  const { scrollToBottom } = useScrollManager({
    scrollAreaRef,
    setPanelHeight: (h) => dispatch(setPanelHeight(h))
  });

  useKeyboardManager({
    inputRef,
    isClient,
    panelHeight,
    isActionsOpen,
    setPanelHeight: (h) => dispatch(setPanelHeight(h)),
    scrollToBottom
  });

  // --- 数据加载 ---
  const { messages, setMessages, isFetchingMore, loadMore, hasMore } =
    useMessageLoader({
      conversationId: conversationId as string,
      chatType,
      currentAddress: currentAddress as Address,
      recipientAddress,
      groupAddress,
      keys,
      scrollAreaRef: scrollAreaRef as React.RefObject<HTMLDivElement>,
      invitedMembersMessage: invitedMembersMessage as string | undefined,
      scrollToBottom,
      groupType
    });

  // --- 消息发送 Hooks ---
  const { sendMessage: sendGroupMessage } = useSendCommunityMessage(
    groupAddress,
    groupType
  );

  const { writeContractAsync } = useSendMessage();

  // --- 业务操作 Hooks ---

  // 红包操作
  const { handleSendRedPacket, handleOpenRedPacket, handleClaimRedPacket } =
    useRedPacketActions({
      recipientAddress,
      groupAddress: groupAddress as Address,
      setMessages,
      setIsActionsOpen: (open) => dispatch(setIsActionsOpen(open)),
      setSelectedRedPacket,
      setDetailsRedPacket,
      selectedRedPacket,
      scrollToBottom,
      currentAddress: currentAddress as Address,
      chatType,
      groupType
    });

  // 红包事件监听（用于显示其他人的领取提示）
  useRedPacketEvents({
    chatType,
    groupAddress: groupAddress as Address,
    recipientAddress,
    currentAddress: currentAddress as Address,
    setMessages,
    messages,
    groupType: groupType as 'community' | 'redpacket'
  });

  // 加密操作
  const {
    handleOpenKeyGeneration,
    handleOpenDecryption,
    handleKeySelect,
    handleDecryptClick,
    handleSendModeSelect,
    handleBatchDecrypt,
    handleKeyGenerated
  } = useEncryptionActions({
    setShowKeyModal: (open) => dispatch(setShowKeyModal(open)),
    setShowGenerationModal: (open) => dispatch(setShowGenerationModal(open)),
    setShowDecryptModal: (open) => dispatch(setShowDecryptModal(open)),
    setShowSendModeModal: (open) => dispatch(setShowSendModeModal(open)),
    setPendingGroupMessage: (msg) => dispatch(setPendingGroupMessage(msg)),
    setSelectedMessageId: (id) => dispatch(setSelectedMessageId(id)),
    setMessages,
    selectedMessageId: selectedMessageId || '',
    messages,
    keys,
    pendingGroupMessage,
    currentAddress: currentAddress as Address,
    groupAddress,
    groupType: groupType as 'community' | 'redpacket',
    sendGroupMessage,
    scrollToBottom,
    inputRef: chatInputAreaRef,
    publicClient
  });

  // 消息操作
  const { handleSendMessage, handleRetryMessage } = useMessageActions({
    chatType,
    currentAddress: currentAddress as Address,
    recipientAddress,
    groupAddress,
    groupType,
    setMessages,
    scrollToBottom,
    publicClient,
    writeContract: writeContractAsync,
    sendGroupMessage,
    setPendingGroupMessage: (msg) => dispatch(setPendingGroupMessage(msg)),
    setShowSendModeModal: (open) => dispatch(setShowSendModeModal(open)),
    handleSendModeSelect // 直接传递，复用兜底逻辑
  });

  // --- Effects ---
  // 初始化客户端状态
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 组件卸载时清理状态（空依赖数组确保只在卸载时执行）
  useEffect(() => {
    return () => {
      dispatch(resetChatState());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖，只在组件真正卸载时执行

  // --- Render ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{
          height: `calc(100vh - ${NAV_BAR_HEIGHT}px)`,
          marginTop: '0px'
        }}
      >
        <ChatNavigationBar
          mode={chatType}
          chatInfo={{
            name:
              chatType === 'private'
                ? peerName || formatAddress(recipientAddress)
                : displayName || 'Group Chat',
            avatar:
              (chatType === 'private' ? peerAvatarUrl : groupAvatar) ||
              undefined,
            level: groupType === 'redpacket' ? 0 : (groupLevel as any),
            address: chatType === 'private' ? recipientAddress : groupAddress,
            memberCount: displayMemberCount,
            groupCondition:
              groupType === 'redpacket'
                ? formattedEntryFee || groupCondition || '加载中...'
                : groupCondition
          }}
          onMenuClick={() => {
            if (chatType === 'group') dispatch(setShowGroupInfoPanel(true));
            else dispatch(setShowPrivateChatSettingsPanel(true));
          }}
          onBack={() => {
            if (from === 'join') {
              router.push('/');
            } else {
              router.back();
            }
          }}
        />

        {/* 分群 Tab 切换 - 仅红包群显示 */}
        {/* {chatType === 'group' && (
          <>
            <SubgroupTabs
              activeTab={activeSubgroupTab}
              onTabChange={(tab) => {
                console.log('🎯 Tab 切换:', tab);
                dispatch(setActiveSubgroupTab(tab));
              }}
              mainMessageCount={99}
              subMessageCount={99}
              hasSubgroup={true}
            />
          </>
        )} */}

        <div className="flex-1 relative overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full w-full">
            <MessageList
              key={conversationId} // Force remount on chat change
              messages={messages}
              currentAddress={currentAddress}
              recipientAddress={
                chatType === 'group'
                  ? (groupAddress as Address)
                  : recipientAddress
              }
              chatType={chatType}
              groupType={groupType}
              handleOpenRedPacket={handleOpenRedPacket}
              handleViewRedPacketDetails={(packet) =>
                setDetailsRedPacket(packet)
              }
              handleRetryMessage={handleRetryMessage}
              handleDecryptClick={handleDecryptClick}
              isLoadingMore={isFetchingMore}
              loadMore={loadMore}
              hasMore={hasMore}
              isPeerAvatarLoading={isPeerAvatarLoading}
              peerAvatarCid={peerAvatarCid || null}
              isMyAvatarLoading={isMyAvatarLoading}
              myAvatarCid={myAvatarCid || null}
            />
          </ScrollArea>
        </div>

        {/* 底部功能区 */}
        <div
          className="bg-gray-100 border-t border-gray-300 transition-all duration-300 ease-in-out z-20"
          style={{
            minHeight: `${FOOTER_HEIGHT}px`
          }}
        >
          <ChatInputArea
            ref={chatInputAreaRef}
            conversationId={conversationId as string}
            inputRef={inputRef}
            handleKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // handleSendMessage is now called by ChatInputArea internally with content
                // But here we are handling keydown.
                // ChatInputArea handles keydown internally too.
                // Wait, ChatInputArea calls onSend() on Enter.
                // And calls handleKeyDown(e) otherwise.
                // So we don't need to handle Enter here if ChatInputArea does it.
                // But ChatInputArea code:
                /*
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  } else {
                    handleKeyDown(e);
                  }
                }}
                */
                // So handleKeyDown prop is only for NON-Enter keys (or Shift+Enter).
                // So this prop is fine.
              }
            }}
            handleSendMessage={handleSendMessage}
            handleOpenActions={() => {
              dispatch(setIsActionsOpen(!isActionsOpen));
              if (!isActionsOpen) {
                dispatch(setPanelHeight(230));
                setTimeout(() => scrollToBottom('smooth'), 350);
              } else {
                dispatch(setPanelHeight(0));
              }
            }}
          />

          {/* 功能面板内容 */}
          <ChatActionsPanel
            onSendRedPacket={handleSendRedPacket}
            chatType={chatType}
            contentRef={actionsPanelContentRef}
            memberCount={displayMemberCount}
            groupType={groupType}
          />
        </div>
      </div>

      {/* 弹窗组件 */}
      <ChatModals
        onGenerateKey={handleGenerateKey}
        isGeneratingKey={isKeyActionLoading}
        handleKeySelect={handleKeySelect}
        handleBatchDecrypt={handleBatchDecrypt}
        handleSendModeSelect={handleSendModeSelect}
        chatType={chatType}
        conversationId={conversationId}
        memberCount={displayMemberCount}
        groupName={displayName}
        groupType={groupType as 'community' | 'redpacket'}
      />

      <OpenRedPacketModalNew
        isOpen={!!selectedRedPacket}
        onClose={() => setSelectedRedPacket(null)}
        onOpen={async (startAnimation) => {
          if (!selectedRedPacket) return;
          let packetId: string | undefined;

          try {
            // 1. 尝试解析 JSON (群红包 / Optimistic UI)
            try {
              const json = JSON.parse(selectedRedPacket.content);
              if (json.packetId) {
                packetId = json.packetId.toString();
              }
            } catch (e) {
              // 忽略 JSON 解析错误，继续下一种格式
            }

            // 2. 如果还没解析到，尝试处理 "ID | JSON" 格式 (群合约常见格式)
            if (!packetId && selectedRedPacket.content.includes('|')) {
              const parts = selectedRedPacket.content.split('|');
              const firstPart = parts[0].trim();
              if (firstPart && !isNaN(Number(firstPart))) {
                packetId = firstPart;
                packetId = firstPart;
              }
            }

            // 3. 尝试解析 RP 格式 (私聊红包)
            if (!packetId && selectedRedPacket.content.startsWith('RP|')) {
              const parts = selectedRedPacket.content.split('|');
              if (parts.length >= 3) {
                packetId = parts[2];
                packetId = parts[2];
              }
            }
          } catch (err) {}

          if (packetId) {
            await handleClaimRedPacket(packetId, startAnimation);
          } else {
          }
        }}
        onDetails={() => {
          const packet = selectedRedPacket;
          setSelectedRedPacket(null);
          if (packet) {
            setDetailsRedPacket(packet);
          }
        }}
        senderAddress={
          selectedRedPacket?.sender === 'user'
            ? currentAddress
            : selectedRedPacket?.senderAddress || recipientAddress
        }
        senderName={
          selectedRedPacket?.sender === 'user'
            ? '我'
            : chatType === 'private'
              ? peerName || formatAddress(recipientAddress)
              : formatAddress(selectedRedPacket?.senderAddress)
        }
        senderAvatar={
          selectedRedPacket?.sender === 'user'
            ? myAvatarUrl || undefined
            : chatType === 'private'
              ? peerAvatarUrl || undefined
              : undefined
        }
        status={
          selectedRedPacket?.content.includes('"claimed":true') ||
          selectedRedPacket?.content.includes('"status":"claimed"')
            ? 'claimed'
            : 'active'
        }
        packetId={(() => {
          try {
            return JSON.parse(selectedRedPacket?.content || '{}').packetId;
          } catch {
            return undefined;
          }
        })()}
        message={(() => {
          try {
            return (
              JSON.parse(selectedRedPacket?.content || '{}').message ||
              '恭喜发财，大吉大利'
            );
          } catch {
            return '恭喜发财，大吉大利';
          }
        })()}
        groupType={groupType as 'community' | 'redpacket'}
        groupAddress={groupAddress}
      />

      {detailsRedPacket &&
        (() => {
          let config: any = {};
          try {
            config = JSON.parse(detailsRedPacket.content);
          } catch (e) {}

          const claimedList = config.claimedList || [];
          const claimedCount = claimedList.length;
          const claimedAmount = claimedList
            .reduce(
              (sum: number, item: any) => sum + parseFloat(item.amount || 0),
              0
            )
            .toFixed(6);
          const myClaim = claimedList.find((item: any) => item.name === '你');

          return (
            <RedPacketDetailsModal
              isOpen={!!detailsRedPacket}
              onClose={() => setDetailsRedPacket(null)}
              senderAddress={
                detailsRedPacket.sender === 'user'
                  ? currentAddress
                  : detailsRedPacket.senderAddress || recipientAddress
              }
              senderName={
                detailsRedPacket.sender === 'user'
                  ? '我'
                  : chatType === 'private'
                    ? peerName || formatAddress(recipientAddress)
                    : formatAddress(detailsRedPacket.senderAddress)
              }
              senderAvatar={
                detailsRedPacket.sender === 'user'
                  ? myAvatarUrl || undefined
                  : chatType === 'private'
                    ? peerAvatarUrl || undefined
                    : undefined
              }
              packetId={config.packetId}
              message={config.message || '恭喜发财'}
              type={config.type || 'LUCKY'}
              myAmount={myClaim ? myClaim.amount : undefined}
              tokenSymbol={config.tokenSymbol || 'ETH'}
              totalCount={config.count || 0}
              claimedCount={claimedCount}
              totalAmount={config.amount || '0'}
              claimedAmount={claimedAmount}
              groupType={config.groupType || groupType}
              groupAddress={
                config.groupAddress ||
                (chatType === 'group' ? conversationId : undefined)
              }
              claimedList={claimedList.map((item: any) => ({
                name: item.name,
                avatar: item.avatar,
                address: item.address || '0x...',
                amount: item.amount,
                isBest: item.isBest
              }))}
            />
          );
        })()}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatLoadingFallback />}>
      <ChatContent />
    </Suspense>
  );
}

// Loading fallback component
function ChatLoadingFallback() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}

// 辅助函数
function formatAddress(address: string | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
