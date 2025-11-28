import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SenderName } from '@/components/chat/message/SenderName';
import { RedPacketMessage } from '@/components/chat/red-packet/RedPacketMessage';
import { RedPacketClaimMessage } from '@/components/chat/red-packet/RedPacketClaimMessage';
import { GroupMessageAvatar } from '@/components/chat/GroupMessageAvatar';
import { IPFSImg } from '@/components/ui/ipfs-img';
import type { Message } from '@/lib/chat/types';
import type { Address } from 'viem';

interface MessageListProps {
  messages: Message[];
  currentAddress: Address | undefined;
  recipientAddress: Address;
  chatType: 'private' | 'group';
  handleOpenRedPacket: (packet: any) => void;
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

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentAddress,
  recipientAddress,
  chatType,
  handleOpenRedPacket,
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
      {isLoadingMore && (
        <div className="flex justify-center items-center py-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-4 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              加载中...
            </span>
          </div>
        </div>
      )}

      {messages.map((message) => {
        if (message.type === 'system-time') {
          return (
            <div
              key={message.id}
              className="flex justify-center text-gray-500 text-xs my-2"
            >
              <span className="bg-gray-200 px-3 py-1 rounded-lg">
                {message.content}
              </span>
            </div>
          );
        } else if (message.type === 'red-packet-claim') {
          try {
            const claimData = JSON.parse(message.content);
            return (
              <RedPacketClaimMessage
                key={message.id}
                claimerName={claimData.claimerName}
                ownerName={claimData.ownerName}
                isCurrentUserClaimer={claimData.isCurrentUserClaimer}
              />
            );
          } catch (e) {
            return null;
          }
        } else if (message.type === 'system') {
          return (
            <div
              key={message.id}
              className="flex justify-center text-gray-500 text-sm my-2"
            >
              <span className="bg-gray-200 px-3 py-1 rounded-lg">
                {message.content}
              </span>
            </div>
          );
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
                    <div className="flex items-end pb-0.5 flex-shrink-0 w-5 h-5">
                      {message.status === 'sending' && (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400 flex-shrink-0" />
                      )}

                      {message.status === 'failed' && (
                        <button
                          onClick={() => handleRetryMessage(message)}
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
                  )}

                  {message.type === 'red-packet' ? (
                    (() => {
                      try {
                        const config = JSON.parse(message.content);
                        return (
                          <RedPacketMessage
                            config={config}
                            status={config.status || 'active'}
                            onClick={() => handleOpenRedPacket(message)}
                          />
                        );
                      } catch (e) {
                        return <p>Invalid Red Packet</p>;
                      }
                    })()
                  ) : (
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm shadow-sm',
                        message.sender === 'user'
                          ? 'bg-[#5637f5] text-white'
                          : 'bg-white text-black'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-all">
                        {message.content}
                      </p>
                      {(message.isEncrypted || message.originalContent) && (
                        <div className="flex items-center justify-between mt-2 min-w-[12rem]">
                          <div className="flex items-center gap-2">
                            {/* 解密按钮 */}
                            {message.sender !== 'user' &&
                              (chatType === 'private' ||
                                message.isEncrypted) && (
                                <button
                                  onClick={() => {
                                    handleDecryptClick(message.id);
                                  }}
                                  disabled={!message.isEncrypted}
                                  className={cn(
                                    'flex items-center rounded-md px-2 py-1 transition-colors text-xs font-medium',
                                    'bg-[#fef0ee]',
                                    message.isEncrypted && 'hover:bg-black/20',
                                    'disabled:opacity-80 disabled:cursor-not-allowed'
                                  )}
                                >
                                  <Image
                                    src="/chats/keyIcon.png"
                                    alt="解密"
                                    width={14}
                                    height={14}
                                    className="mr-1"
                                  />
                                  {message.isEncrypted ? '解密' : '已解密'}
                                </button>
                              )}
                            {/* 计数器按钮 */}
                            <div
                              className={cn(
                                'flex items-center rounded-md px-2 py-1 text-xs font-medium',
                                message.sender === 'user'
                                  ? 'bg-[#785ff7]'
                                  : 'bg-[#e9f9ee]'
                              )}
                            >
                              <Image
                                src="/chats/news.png"
                                alt="计数"
                                width={14}
                                height={14}
                                className="mr-1"
                              />
                              {message.isEncrypted ? '1' : '0'}
                            </div>
                          </div>
                          <span
                            className={cn(
                              'text-xs',
                              message.sender === 'user'
                                ? 'text-white/70'
                                : 'text-gray-400'
                            )}
                          >
                            {dayjs(message.timestamp).format('MM/DD HH:mm:ss')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};
