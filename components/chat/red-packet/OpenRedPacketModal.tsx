'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { RedPacketConfig } from './types';

import { useReadContract, useAccount } from 'wagmi';
import {
  RedPacketAbi,
  useRedPacketAddress, // 新增
  PacketStatus
} from '@/lib/RedPacketAbi';
import { usePeerProfile } from '@/hooks/usePeerProfile';
import { IPFSImg } from '@/components/ui/ipfs-img';
import type { Address } from 'viem';

interface OpenRedPacketModalProps {
  isOpen: boolean;
  // ... (其余 props 保持不变)
  onClose: () => void;
  onOpen: (startAnimation: () => void) => Promise<void>;
  onDetails?: () => void;
  senderName: string;
  senderAvatar?: string;
  senderAddress?: string; // 新增
  message: string;
  packetId?: string;
  status?: 'active' | 'claimed' | 'expired' | 'empty';
}

export function OpenRedPacketModalNew({
  isOpen,
  onClose,
  onOpen,
  onDetails,
  senderName: initialSenderName,
  senderAvatar: initialSenderAvatar,
  senderAddress,
  message,
  packetId,
  status: initialStatus = 'active'
}: OpenRedPacketModalProps) {
  const [isOpening, setIsOpening] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { address } = useAccount();

  // 获取发送者 Profile
  const { profile } = usePeerProfile(senderAddress as Address);

  // 计算最终显示的 Name
  const isMe =
    senderAddress &&
    address &&
    senderAddress.toLowerCase() === address.toLowerCase();
  const displayName = isMe ? '我' : profile?.name || initialSenderName;
  // 计算最终显示的 Avatar (优先用 CID，其次用传入的 URL)
  const displayAvatarCid = profile?.avatarCid;

  // 获取当前链的合约地址
  const redPacketAddress = useRedPacketAddress();

  // 获取红包信息
  const { data: packet } = useReadContract({
    address: redPacketAddress || undefined,
    abi: RedPacketAbi,
    functionName: 'getPacket',
    args: packetId ? [BigInt(packetId)] : undefined,
    query: {
      enabled: !!packetId && isOpen && !!redPacketAddress
    }
  });

  // 检查是否已领取
  const { data: hasClaimed } = useReadContract({
    address: redPacketAddress || undefined,
    abi: RedPacketAbi,
    functionName: 'hasClaimed',
    args: packetId && address ? [BigInt(packetId), address] : undefined,
    query: {
      enabled: !!packetId && !!address && isOpen && !!redPacketAddress
    }
  });

  // 计算实时状态
  const currentStatus = React.useMemo(() => {
    if (!packet) return initialStatus;

    // 1. 检查是否已领取
    if (hasClaimed) return 'claimed';

    const packetData = packet as any;

    // 2. 检查是否过期
    const expiryTime =
      Number(packetData.creationTime) + Number(packetData.expiryDuration);
    if (Date.now() / 1000 > expiryTime) return 'expired';

    // 3. 检查是否领完 (对于群红包/拼手气红包)
    // 注意：这里简化处理，如果是私聊红包，remainingCount 逻辑可能不同
    // 但通常 remainingCount == 0 就是领完了
    if (Number(packetData.remainingCount) === 0) return 'empty';

    return 'active';
  }, [packet, hasClaimed, initialStatus]);

  // Debug log to confirm new version is loaded
  // React.useEffect(() => {
  //   console.log('OpenRedPacketModalNew V4 loaded', { packetId, currentStatus });
  // }, [packetId, currentStatus]);

  // 自动跳转：如果已领取，直接进入详情页
  React.useEffect(() => {
    if (isOpen && currentStatus === 'claimed' && onDetails) {
      onDetails();
    }
  }, [isOpen, currentStatus, onDetails]);

  const getSafeAvatarUrl = (url?: string) => {
    if (!url) return null;
    try {
      new URL(url);
      return url;
    } catch {
      if (url.startsWith('/')) return url;
      return null;
    }
  };

  const safeFallbackAvatar = getSafeAvatarUrl(initialSenderAvatar);

  // 处理"开"按钮点击
  // 流程：点击按钮 → 弹出钱包支付 → 用户确认 → 交易发送成功 → 播放动画
  // isProcessing: 立即锁定，防止重复点击
  // isOpening: 只在交易发送成功后设置，控制动画
  const handleOpenClick = async () => {
    if (isProcessing || isOpening) return;

    // 如果是 empty 状态，不调用领取接口，直接查看详情
    if (currentStatus === 'empty') {
      onDetails?.();
      return;
    }

    // 如果已领取，也不调用接口，直接查看详情
    if (currentStatus === 'claimed') {
      onDetails?.();
      return;
    }

    // 只有 active 状态才调用领取接口
    if (currentStatus !== 'active') {
      return;
    }

    setIsProcessing(true); // 立即锁定，防止重复点击

    try {
      // onOpen 会调用 handleClaimRedPacket
      // 当交易发送成功后，会调用这个回调函数触发动画
      await onOpen(() => setIsOpening(true));
      // 成功后会自动跳转详情，不需要手动恢复状态
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || '';
      const errorLower = errorMessage.toLowerCase();

      // 用户取消交易 - 静默恢复，不显示错误提示
      if (
        errorLower.includes('user rejected') ||
        errorLower.includes('user denied') ||
        errorLower.includes('rejected by user') ||
        errorLower.includes('user cancelled') ||
        errorLower.includes('cancelled')
      ) {
        console.log('👤 用户取消了交易');
        setIsProcessing(false);
        return;
      }

      // 其他错误 - 显示提示并恢复UI，允许重试
      console.error('领取红包失败:', error);
      alert('领取失败，请重试');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-transparent border-none shadow-none p-0 w-full max-w-[320px] flex flex-col items-center gap-6 [&>button]:hidden">
        <DialogTitle className="sr-only">Open Red Packet</DialogTitle>
        <DialogDescription className="sr-only">
          Open Red Packet
        </DialogDescription>

        {/* Red Packet Container - Responsive with vw/vh */}
        <div className="relative w-[75vw] max-w-[320px] h-[125vw] max-h-[650px] overflow-hidden shrink-0">
          {/* Top Section */}
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-[70%] z-10 transition-transform duration-1000 ease-in-out',
              isOpening && '-translate-y-[140%]'
            )}
          >
            <Image
              src="/chats/red_top.png"
              alt="Top"
              fill
              className="object-fill"
              priority
            />

            {/* Content Layer */}
            <div className="absolute inset-0 flex flex-col items-center pt-[25%] z-20">
              {/* Sender Info */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[#fcedae]">
                  <div className="w-6 h-6 rounded-sm overflow-hidden relative">
                    <IPFSImg
                      src={displayAvatarCid}
                      fallbackSrc={safeFallbackAvatar || undefined}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[15px] font-medium text-[#fcedae]">
                    {displayName}的红包
                  </span>
                </div>

                {/* Message or Empty Status Text */}
                {currentStatus === 'empty' ? (
                  <div className="text-[#fcedae] text-[24px] font-medium tracking-wide px-4 text-center mt-2">
                    手慢了，红包派完了
                  </div>
                ) : (
                  <div className="text-[#fcedae] text-[20px] font-medium tracking-wide px-4 text-center">
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div
            className={cn(
              'absolute bottom-[14%] left-0 right-0 h-[30%] z-[9] transition-transform duration-1000 ease-in-out',
              isOpening && 'translate-y-[200%]'
            )}
          >
            <Image
              src="/chats/red_bottom.png"
              alt="Bottom"
              fill
              className="object-fill"
              priority
            />
          </div>

          {/* Check Luck Link (Only for empty status) - Positioned in main container */}
          {currentStatus === 'empty' && (
            <div className="absolute bottom-[16%] w-full flex justify-center z-30">
              <button
                onClick={onDetails}
                className="text-[#fcedae] text-sm flex items-center gap-1 hover:text-white transition-colors font-medium"
              >
                看看大家的手气 &gt;
              </button>
            </div>
          )}

          {/* Open Button / Status Text */}
          <div
            className={cn(
              'absolute top-[68%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-500',
              isOpening && 'opacity-0 scale-0'
            )}
          >
            {currentStatus === 'active' ? (
              <button
                onClick={handleOpenClick}
                disabled={isProcessing || isOpening}
                className={cn(
                  'w-[25vw] h-[25vw] max-w-[100px] max-h-[100px] rounded-full flex items-center justify-center transition-transform bg-transparent border-none outline-none focus:outline-none',
                  isOpening && 'animate-rotate-y'
                )}
              >
                <Image
                  src="/chats/open.png"
                  alt="Open"
                  width={100}
                  height={100}
                  className="object-contain"
                />
              </button>
            ) : currentStatus === 'empty' ? null : ( // Empty status doesn't show a button or "claimed" text here, it shows text in top section and link at bottom
              <div className="text-[#fcedae] text-lg font-medium whitespace-nowrap bg-black/10 px-4 py-1 rounded-full">
                {currentStatus === 'claimed' ? '已领取' : '已过期'}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full border border-white/50 flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
