'use client';

import * as React from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { TokenInfo } from '@/hooks/contract/useAllowedTokens';
import { formatAddress } from '@/lib/utils';
import { TokenLogo } from '@/components/contract/TokenLogo';
import { useClickOutside } from '@/hooks/useClickOutside';

interface TokenDropdownProps {
  tokens: TokenInfo[];
  selectedToken: TokenInfo | null;
  isLoading: boolean;
  onSelect: (token: TokenInfo) => void;
  onClose: () => void;
}

/**
 * 代币下拉列表组件
 */
export function TokenDropdown({
  tokens,
  selectedToken,
  isLoading,
  onSelect,
  onClose
}: TokenDropdownProps) {
  // 移除重复的 useClickOutside - 由父组件处理
  // const dropdownRef = React.useRef<HTMLDivElement>(null);
  // useClickOutside(dropdownRef, onClose);

  return (
    <div
      // ref={dropdownRef}  // 不需要ref，父组件已处理
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50"
    >
      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span className="ml-2 text-sm text-gray-500">加载代币列表...</span>
        </div>
      )}

      {/* 代币列表 */}
      {!isLoading && tokens.length > 0 && (
        <div className="p-2">
          {tokens.map((token) => (
            <TokenListItem
              key={token.address}
              token={token}
              selected={selectedToken?.address === token.address}
              onClick={() => onSelect(token)}
            />
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && tokens.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          暂无可用代币
        </div>
      )}
    </div>
  );
}

/**
 * 代币列表项组件
 */
function TokenListItem({
  token,
  selected,
  onClick
}: {
  token: TokenInfo;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        selected
          ? 'bg-purple-50 hover:bg-purple-100'
          : 'hover:bg-gray-50 active:bg-gray-100'
      }`}
    >
      {/* 代币图标 */}
      <TokenLogo token={token} size={32} />

      {/* 代币信息 */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-900">
          {token.symbol}
        </div>
        <div className="text-xs text-gray-500 truncate">{token.name}</div>
      </div>

      {/* 地址缩略 */}
      <div className="text-xs text-gray-400 font-mono">
        {formatAddress(token.address)}
      </div>

      {/* 选中标记 */}
      {selected && (
        <div className="flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-purple-600" />
        </div>
      )}
    </div>
  );
}
