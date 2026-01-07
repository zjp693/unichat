'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SubgroupTabsProps {
  /** 当前选中的 Tab */
  activeTab: 'main' | 'sub';
  /** Tab 切换回调 */
  onTabChange: (tab: 'main' | 'sub') => void;
  /** 总群消息数（可选，用于显示 Badge） */
  mainMessageCount?: number;
  /** 分群消息数（可选，用于显示 Badge） */
  subMessageCount?: number;
  /** 用户是否有分群 (subgroupId > 0)，若无则禁用分群 Tab */
  hasSubgroup?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 分群 Tab 切换组件
 * 用于红包群聊中切换总群和分群消息视图
 */
export const SubgroupTabs: React.FC<SubgroupTabsProps> = ({
  activeTab,
  onTabChange,
  mainMessageCount,
  subMessageCount,
  hasSubgroup = true,
  className
}) => {
  return (
    <div
      className={cn(
        'flex items-center bg-white border-b border-gray-100',
        className
      )}
    >
      {/* 总群 Tab */}
      <button
        onClick={() => onTabChange('main')}
        className={cn(
          'flex-1 flex items-center justify-center py-3 relative transition-colors',
          activeTab === 'main'
            ? 'text-[#7C3AED] font-semibold'
            : 'text-gray-500'
        )}
      >
        <span className="relative">
          总群
          {mainMessageCount !== undefined && mainMessageCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-8 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none',
                activeTab === 'main'
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-gray-200 text-gray-600'
              )}
            >
              {mainMessageCount > 99 ? '99+' : mainMessageCount}
            </span>
          )}
        </span>
        {/* 选中下划线 */}
        {activeTab === 'main' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-[#7C3AED] rounded-full" />
        )}
      </button>

      {/* 分群 Tab */}
      <button
        onClick={() => hasSubgroup && onTabChange('sub')}
        disabled={!hasSubgroup}
        className={cn(
          'flex-1 flex items-center justify-center py-3 relative transition-colors',
          !hasSubgroup && 'opacity-50 cursor-not-allowed',
          activeTab === 'sub' ? 'text-[#7C3AED] font-semibold' : 'text-gray-500'
        )}
      >
        <span className="relative">
          分群
          {subMessageCount !== undefined && subMessageCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-8 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none',
                activeTab === 'sub'
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-gray-200 text-gray-600'
              )}
            >
              {subMessageCount > 99 ? '99+' : subMessageCount}
            </span>
          )}
        </span>
        {/* 选中下划线 */}
        {activeTab === 'sub' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-[#7C3AED] rounded-full" />
        )}
      </button>
    </div>
  );
};

SubgroupTabs.displayName = 'SubgroupTabs';
