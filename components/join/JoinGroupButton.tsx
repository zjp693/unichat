'use client';

/**
 * 加入群聊页面 - 加入按钮组件（一比一还原设计稿）
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JoinGroupButtonProps {
  isJoining: boolean;
  disabled?: boolean;
  step?: 'idle' | 'checking' | 'approving' | 'joining';
  isMember?: boolean;
  onClick: () => void;
}

export function JoinGroupButton({
  isJoining,
  disabled = false,
  step = 'idle',
  isMember = false,
  onClick
}: JoinGroupButtonProps) {
  // 根据步骤显示不同文字
  const getButtonText = () => {
    if (isMember) return '进入群聊';
    if (!isJoining) return '加入群聊';

    switch (step) {
      case 'checking':
        return '检查中...';
      case 'approving':
        return '授权中...';
      case 'joining':
        return '加入中...';
      default:
        return '处理中...';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white px-6 py-4 z-50">
      <button
        onClick={onClick}
        disabled={disabled || isJoining}
        className={cn(
          'w-full py-3.5 rounded-full text-white font-medium text-base',
          'transition-all duration-200',
          'flex items-center justify-center gap-2',
          disabled || isJoining
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-400 via-purple-500 to-pink-400 shadow-lg hover:shadow-xl'
        )}
      >
        {isJoining && <Loader2 className="w-5 h-5 animate-spin" />}
        <span>{getButtonText()}</span>
      </button>
    </div>
  );
}
