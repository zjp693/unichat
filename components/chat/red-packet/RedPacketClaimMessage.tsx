'use client';

import Image from 'next/image';
import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { Address } from 'viem';

interface RedPacketClaimMessageProps {
  claimerAddress?: Address;
  ownerAddress?: Address;
  claimerName: string; // fallback 昵称（地址缩写）
  ownerName: string; // fallback 昵称（地址缩写）
  isCurrentUserClaimer: boolean;
}

export function RedPacketClaimMessage({
  claimerAddress,
  ownerAddress,
  claimerName,
  ownerName,
  isCurrentUserClaimer
}: RedPacketClaimMessageProps) {
  // 查询真实昵称
  const { name: claimerRealName } = usePeerAvatar(claimerAddress);
  const { name: ownerRealName } = usePeerAvatar(ownerAddress);

  // 优先使用真实昵称，fallback 到地址缩写
  const displayClaimerName = claimerRealName || claimerName;
  const displayOwnerName = ownerRealName || ownerName;

  return (
    <div className="flex justify-center my-2">
      <div className="bg-[#f3f3f3] px-3 py-1 rounded-[4px] flex items-center gap-1">
        <div className="relative w-[14px] h-[14px]">
          <Image
            src="/chats/Redenvelope.png"
            alt="Red Packet"
            fill
            className="object-contain"
          />
        </div>
        <span className="text-[12px] text-[#999999]">
          {isCurrentUserClaimer ? '你' : displayClaimerName}领取了
          {displayOwnerName}的<span className="text-[#fa9d3b]">红包</span>
        </span>
      </div>
    </div>
  );
}
