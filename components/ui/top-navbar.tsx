'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface TopNavbarProps {
  className?: string;
}

export function TopNavbar({ className }: TopNavbarProps) {
  return (
    <div
      className={`flex items-center justify-between py-4 px-4 bg-white border-b border-gray-200 ${className || ''}`}
    >
      {/* 钱包连接按钮 */}
      <appkit-button />

      {/* 国家/地区按钮 */}
      <Button
        variant="outline"
        className="flex items-center space-x-1 px-3 py-1 text-xs"
      >
        <div className="inline-block align-middle mr-1 w-4 h-4 rounded-full overflow-hidden">
          <Image
            src="/top/usa.png"
            alt="USA"
            className="w-full h-full object-cover"
            width={16}
            height={16}
          />
        </div>
        <span>USA</span>
      </Button>
    </div>
  );
}
