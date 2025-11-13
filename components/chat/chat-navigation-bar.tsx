'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, MoreVertical, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ==================== 类型定义 ====================

interface ChatNavigationBarProps {
  mode: 'group' | 'private';
  chatInfo: {
    name: string;
    avatar?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    address: string;
    memberCount?: number;
  };
  topSection?: {
    chainName?: string;
    regionCode?: string;
    regionFlag?: string;
    showWalletButton?: boolean;
  };
  onBack?: () => void;
  onWalletConnect?: () => void;
  onMenuClick?: () => void;
  onAddressCopy?: (address: string) => void;
  className?: string;
}

interface TopSectionProps {
  chainName: string;
  regionCode: string;
  regionFlag?: string;
  showWalletButton?: boolean;
  onWalletConnect?: () => void;
}

interface BottomSectionProps {
  mode: 'group' | 'private';
  chatInfo: {
    name: string;
    avatar?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    address: string;
    memberCount?: number;
  };
  levelTheme: LevelTheme;
  onBack?: () => void;
  onMenuClick?: () => void;
  onAddressCopy?: (address: string) => void;
}

type LevelTheme = {
  background: string;
  textColor: string;
  badgeColor: string;
  opacity: string;
};

// ==================== 常量定义 ====================

const LEVEL_THEMES: Record<number, LevelTheme> = {
  1: {
    background: 'from-blue-100 to-blue-200',
    textColor: 'text-blue-900',
    badgeColor: 'bg-blue-500',
    opacity: 'bg-opacity-90'
  },
  2: {
    background: 'from-blue-500 to-blue-600',
    textColor: 'text-white',
    badgeColor: 'bg-blue-700',
    opacity: 'bg-opacity-95'
  },
  3: {
    background: 'from-purple-500 to-purple-600',
    textColor: 'text-white',
    badgeColor: 'bg-purple-700',
    opacity: 'bg-opacity-95'
  },
  4: {
    background: 'from-yellow-400 to-yellow-500',
    textColor: 'text-yellow-900',
    badgeColor: 'bg-yellow-600',
    opacity: 'bg-opacity-95'
  },
  5: {
    background: 'from-red-600 to-red-700',
    textColor: 'text-white',
    badgeColor: 'bg-red-800',
    opacity: 'bg-opacity-95'
  },
  6: {
    background: 'from-gray-900 to-black',
    textColor: 'text-white',
    badgeColor: 'bg-gray-700',
    opacity: 'bg-opacity-100'
  }
};

const DEFAULT_CHAIN = 'BNB Chain';
const DEFAULT_REGION = 'USA';
const DEFAULT_LEVEL = 1;
const DEFAULT_AVATAR = '/placeholder-user.jpg';

// ==================== 子组件 ====================

// 顶部区域组件
const TopSection: React.FC<TopSectionProps> = ({
  chainName,
  regionCode,
  regionFlag,
  showWalletButton = true,
  onWalletConnect
}) => {
  return (
    <div className="flex items-center justify-between py-4 pl-0 pr-1 bg-white border-b border-gray-200">
      {/* 链名称标签 */}
      <div className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl font-medium">
        {chainName}
      </div>

      {/* 钱包连接按钮 */}
      {showWalletButton && (
        <div className="flex-shrink-0">
          <appkit-button />
        </div>
      )}

      {/* 地区选择器 */}
      <div className="flex items-center px-2 py-0 text-xs border h-9 border-gray-200 rounded-xl">
        {regionFlag && (
          <div className="inline-block align-middle mr-3 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src={regionFlag}
              alt={regionCode}
              width={16}
              height={16}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <span className="font-bold">{regionCode}</span>
      </div>
    </div>
  );
};

// 底部区域组件
const BottomSection: React.FC<BottomSectionProps> = ({
  mode,
  chatInfo,
  levelTheme,
  onBack,
  onMenuClick,
  onAddressCopy
}) => {
  const [avatarError, setAvatarError] = useState(false);

  const handleAddressCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(chatInfo.address);
      onAddressCopy?.(chatInfo.address);
    } catch (error) {
      console.error('复制地址失败:', error);
    }
  }, [chatInfo.address, onAddressCopy]);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleMenu = useCallback(() => {
    onMenuClick?.();
  }, [onMenuClick]);

  return (
    <div
      className={cn(
        'flex items-center justify-between py-3 pl-0 pr-1 bg-gradient-to-r',
        levelTheme.background,
        levelTheme.textColor
      )}
    >
      {/* 左侧：返回按钮 + 成员数 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleBack}
          aria-label="返回聊天列表"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:opacity-80 active:scale-95 transition-all duration-200"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        {mode === 'group' && chatInfo.memberCount && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-xs font-bold">
            {chatInfo.memberCount}
          </div>
        )}
      </div>

      {/* 中间：聊天信息 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* 头像 */}
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={
                avatarError ? DEFAULT_AVATAR : chatInfo.avatar || DEFAULT_AVATAR
              }
              alt={chatInfo.name}
              width={32}
              height={32}
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          </div>

          {/* 名称 + 等级徽章 */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold truncate max-w-[150px]">
              {chatInfo.name}
            </span>
            {mode === 'group' && chatInfo.level && (
              <Badge
                className={cn(
                  'text-xs px-2 py-0.5',
                  levelTheme.badgeColor,
                  'text-white'
                )}
              >
                LV{chatInfo.level}
              </Badge>
            )}
          </div>
        </div>

        {/* 钱包地址 */}
        <button
          onClick={handleAddressCopy}
          aria-label={`复制地址 ${chatInfo.address}`}
          className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity font-mono tracking-tighter"
        >
          <span>{chatInfo.address}</span>
          <Copy className="w-3 h-3" />
        </button>
      </div>

      {/* 右侧：菜单按钮 */}
      <button
        onClick={handleMenu}
        aria-label="打开菜单"
        className="flex items-center justify-center w-10 h-10 rounded-full hover:opacity-80 active:scale-95 transition-all duration-200"
      >
        <MoreVertical className="w-6 h-6 rotate-90" />
      </button>
    </div>
  );
};

// ==================== 主组件 ====================

export const ChatNavigationBar = React.memo<ChatNavigationBarProps>(
  ({
    mode,
    chatInfo,
    topSection,
    onBack,
    onWalletConnect,
    onMenuClick,
    onAddressCopy,
    className
  }) => {
    // 计算等级主题
    const levelTheme = useMemo(
      () => LEVEL_THEMES[chatInfo.level || DEFAULT_LEVEL],
      [chatInfo.level]
    );

    // 顶部区域配置
    const chainName = topSection?.chainName || DEFAULT_CHAIN;
    const regionCode = topSection?.regionCode || DEFAULT_REGION;
    const regionFlag = topSection?.regionFlag;
    const showWalletButton = topSection?.showWalletButton ?? true;

    return (
      <div className={cn('w-full', className)}>
        {/* 顶部区域 */}
        <TopSection
          chainName={chainName}
          regionCode={regionCode}
          regionFlag={regionFlag}
          showWalletButton={showWalletButton}
          onWalletConnect={onWalletConnect}
        />

        {/* 底部区域 */}
        <BottomSection
          mode={mode}
          chatInfo={chatInfo}
          levelTheme={levelTheme}
          onBack={onBack}
          onMenuClick={onMenuClick}
          onAddressCopy={onAddressCopy}
        />
      </div>
    );
  }
);

ChatNavigationBar.displayName = 'ChatNavigationBar';
