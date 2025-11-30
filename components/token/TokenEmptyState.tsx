'use client';

import Image from 'next/image';
import type { TokenEmptyStateProps } from './types';

export function TokenEmptyState({ onAddClick }: TokenEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center pt-32 px-4 text-center">
      <div className="relative w-48 h-48 mb-6">
        <Image
          src="/chats/404.png"
          alt="No tokens found"
          fill
          className="object-contain"
        />
      </div>
      <div className="text-gray-500 text-sm">
        找不到您的代币？点击{' '}
        <button
          onClick={onAddClick}
          className="text-blue-600 hover:underline font-medium focus:outline-none"
        >
          添加代币
        </button>
      </div>
    </div>
  );
}
