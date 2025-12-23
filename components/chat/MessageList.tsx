import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { SenderName } from '@/components/chat/message/SenderName';
import { RedPacketMessageWrapper } from '@/components/chat/red-packet/RedPacketMessageWrapper';
import { RedPacketClaimMessage } from '@/components/chat/red-packet/RedPacketClaimMessage';
import { GroupMessageAvatar } from '@/components/chat/GroupMessageAvatar';
import { MessageContextMenu } from '@/components/chat/MessageContextMenu';
import { IPFSImg } from '@/components/ui/ipfs-img';
import type { Message } from '@/lib/chat/types';
import type { Address } from 'viem';

interface MessageListProps {
  messages: Message[];
  currentAddress: Address | undefined;
  recipientAddress: Address;
  chatType: 'private' | 'group';
  handleOpenRedPacket: (packet: any) => void;
  handleViewRedPacketDetails: (packet: any) => void;
  handleRetryMessage: (msg: Message) => void;
  handleDecryptClick: (msgId: string) => void;
  isLoadingMore: boolean;

  // Avatar related
  isPeerAvatarLoading: boolean;
  peerAvatarCid: string | null;
  isMyAvatarLoading: boolean;
  myAvatarCid: string | null;
  loadMore?: () => void;
  hasMore?: boolean;
}

// ==================== 子组件 ====================

/** 系统时间消息 */
const SystemTimeMessage: React.FC<{ content: string }> = ({ content }) => (
  <div className="flex justify-center text-gray-500 text-xs my-2">
    <span className="bg-gray-200 px-3 py-1 rounded-lg">{content}</span>
  </div>
);

/** 系统消息 */
const SystemMessage: React.FC<{ content: string }> = ({ content }) => (
  <div className="flex justify-center text-gray-500 text-sm my-2">
    <span className="bg-gray-200 px-3 py-1 rounded-lg">{content}</span>
  </div>
);

/** 加载更多指示器 */
const LoadingIndicator: React.FC = () => (
  <div className="flex justify-center items-center py-4">
    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-4 py-2">
      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        加载中...
      </span>
    </div>
  </div>
);

/** 消息状态图标（发送中/失败） */
interface MessageStatusIconProps {
  status: Message['status'];
  onRetry: () => void;
}

const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({
  status,
  onRetry
}) => (
  <div className="flex items-end pb-0.5 flex-shrink-0 w-5 h-5">
    {status === 'sending' && (
      <Loader2 className="h-5 w-5 animate-spin text-gray-400 flex-shrink-0" />
    )}
    {status === 'failed' && (
      <button
        onClick={onRetry}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        title="点击重新发送"
      >
        <Image
          src="/chats/Sigh.png"
          alt="发送失败"
          width={20}
          height={20}
          className="flex-shrink-0"
        />
      </button>
    )}
  </div>
);

/** 消息气泡 Props */
interface MessageBubbleProps {
  message: Message;
  chatType: 'private' | 'group';
  onDecryptClick: (messageId: string) => void;
  longPress: {
    handleLongPressStart: (
      message: Message,
      event: React.TouchEvent | React.MouseEvent
    ) => void;
    handleLongPressEnd: (event: React.TouchEvent | React.MouseEvent) => void;
    handleContextMenu: (message: Message, event: React.MouseEvent) => void;
  };
}

/** 消息气泡组件 */
const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  chatType,
  onDecryptClick,
  longPress
}) => (
  <div
    className={cn(
      'rounded-lg px-3 py-2 text-sm shadow-sm select-none max-w-[75vw]',
      message.sender === 'user'
        ? 'bg-[#5637f5] text-white'
        : 'bg-white text-black'
    )}
    style={{
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      userSelect: 'none',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word'
    }}
    onTouchStart={(e) => longPress.handleLongPressStart(message, e)}
    onTouchEnd={(e) => longPress.handleLongPressEnd(e)}
    onTouchCancel={(e) => longPress.handleLongPressEnd(e)}
    onMouseDown={(e) => longPress.handleLongPressStart(message, e)}
    onMouseUp={(e) => longPress.handleLongPressEnd(e)}
    onMouseLeave={(e) => longPress.handleLongPressEnd(e)}
    onContextMenu={(e) => longPress.handleContextMenu(message, e)}
  >
    <p className="whitespace-pre-wrap break-all">{message.content}</p>
    {(message.isEncrypted || message.originalContent) && (
      <div className="flex items-center justify-between mt-2 min-w-[12rem]">
        <div className="flex items-center gap-2">
          {/* 解密按钮 - 只有密文消息且非自己发送时显示 */}
          {message.sender !== 'user' && message.isEncrypted && (
            <button
              onClick={() => onDecryptClick(message.id)}
              className={cn(
                'flex items-center rounded-md px-2 py-1 transition-colors text-xs font-medium',
                'bg-[#fef0ee] hover:bg-[#fde0dc]'
              )}
            >
              <Image
                src="/chats/keyIcon.png"
                alt="解密"
                width={14}
                height={14}
              />
              <span className="text-[#606266] ml-1">未解密</span>
            </button>
          )}
          {/* 计数器按钮 - 仅群聊显示 */}
          {chatType === 'group' && (
            <div
              className={cn(
                'flex items-center rounded-md px-2 py-1 text-xs font-medium',
                message.sender === 'user' ? 'bg-[#785ff7]' : 'bg-[#e9f9ee]'
              )}
            >
              <Image
                src="/chats/news.png"
                alt="评论"
                width={14}
                height={14}
                className="mr-1"
              />
              {message.isEncrypted ? '1' : '0'}
            </div>
          )}
        </div>
        <span
          className={cn(
            'text-xs',
            message.sender === 'user' ? 'text-white/70' : 'text-gray-400'
          )}
        >
          {dayjs(message.timestamp).format('MM/DD HH:mm:ss')}
        </span>
      </div>
    )}
  </div>
);

// ==================== 自定义 Hook ====================

/**
 * 长按复制功能 Hook
 * 处理长按/右键触发的复制菜单逻辑
 */
const useLongPressCopy = () => {
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  // 复制消息内容
  const handleCopyMessage = async () => {
    if (selectedMessage) {
      try {
        await navigator.clipboard.writeText(selectedMessage.content);
        toast({
          title: '复制成功',
          description: '消息内容已复制到剪贴板',
          variant: 'success'
        });
      } catch (error) {
        console.error('复制失败:', error);
        toast({
          title: '复制失败',
          description: '无法复制内容',
          variant: 'destructive'
        });
      }
      setSelectedMessage(null);
    }
  };

  // 长按开始
  const handleLongPressStart = (
    message: Message,
    event: React.TouchEvent | React.MouseEvent
  ) => {
    // PC端：只响应左键点击
    if ('button' in event && event.button !== 0) {
      return;
    }

    isLongPressTriggeredRef.current = false;
    const clientX =
      'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY =
      'touches' in event ? event.touches[0].clientY : event.clientY;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setSelectedMessage(message);
      setMenuPosition({ x: clientX, y: clientY });
    }, 500);
  };

  // 长按结束/取消
  const handleLongPressEnd = (event: React.TouchEvent | React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 右键菜单
  const handleContextMenu = (message: Message, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedMessage(message);
    setMenuPosition({ x: event.clientX, y: event.clientY });
  };

  return {
    selectedMessage,
    menuPosition,
    handleCopyMessage,
    handleLongPressStart,
    handleLongPressEnd,
    handleContextMenu,
    closeMenu: () => setSelectedMessage(null)
  };
};

// ==================== 主组件 ====================

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentAddress,
  recipientAddress,
  chatType,
  handleOpenRedPacket,
  handleViewRedPacketDetails,
  handleRetryMessage,
  handleDecryptClick,
  isLoadingMore,
  isPeerAvatarLoading,
  peerAvatarCid,
  isMyAvatarLoading,
  myAvatarCid,
  loadMore,
  hasMore
}) => {
  const router = useRouter();
  const topSentinelRef = React.useRef<HTMLDivElement>(null);
  const [isObserverEnabled, setIsObserverEnabled] = React.useState(false);

  // 长按复制功能
  const longPress = useLongPressCopy();

  // 延迟启用 Observer，防止初始渲染时误触
  React.useEffect(() => {
    if (messages.length > 0 && !isObserverEnabled) {
      const timer = setTimeout(() => {
        setIsObserverEnabled(true);
      }, 1000); // 1秒后启用，确保初始滚动已完成
      return () => clearTimeout(timer);
    }
  }, [messages.length, isObserverEnabled]);

  React.useEffect(() => {
    if (!isObserverEnabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && loadMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (topSentinelRef.current) {
      observer.observe(topSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore, isLoadingMore, isObserverEnabled]);

  return (
    <div className="p-4 space-y-5 !pt-0">
      <div ref={topSentinelRef} style={{ height: '1px', width: '100%' }} />
      {/* 加载更多消息的指示器 */}
      {isLoadingMore && <LoadingIndicator />}

      {messages.map((message) => {
        if (message.type === 'system-time') {
          return (
            <SystemTimeMessage key={message.id} content={message.content} />
          );
        } else if (message.type === 'red-packet-claim') {
          try {
            const claimData = JSON.parse(message.content);

            // 过滤逻辑：只显示别人领取了我的红包
            // 1. 领取我的 (ownerAddress === currentAddress)
            const isRelatedToMe =
              currentAddress &&
              claimData.ownerAddress?.toLowerCase() ===
                currentAddress.toLowerCase();

            if (!isRelatedToMe) {
              return null;
            }

            return (
              <RedPacketClaimMessage
                key={message.id}
                claimerAddress={claimData.claimerAddress}
                ownerAddress={claimData.ownerAddress}
                claimerName={claimData.claimerName}
                ownerName={claimData.ownerName}
                isCurrentUserClaimer={claimData.isCurrentUserClaimer}
              />
            );
          } catch (e) {
            return null;
          }
        } else if (message.type === 'system') {
          return <SystemMessage key={message.id} content={message.content} />;
        } else {
          // 普通消息行
          return (
            <div
              key={message.id}
              className={cn(
                'flex w-full items-start gap-3',
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {chatType === 'private' ? (
                <button
                  onClick={() => {
                    if (message.sender === 'other') {
                      router.push(
                        `/contacts/profile/${recipientAddress}?type=nonfriend`
                      );
                    } else if (message.sender === 'user' && currentAddress) {
                      router.push(
                        `/contacts/profile/${currentAddress}?type=friend`
                      );
                    }
                  }}
                  className="cursor-pointer w-10 h-10 rounded-md overflow-hidden flex-shrink-0"
                >
                  {message.sender === 'other' ? (
                    isPeerAvatarLoading ? (
                      <Skeleton className="w-full h-full" />
                    ) : (
                      <IPFSImg
                        src={peerAvatarCid || undefined}
                        fallbackSrc="/me/me2.png"
                        alt="对方头像"
                        className="w-full h-full object-cover"
                        enableLogging={false}
                        maxRetries={5}
                      />
                    )
                  ) : isMyAvatarLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <IPFSImg
                      src={myAvatarCid || undefined}
                      fallbackSrc="/me/me1.png"
                      alt="我的头像"
                      className="w-full h-full object-cover"
                      enableLogging={false}
                      maxRetries={5}
                    />
                  )}
                </button>
              ) : // 群聊
              message.senderAddress ? (
                <GroupMessageAvatar
                  senderAddress={message.senderAddress}
                  isCurrentUser={message.sender === 'user'}
                  onClick={() => {
                    router.push(
                      `/contacts/profile/${message.senderAddress}?type=nonfriend`
                    );
                  }}
                />
              ) : (
                <Image
                  src="/placeholder-user.jpg"
                  alt="Avatar"
                  width={40}
                  height={40}
                  className="rounded-md flex-shrink-0"
                />
              )}

              <div className="flex flex-col max-w-[75%]">
                {/* 群聊消息：显示发送者名称 */}
                {chatType === 'group' &&
                  message.senderAddress &&
                  message.sender !== 'user' && (
                    <SenderName senderAddress={message.senderAddress} />
                  )}

                {/* 消息气泡和状态图标的容器 */}
                <div
                  className={cn(
                    'flex items-end gap-1',
                    message.sender === 'user' ? 'flex-row' : 'flex-row'
                  )}
                >
                  {/* 状态图标 */}
                  {message.sender === 'user' && (
                    <MessageStatusIcon
                      status={message.status}
                      onRetry={() => handleRetryMessage(message)}
                    />
                  )}

                  {message.type === 'red-packet' ? (
                    (() => {
                      try {
                        const config = JSON.parse(message.content);
                        return (
                          <RedPacketMessageWrapper
                            config={config}
                            onOpenPacket={() => handleOpenRedPacket(message)}
                            onViewDetails={() =>
                              handleViewRedPacketDetails(message)
                            }
                          />
                        );
                      } catch (e) {
                        return <p>Invalid Red Packet</p>;
                      }
                    })()
                  ) : (
                    <MessageBubble
                      message={message}
                      chatType={chatType}
                      onDecryptClick={handleDecryptClick}
                      longPress={longPress}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        }
      })}

      {/* 长按复制浮动菜单 */}
      <MessageContextMenu
        isOpen={!!longPress.selectedMessage}
        position={longPress.menuPosition}
        onCopy={longPress.handleCopyMessage}
        onClose={longPress.closeMenu}
      />
    </div>
  );
};
