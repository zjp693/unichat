'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { TokenInfo } from '@/hooks/contract/useAllowedTokens';
import { getAddressColor } from '@/lib/utils';

interface TokenLogoProps {
  token: TokenInfo;
  size?: number;
  className?: string;
}

/**
 * 代币Logo组件
 * 显示代币符号的首字母，背景色根据地址生成
 */
export function TokenLogo({
  token,
  size = 32,
  className = ''
}: TokenLogoProps) {
  const bgColor = useMemo(
    () => getAddressColor(token.address),
    [token.address]
  );

  const firstLetter = token.symbol?.[0] || '?';

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: Math.floor(size * 0.5)
      }}
    >
      {firstLetter}
    </div>
  );
}
