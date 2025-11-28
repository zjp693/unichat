'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useReadContract, useAccount } from 'wagmi';
import { RedPacketAbi, RED_PACKET_CONTRACT_ADDRESS } from '@/lib/RedPacketAbi';
import { formatUnits, erc20Abi, getAddress } from 'viem';

interface Claimer {
  name: string;
  avatar?: string;
  address: string;
  amount: string;
  isBest?: boolean;
}

interface RedPacketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderName: string;
  senderAvatar?: string;
  message: string;
  packetId?: string;
  type?: 'LUCKY' | 'NORMAL';
  tokenSymbol?: string;
  // Make other props optional as they will be fetched
  myAmount?: string;
  totalCount?: number;
  claimedCount?: number;
  totalAmount?: string;
  claimedAmount?: string;
  claimedList?: Claimer[];
}

export function RedPacketDetailsModal({
  isOpen,
  onClose,
  senderName,
  senderAvatar,
  message,
  packetId,
  type = 'LUCKY',
  myAmount: initialMyAmount,
  tokenSymbol: initialTokenSymbol
}: RedPacketDetailsModalProps) {
  const { toast } = useToast();
  const { address: currentAddress } = useAccount();

  // 1. 获取红包基本信息
  const { data: packet, refetch: refetchPacket } = useReadContract({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    functionName: 'getPacket',
    args: packetId ? [BigInt(packetId)] : undefined,
    query: {
      enabled: !!packetId && isOpen
    }
  });

  const packetData = packet as any;
  const tokenAddress = packetData?.token;

  // 2. 获取代币信息
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress && isOpen }
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress && isOpen }
  });

  // 3. 获取领取记录
  const { data: recordsData, refetch: refetchRecords } = useReadContract({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    functionName: 'getClaimRecordsPaged',
    args: packetId ? [BigInt(packetId), BigInt(0), BigInt(100)] : undefined, // 获取前100条
    query: {
      enabled: !!packetId && isOpen
    }
  });

  // 强制刷新数据
  React.useEffect(() => {
    if (isOpen) {
      refetchPacket();
      refetchRecords();
    }
  }, [isOpen, refetchPacket, refetchRecords]);

  // 处理数据
  const displaySymbol = symbol || initialTokenSymbol || '';
  const tokenDecimals = decimals || 18;

  const claimRecords = React.useMemo(() => {
    if (!recordsData) return [];

    // 安全解析 recordsData
    let records: any[] = [];
    if (Array.isArray(recordsData)) {
      // 如果返回值是 [records, total]
      if (Array.isArray(recordsData[0])) {
        records = recordsData[0];
      } else {
        // 兜底：假设 recordsData 本身就是记录数组
        records = recordsData as any[];
      }
    }

    if (!records || !Array.isArray(records)) return [];

    // 找出最佳手气
    let maxAmount = BigInt(0);
    if (packetData?.isRandom) {
      records.forEach((r: any) => {
        if (r.amount > maxAmount) maxAmount = r.amount;
      });
    }

    return records.map((r: any) => ({
      name:
        r.claimer === currentAddress
          ? '我'
          : `${r.claimer.slice(0, 6)}...${r.claimer.slice(-4)}`,
      address: r.claimer,
      amount: formatUnits(r.amount, tokenDecimals),
      isBest: packetData?.isRandom && r.amount === maxAmount && r.amount > 0,
      avatar: undefined // 暂时无法获取头像
    }));
  }, [recordsData, tokenDecimals, currentAddress, packetData]);

  // 计算我的领取金额
  const myRecord = claimRecords.find(
    (r) => getAddress(r.address) === getAddress(currentAddress || '')
  );
  const displayAmount = myRecord?.amount || initialMyAmount || '0.00';

  // 统计数据
  const formatMoney = (amount: bigint, decimals: number) => {
    const val = parseFloat(formatUnits(amount, decimals));
    if (val === 0) return '0';
    if (Number.isInteger(val)) return val.toFixed(2);
    return Number(val.toFixed(4)).toString();
  };

  const totalAmountStr = packetData
    ? formatMoney(packetData.totalAmount, tokenDecimals)
    : '0';
  const claimedAmountStr = packetData
    ? formatMoney(packetData.claimedAmount, tokenDecimals)
    : '0';
  const totalCount = packetData ? Number(packetData.totalShares) : 0;
  const claimedCount = packetData ? Number(packetData.claimedShares) : 0;
  const isRandom = packetData?.isRandom;

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

  const safeSenderAvatar = getSafeAvatarUrl(senderAvatar);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '复制成功',
      description: '地址已复制',
      variant: 'success'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#f7f7f7] border-none shadow-none p-0 w-full h-full max-w-none max-h-none rounded-none flex flex-col overflow-hidden gap-0 [&>button]:hidden focus:outline-none">
        <DialogTitle className="sr-only">Red Packet Details</DialogTitle>
        <DialogDescription className="sr-only">
          Red Packet Details
        </DialogDescription>

        {/* 头部区域 */}
        <div
          className="relative h-[100px] shrink-0"
          style={{
            backgroundImage: "url('/chats/Red_envelope_head_bg.png')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="flex items-center px-4 py-3 text-white relative z-20">
            <button
              onClick={onClose}
              className="p-1 -ml-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex-1" />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex flex-col items-center mt-10 relative z-10 pb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-sm overflow-hidden bg-gray-200 shrink-0">
              {safeSenderAvatar ? (
                <Image
                  src={safeSenderAvatar}
                  alt={senderName}
                  width={20}
                  height={20}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-[10px]">
                  {senderName[0]}
                </div>
              )}
            </div>
            <span className="text-gray-900 font-medium text-[15px]">
              {senderName}的红包
            </span>
            {isRandom && (
              <span className="text-[#e8c37e] border border-[#e8c37e] text-[10px] px-1 rounded-[2px] leading-tight">
                拼
              </span>
            )}
          </div>

          <div className="text-gray-400 text-[12px] mb-6">{message}</div>

          {/* 只有已领取才显示金额 */}
          {!!myRecord && (
            <div className="flex flex-col items-center text-[#CDAC72]">
              <div className="text-[48px] font-bold leading-none flex items-baseline gap-1">
                {displayAmount}
              </div>
              <div className="text-[32px] font-medium mt-2 opacity-90">
                {displaySymbol}
              </div>
            </div>
          )}
        </div>

        {/* 汇总栏 */}
        <div className="bg-[#f7f7f7] px-4 py-2 text-[13px] text-gray-500 shrink-0 border-b border-gray-200">
          已领取{claimedCount}/{totalCount}个红包，共{claimedAmountStr}/
          {totalAmountStr} {displaySymbol}
        </div>

        {/* 列表区域 */}
        <div className="flex-1 overflow-y-auto">
          {claimRecords.map((item, index) => (
            <div
              key={index}
              className="flex items-center px-4 py-3 border-b border-gray-200"
            >
              <div className="relative mr-3">
                <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100">
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs">
                    {item.name[0]}
                  </div>
                </div>
                {item.isBest && (
                  <div className="absolute -top-2 -right-2 w-4 h-4">
                    <Image
                      src="/chats/Crown.png"
                      alt="Best Luck"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[15px] font-medium text-gray-900">
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      'text-[15px] font-medium',
                      item.isBest ? 'text-[#fa9d3b]' : 'text-gray-900'
                    )}
                  >
                    {item.amount} {displaySymbol}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-[11px] text-gray-400 break-all mr-1 font-mono">
                    {item.address}
                  </span>
                  <button
                    onClick={() => handleCopy(item.address)}
                    className="w-3 h-3 relative opacity-60 hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Image
                      src="/contacts/copy.svg"
                      alt="Copy"
                      fill
                      className="object-contain"
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {claimRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300 text-sm">
              暂无领取记录
            </div>
          )}
        </div>

        <div className="bg-[#f7f7f7] py-4 text-center text-[12px] text-gray-400 shrink-0">
          未领取的红包，将于5天后发起退款
        </div>
      </DialogContent>
    </Dialog>
  );
}
