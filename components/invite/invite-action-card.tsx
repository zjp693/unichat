'use client';

/**
 * 邀请操作卡片组件
 *
 * 功能：
 * 1. 检查用户是否已有邀请码
 * 2. 未有邀请码时显示"生成邀请码"按钮
 * 3. 已有邀请码时显示邀请链接和复制功能
 */

import React, { useState } from 'react';
import { Copy, Loader2, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useReferralCode,
  useCreateReferralCode
} from '@/hooks/useReferralCode';
import { useAccount } from 'wagmi';

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

  // 查询用户的邀请码
  const {
    referralCode,
    isLoading: isLoadingCode,
    hasReferralCode,
    refetch
  } = useReferralCode();

  // 生成邀请码相关
  const {
    createReferralCode,
    isPending: isCreating,
    isConfirming,
    isSuccess,
    createdCode, // ✅ 从交易 receipt 中解析的邀请码
    error: createError
  } = useCreateReferralCode();

  // 分润比例选择（默认65%）
  const [selectedShareBps, setSelectedShareBps] = useState(6500);

  /**
   * 生成分享链接
   */
  const generateShareUrl = (): string => {
    if (!referralCode) return '';

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({ code: referralCode });

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

  /**
   * 生成邀请码
   */
  const handleGenerateCode = async () => {
    try {
      await createReferralCode(selectedShareBps);
      toast({
        title: '正在生成',
        description: '请在钱包中确认交易'
      });
    } catch (err: any) {
      console.error('生成邀请码失败:', err);

      const errorMessage = err?.message || err?.toString() || '';
      const errorLower = errorMessage.toLowerCase();

      if (
        errorLower.includes('user rejected') ||
        errorLower.includes('user denied')
      ) {
        console.log('👤 用户取消了交易');
      } else {
        toast({
          title: '生成失败',
          description: errorMessage.slice(0, 100) || '请稍后重试',
          variant: 'destructive'
        });
      }
    }
  };

  // ✅ 生成成功后，直接使用 createdCode
  React.useEffect(() => {
    if (isSuccess && createdCode) {
      toast({
        title: '生成成功',
        description: '邀请码已创建',
        variant: 'success'
      });
      console.log('✅ [邀请码] 创建成功:', createdCode);
      // refetch 会自动查询到新邀请码
      refetch();
    }
  }, [isSuccess, createdCode, toast, refetch]);

  // 生成错误提示
  React.useEffect(() => {
    if (createError) {
      console.error('生成邀请码错误:', createError);
    }
  }, [createError]);

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

  // 加载中
  if (isLoadingCode) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
          <span className="text-sm text-gray-500">加载邀请码...</span>
        </div>
      </div>
    );
  }

  // 未有邀请码 - 显示生成按钮
  if (!hasReferralCode) {
    const isGenerating = isCreating || isConfirming;

    return (
      <div className="px-4 py-4">
        <div className="space-y-3">
          {/* 分润比例选择（可选功能） */}
          {/* <div className="space-y-1.5">
            <label className="text-xs text-gray-400 ml-1">分润比例</label>
            <select 
              value={selectedShareBps}
              onChange={(e) => setSelectedShareBps(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              disabled={isGenerating}
            >
              <option value={5000}>50%</option>
              <option value={5500}>55%</option>
              <option value={6000}>60%</option>
              <option value={6500}>65% (推荐)</option>
              <option value={7000}>70%</option>
              <option value={7500}>75%</option>
              <option value={8000}>80%</option>
            </select>
          </div> */}

          {/* 生成按钮 */}
          <button
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl py-3.5 font-medium shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isConfirming ? '确认中...' : '生成中...'}</span>
              </>
            ) : (
              <>
                <Gift className="w-5 h-5" />
                <span>生成我的邀请码</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 已有邀请码 - 显示邀请链接
  return (
    <div className="px-4 py-4">
      <div className="space-y-1.5">
        {/* 标签 */}
        <label className="text-xs text-gray-400 ml-1">你的邀请链接</label>

        {/* 邀请链接显示区域 */}
        <div className="flex items-center justify-between bg-violet-50/50 border border-violet-100 rounded-xl px-4 py-3">
          {/* 链接文本 */}
          <span className="text-sm text-gray-600 truncate mr-2 font-mono">
            {shareUrl}
          </span>

          {/* 复制按钮 */}
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
