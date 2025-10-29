'use client';

import Image from 'next/image';

interface TopNavbarProps {
  className?: string;
}

export function TopNavbar({ className }: TopNavbarProps) {
  return (
    <div
      className={`flex items-center justify-between py-4 px-4 bg-white border-gray-200 ${className || ''}`}
    >
      {/* 钱包连接按钮 */}
      <appkit-button />

      {/* 国家/地区按钮 */}
      <div className="flex items-center px-2 py-0 text-xs border h-9 border-gray-200 rounded-xl">
        <div className="inline-block align-middle mr-3 w-4 h-4 rounded-full overflow-hidden">
          <Image
            src="/top/usa.png"
            alt="USA"
            className="w-full h-full object-cover"
            width={16}
            height={16}
          />
        </div>
        <span className="font-bold">USA</span>
      </div>
    </div>
  );
}
