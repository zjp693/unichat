'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { RedPacketConfig } from './types';

interface RedPacketMessageProps {
  config: RedPacketConfig;
  status?: 'active' | 'claimed' | 'expired' | 'empty';
  onClick?: () => void;
}

export function RedPacketMessage({
  config,
  status = 'active',
  onClick
}: RedPacketMessageProps) {
  // 已领取、已领完、已过期都使用相同的"已打开"样式
  const isOpened =
    status === 'claimed' || status === 'empty' || status === 'expired';

  // 根据状态显示不同的文案
  const getStatusText = () => {
    switch (status) {
      case 'claimed':
        return '已领取';
      case 'empty':
        return '已领完';
      case 'expired':
        return '已过期';
      default:
        return null;
    }
  };

  const statusText = getStatusText();

  return (
    <div
      className={cn(
        'w-[240px] rounded-[8px] overflow-hidden cursor-pointer transition-all active:scale-95 select-none relative',
        isOpened ? 'bg-[#fdd7b1]' : 'bg-[#fa9c3b]'
      )}
      onClick={onClick}
    >
      {/* Top Content */}
      <div className="p-3 pb-3 flex items-center gap-3">
        {/* Icon Container */}
        <div
          className={cn(
            'w-[40px] h-[50px] flex items-center justify-center flex-shrink-0',
            isOpened ? 'opacity-100' : 'opacity-100'
          )}
        >
          <div className="relative w-[36px] h-[44px]">
            <Image
              src={isOpened ? '/chats/Claim.png' : '/chats/Notclaimed.png'}
              alt="Red Packet"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col min-w-0">
          <span className="text-[15px] font-medium leading-tight truncate text-white">
            {config.message || '恭喜发财，大吉大利'}
          </span>
          {statusText && (
            <span className="text-[12px] text-white mt-1">{statusText}</span>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="h-[1px] bg-white/20 mx-3" />

      {/* Bottom Bar */}
      <div className={cn('h-[24px] px-3 flex items-center gap-1.5')}>
        <span className="text-[11px] text-white/90">红包</span>
      </div>
    </div>
  );
}
