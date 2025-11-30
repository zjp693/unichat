'use client';

import { Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TokenListItemProps } from './types';
import { useState } from 'react';

// 根据地址生成颜色
function getColorFromAddress(address: string): string {
  const colors = [
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-green-400 to-green-600',
    'from-yellow-400 to-yellow-600',
    'from-red-400 to-red-600',
    'from-indigo-400 to-indigo-600',
    'from-teal-400 to-teal-600'
  ];
  const hash = address
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function TokenListItem({
  token,
  isSelected,
  onClick
}: TokenListItemProps) {
  const gradientClass = getColorFromAddress(token.address);
  const [imageError, setImageError] = useState(false);

  // 检查 iconCid 是否是一个可用的图片 URL
  const hasValidImage =
    token.iconCid &&
    (token.iconCid.startsWith('http://') ||
      token.iconCid.startsWith('https://'));

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 py-3 px-0 w-full transition-colors border-b border-gray-100',
        isSelected && 'bg-blue-50/50'
      )}
    >
      {/* 左侧：图标 */}
      <div className="relative">
        {hasValidImage && !imageError ? (
          <img
            src={token.iconCid}
            onError={() => setImageError(true)}
            className="w-10 h-10 rounded-full object-cover"
            alt={token.symbol}
          />
        ) : (
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br',
              gradientClass
            )}
          >
            <span className="text-white font-bold text-sm">
              {token.symbol.charAt(0)}
            </span>
          </div>
        )}
        {/* 网络角标 */}
        {/* <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center border border-white">
                    <Globe className="w-2.5 h-2.5 text-white" />
                </div> */}
      </div>

      {/* 中间：代币信息 */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-base">
            {token.symbol}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs mt-0.5">
          <span className="text-gray-500">{token.name}</span>
        </div>
      </div>

      {/* 右侧：余额信息 */}
      <div className="text-right">
        <div className="font-bold text-gray-900 text-base">
          {token.balance || '0'}
        </div>
        {/* 暂时隐藏价格信息，等待接入真实价格源 */}
        {/* <div className="text-xs text-gray-400 mt-0.5">
                    $0.00
                </div> */}
      </div>
    </button>
  );
}
