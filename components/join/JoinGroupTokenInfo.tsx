'use client';

/**
 * 加入群聊页面 - 代币信息组件（一比一还原设计稿）
 */

import React from 'react';

interface JoinGroupTokenInfoProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenIcon?: string;
  entryFee: string;
}

export function JoinGroupTokenInfo({
  tokenAddress,
  tokenSymbol,
  tokenIcon,
  entryFee
}: JoinGroupTokenInfoProps) {
  // 代币图标组件
  const TokenIcon = () => {
    if (tokenIcon) {
      return (
        <img
          src={tokenIcon}
          alt={tokenSymbol}
          className="w-5 h-5 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">
        {tokenSymbol?.charAt(0) || 'T'}
      </div>
    );
  };

  return (
    <div className="bg-white mx-4 rounded-lg px-4">
      {/* 群聊使用代币 */}
      <div className="flex justify-between items-center py-3 border-b border-gray-200">
        <span className="text-sm text-gray-700">群聊使用代币</span>
        <div className="flex items-center gap-1.5">
          <TokenIcon />
          <span className="text-sm text-gray-700">{tokenSymbol}</span>
        </div>
      </div>

      {/* 合约地址 */}
      <div className="py-3 border-b border-gray-200">
        <div className="text-sm text-gray-700 mb-2">合约地址</div>
        <div className="text-xs text-gray-400 break-all leading-relaxed">
          {tokenAddress}
        </div>
      </div>

      {/* 代币名称 */}
      <div className="flex justify-between items-center py-3 border-b border-gray-200">
        <span className="text-sm text-gray-700">代币名称</span>
        <div className="flex items-center gap-1.5">
          <TokenIcon />
          <span className="text-sm text-gray-700">{tokenSymbol}</span>
        </div>
      </div>

      {/* 进群需缴纳 */}
      <div className="flex justify-between items-center py-3">
        <span className="text-sm text-gray-700">进群需邀请</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-800">{entryFee}</span>
          <TokenIcon />
          <span className="text-sm text-gray-700">{tokenSymbol}</span>
        </div>
      </div>
    </div>
  );
}
