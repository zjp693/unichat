'use client';

import Image from 'next/image';

interface RedPacketClaimMessageProps {
  claimerName: string;
  ownerName: string;
  isCurrentUserClaimer: boolean;
}

export function RedPacketClaimMessage({
  claimerName,
  ownerName,
  isCurrentUserClaimer
}: RedPacketClaimMessageProps) {
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
          {isCurrentUserClaimer ? '你' : claimerName}领取了{ownerName}的
          <span className="text-[#fa9d3b]">红包</span>
        </span>
      </div>
    </div>
  );
}
