'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { useAccount, useChainId, useChains, usePublicClient } from 'wagmi';
import { Address } from 'viem';

import { ChatNavigationBar } from '@/components/chat/chat-navigation-bar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import { chatEncryption } from '@/lib/keyManagement';
import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { useSendMessage } from '@/lib/DirectMessageAbi';
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
import {
  ChatInputArea,
  ChatInputAreaRef
} from '@/components/chat/ChatInputArea';
import { ChatModals } from '@/components/chat/ChatModals';
import { MessageList } from '@/components/chat/MessageList';
import { ChatActionsPanel } from '@/components/chat/ChatActionsPanel';
import { OpenRedPacketModalNew } from '@/components/chat/red-packet/OpenRedPacketModal';
import { RedPacketDetailsModal } from '@/components/chat/red-packet/RedPacketDetailsModal';
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
  resetChatState
} from '@/lib/chatSlice';
import type { RootState } from '@/lib/store';
import type { Message } from '@/lib/chat/types';

function ChatContent() {
  const dispatch = useDispatch();

  // --- Redux State ---
  const { isActionsOpen, panelHeight, selectedMessageId, pendingGroupMessage } =
    useSelector((state: RootState) => state.chat);

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
    invitedMembersMessage
  } = useChatParams();

  // --- 基础钩子 ---
  const router = useRouter();
  const { keys, loadKeysFromStorage } = useKeyManagement();

  // --- Wagmi 钩子 ---
  const { address: currentAddress } = useAccount();
  const chainId = useChainId();
  const chains = useChains();
  const publicClient = usePublicClient();

  // --- 头像获取 ---
  const {
    avatarCid: peerAvatarCid,
    avatarUrl: peerAvatarUrl,
    name: peerName,
    isLoading: isPeerAvatarLoading
  } = usePeerAvatar(chatType === 'private' ? recipientAddress : undefined);

  const {
    avatarCid: myAvatarCid,
    avatarUrl: myAvatarUrl,
    isLoading: isMyAvatarLoading
  } = usePeerAvatar(currentAddress as Address | undefined);

  // --- 群成员数量（实时从链上获取）---
  const { memberCount: realTimeMemberCount, isLoading: isMemberCountLoading } =
    useCommunityMembersCount(chatType === 'group' ? groupAddress : undefined);

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
      scrollToBottom
    });

  // --- 消息发送 Hooks ---
  const { sendMessage: sendGroupMessage } =
    useSendCommunityMessage(groupAddress);

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
      chatType
    });

  // 红包事件监听（用于显示其他人的领取提示）
  useRedPacketEvents({
    chatType,
    groupAddress: groupAddress as Address,
    recipientAddress,
    currentAddress: currentAddress as Address,
    setMessages,
    messages
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
    setMessages,
    scrollToBottom,
    keys,
    publicClient,
    writeContract: writeContractAsync,
    sendGroupMessage,
    setPendingGroupMessage: (msg) => dispatch(setPendingGroupMessage(msg)),
    setShowSendModeModal: (open) => dispatch(setShowSendModeModal(open)),
    setShowKeyModal: (open) => dispatch(setShowKeyModal(open))
  });

  // --- Effects ---
  // 加载密钥和初始化客户端状态
  useEffect(() => {
    loadKeysFromStorage();
    setIsClient(true);
  }, [loadKeysFromStorage]);

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
                : groupName || 'Group Chat',
            avatar:
              (chatType === 'private' ? peerAvatarUrl : groupAvatar) ||
              undefined,
            level: groupLevel as any,
            address: chatType === 'private' ? recipientAddress : groupAddress,
            memberCount: displayMemberCount,
            groupCondition: groupCondition
          }}
          onMenuClick={() => {
            if (chatType === 'group') dispatch(setShowGroupInfoPanel(true));
            else dispatch(setShowPrivateChatSettingsPanel(true));
          }}
          onBack={() => router.back()}
        />

        <div className="flex-1 relative overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full w-full">
            <MessageList
              key={conversationId} // Force remount on chat change
              messages={messages}
              currentAddress={currentAddress}
              recipientAddress={recipientAddress}
              chatType={chatType}
              handleOpenRedPacket={handleOpenRedPacket}
              handleRetryMessage={handleRetryMessage}
              handleDecryptClick={handleDecryptClick}
              isLoadingMore={isFetchingMore}
              loadMore={loadMore}
              hasMore={hasMore}
              isPeerAvatarLoading={isPeerAvatarLoading}
              peerAvatarCid={peerAvatarCid}
              isMyAvatarLoading={isMyAvatarLoading}
              myAvatarCid={myAvatarCid}
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
          />
        </div>
      </div>

      {/* 弹窗组件 */}
      <ChatModals
        handleKeyGenerated={handleKeyGenerated}
        handleKeySelect={handleKeySelect}
        handleBatchDecrypt={handleBatchDecrypt}
        handleSendModeSelect={handleSendModeSelect}
        chatType={chatType}
        conversationId={conversationId as string}
        memberCount={displayMemberCount}
      />

      <OpenRedPacketModalNew
        isOpen={!!selectedRedPacket}
        onClose={() => setSelectedRedPacket(null)}
        onOpen={async (startAnimation) => {
          if (!selectedRedPacket) return;
          let packetId: string | undefined;

          try {
            // 尝试解析 JSON (群红包 / Optimistic UI)
            const json = JSON.parse(selectedRedPacket.content);
            if (json.packetId) {
              packetId = json.packetId;
            }
          } catch (e) {
            // 不是 JSON，尝试解析 RP 格式 (私聊红包)
            if (selectedRedPacket.content.startsWith('RP|')) {
              const parts = selectedRedPacket.content.split('|');
              if (parts.length >= 3) {
                packetId = parts[2];
              }
            }
          }

          if (packetId) {
            await handleClaimRedPacket(packetId, startAnimation);
          } else {
            console.error('无法解析红包 ID', selectedRedPacket);
          }
        }}
        onDetails={() => {
          const packet = selectedRedPacket;
          setSelectedRedPacket(null);
          if (packet) {
            setDetailsRedPacket(packet);
          }
        }}
        senderName={
          selectedRedPacket?.sender === 'user'
            ? '我'
            : peerName ||
              formatAddress(
                selectedRedPacket?.senderAddress || selectedRedPacket?.sender
              )
        }
        senderAvatar={
          selectedRedPacket?.sender === 'user'
            ? myAvatarUrl || undefined
            : peerAvatarUrl || undefined
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
              senderName={
                detailsRedPacket.sender === 'user'
                  ? '我'
                  : peerName || formatAddress(detailsRedPacket.sender)
              }
              senderAvatar={
                detailsRedPacket.sender === 'user'
                  ? myAvatarUrl || undefined
                  : peerAvatarUrl || undefined
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
