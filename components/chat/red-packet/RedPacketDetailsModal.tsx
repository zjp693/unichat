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
  type: 'LUCKY' | 'NORMAL';
  myAmount?: string;
  tokenSymbol: string;
  totalCount: number;
  claimedCount: number;
  totalAmount: string;
  claimedAmount: string;
  claimedList: Claimer[];
}

export function RedPacketDetailsModal({
  isOpen,
  onClose,
  senderName,
  senderAvatar,
  message,
  type = 'LUCKY',
  myAmount,
  tokenSymbol,
  totalCount,
  claimedCount,
  totalAmount,
  claimedAmount,
  claimedList
}: RedPacketDetailsModalProps) {
  const { toast } = useToast();

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

        {/* 头部区域 - 仅包含背景图和返回按钮 */}
        <div
          className="relative h-[100px] shrink-0"
          style={{
            backgroundImage: "url('/chats/Red_envelope_head_bg.png')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* 顶部栏 */}
          <div className="flex items-center px-4 py-3 text-white relative z-20">
            <button
              onClick={onClose}
              className="p-1 -ml-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex-1" />
          </div>
        </div>

        {/* 内容区域 - 头像、名字、金额等 */}
        <div className="flex flex-col items-center mt-10 relative z-10 pb-8">
          {/* 头像和名字 */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-sm overflow-hidden bg-gray-200 shrink-0">
              {senderAvatar ? (
                <Image
                  src={senderAvatar}
                  alt={senderName}
                  width={20}
                  height={20}
                  className="object-cover w-full h-full"
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
            {(type === 'LUCKY' || !type) && (
              <span className="text-[#e8c37e] border border-[#e8c37e] text-[10px] px-1 rounded-[2px] leading-tight">
                拼
              </span>
            )}
          </div>

          {/* 祝福语 */}
          <div className="text-gray-400 text-[12px] mb-6">{message}</div>

          {/* 金额 */}
          <div className="flex flex-col items-center text-[#CDAC72]">
            <div className="text-[48px] font-bold leading-none flex items-baseline gap-1">
              {myAmount || '0.00'}
            </div>
            <div className="text-[32px] font-medium mt-2 opacity-90">
              {tokenSymbol}
            </div>
          </div>
        </div>

        {/* 汇总栏 */}
        <div className="bg-[#f7f7f7] px-4 py-2 text-[13px] text-gray-500 shrink-0 border-b border-gray-200">
          已领取{claimedCount}/{totalCount}个红包，共{claimedAmount}/
          {totalAmount} {tokenSymbol}
        </div>

        {/* 列表区域 */}
        <div className="flex-1 overflow-y-auto">
          {claimedList.map((item, index) => (
            <div
              key={index}
              className="flex items-center px-4 py-3 border-b border-gray-200"
            >
              <div className="relative mr-3">
                <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100">
                  {item.avatar ? (
                    <Image
                      src={item.avatar}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300" />
                  )}
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
                    {tokenSymbol} {item.amount}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-[11px] text-gray-400 break-all mr-1 font-fomo">
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
          {claimedList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300 text-sm">
              暂无领取记录
            </div>
          )}
        </div>

        {/* 底部区域 */}
        <div className="bg-[#f7f7f7] py-4 text-center text-[12px] text-gray-400 shrink-0">
          未领取的红包，将于5天后发起退款
        </div>
      </DialogContent>
    </Dialog>
  );
}
