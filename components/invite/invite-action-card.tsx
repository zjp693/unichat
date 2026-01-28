'use client';

/**
 * 邀请操作卡片组件
 *
 * 功能：
 * 1. ✅ 直接生成邀请码（前端编码，无需链上交易）
 * 2. ✅ 显示邀请链接和复制功能
 * 3. ✅ 用户体验优化：立即生成，无需等待
 *
 * ⚠️ 变更说明：
 * - 旧方案：需要调用合约的 createReferral 函数，等待交易确认
 * - 新方案：直接在前端由用户地址编码生成，立即可用
 */

import React from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAccount, useChainId } from 'wagmi';
import { generateReferralCode } from '@/lib/referral';

/**
 * 邀请操作卡片组件属性
 * @property groupAddress - 可选的群地址，会添加到邀请链接中
 */
interface InviteActionCardProps {
  groupAddress?: `0x${string}`;
}

export function InviteActionCard({ groupAddress }: InviteActionCardProps) {
  const { toast } = useToast();
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  /**
   * 生成分享链接
   */
  const generateShareUrl = (): string => {
    if (!userAddress) return '';

    // 直接生成邀请码（无需链上交易）
    const referralCode = generateReferralCode(userAddress);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      code: referralCode,
      chainId: String(chainId)
    });

    // 如果有群地址，添加到参数中
    if (groupAddress) {
      params.append('group', groupAddress);
    }

    return `${baseUrl}/join?${params.toString()}`;
  };

  const shareUrl = generateShareUrl();

  /**
   * 复制邀请链接
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: '复制成功',
      description: '邀请链接已复制到剪贴板',
      variant: 'success'
    });
  };

  // 未连接钱包
  if (!userAddress) {
    return (
      <div className="px-4 py-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">请先连接钱包</p>
        </div>
      </div>
    );
  }

  // 已连接钱包 - 直接显示邀请链接
  return (
    <div className="px-4 py-4">
      <div className="space-y-1.5">
        <label className="text-xs text-gray-400 ml-1">你的邀请链接</label>
        <div className="flex items-center justify-between bg-violet-50/50 border border-violet-100 rounded-xl px-4 py-3">
          <span className="text-sm text-gray-600 truncate mr-2 font-mono">
            {shareUrl}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-violet-100 rounded-lg transition-colors text-gray-500 shrink-0"
            title="复制链接"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
