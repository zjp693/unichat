'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, MoreVertical, Copy, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ==================== 类型定义 ====================

interface ChatNavigationBarProps {
  mode: 'group' | 'private';
  chatInfo: {
    name: string;
    avatar?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    address: string;
    memberCount?: number;
    groupCondition?: string;
  };
  topSection?: {
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
  regionCode: string;
  regionFlag?: string;
  showWalletButton?: boolean;
  onWalletConnect?: () => void;
  levelTheme: LevelTheme;
}

interface BottomSectionProps {
  mode: 'group' | 'private';
  chatInfo: {
    name: string;
    avatar?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    address: string;
    memberCount?: number;
    groupCondition?: string;
  };
  levelTheme: LevelTheme;
  onBack?: () => void;
  onMenuClick?: () => void;
  onAddressCopy?: (address: string) => void;
}

type LevelTheme = {
  background?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  textColor: string;
  badgeColor: string;
  opacity: string;
};

// ==================== 常量定义 ====================

const LEVEL_THEMES: Record<number, LevelTheme> = {
  1: {
    backgroundColor: '#b9cef8',
    textColor: 'text-[#303133]',
    badgeColor: 'bg-blue-500',
    opacity: 'bg-opacity-90'
  },
  2: {
    backgroundColor: '#404de2',
    textColor: 'text-white',
    badgeColor: 'bg-blue-700',
    opacity: 'bg-opacity-95'
  },
  3: {
    backgroundColor: '#9673ff',
    textColor: 'text-white',
    badgeColor: 'bg-purple-700',
    opacity: 'bg-opacity-95'
  },
  4: {
    backgroundImage: '/chats/LV4_bg.png',
    textColor: 'text-[#303133]',
    badgeColor: 'bg-yellow-600',
    opacity: 'bg-opacity-95'
  },
  5: {
    backgroundImage: '/chats/LV5_bg.png',
    textColor: 'text-white',
    badgeColor: 'bg-red-800',
    opacity: 'bg-opacity-95'
  },
  6: {
    backgroundImage: '/chats/LV6_bg.png',
    textColor: 'text-white',
    badgeColor: 'bg-gray-700',
    opacity: 'bg-opacity-100'
  }
};

// const DEFAULT_CHAIN = 'BNB Chain';
const DEFAULT_REGION = 'USA';
const DEFAULT_LEVEL = 1;
const DEFAULT_AVATAR = '/placeholder-user.jpg';

// 等级对应的群条件金额
const LEVEL_CONDITIONS: Record<number, string> = {
  1: '群条件：>100$，才能在本群聊天',
  2: '群条件：>1000$，才能在本群聊天',
  3: '群条件：>10000$，才能在本群聊天',
  4: '群条件：>100000$，才能在本群聊天',
  5: '群条件：>1000000$，才能在本群聊天',
  6: '群条件：>10000000$，才能在本群聊天'
};

// ==================== 子组件 ====================

// 顶部区域组件
const TopSection: React.FC<TopSectionProps> = ({
  regionCode,
  regionFlag,
  showWalletButton = true,
  onWalletConnect,
  levelTheme
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between pt-4 pb-2 px-1 border-white/20',
        levelTheme.textColor
      )}
    >
      {/* 钱包连接按钮 */}
      {showWalletButton && (
        <div className="flex-shrink-0">
          <appkit-button />
        </div>
      )}

      {/* 地区选择器 */}
      <div className="flex items-center px-2 py-0 text-xs border h-7 border-white/30 rounded-lg bg-white">
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
        <span className="font-bold text-black">{regionCode}</span>
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
  const { toast } = useToast();

  const handleAddressCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(chatInfo.address);
      toast({
        title: '复制成功',
        description: '地址已复制到剪贴板',
        variant: 'success'
      });
      onAddressCopy?.(chatInfo.address);
    } catch (error) {
      console.error('复制地址失败:', error);
      toast({
        title: '复制失败',
        description: '无法访问剪贴板',
        variant: 'destructive'
      });
    }
  }, [chatInfo.address, onAddressCopy, toast]);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleMenu = useCallback(() => {
    onMenuClick?.();
  }, [onMenuClick]);

  return (
    <div
      className={cn(
        'flex items-center justify-between py-3 pl-0 pr-1',
        levelTheme.textColor
      )}
    >
      {mode === 'private' ? (
        <>
          {/* 私聊模式布局 */}
          <div className="flex-1 flex items-center justify-between">
            {/* 左侧：返回按钮 */}
            <button
              onClick={handleBack}
              aria-label="返回"
              className="w-10 h-10 flex items-center justify-centen active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* 中间：对方名称 */}
            <div className="font-bold text-lg truncate px-4">
              {chatInfo.name}
            </div>

            {/* 右侧：... 菜单 (私聊样式) */}
            <button
              // onClick={handleMenu}
              aria-label="菜单"
              className="w-10 h-10 flex items-center justify-center active:scale-95 transition-all"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 群聊模式布局 (原有逻辑) */}
          {/* 左侧：返回按钮 + 成员数 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              aria-label="返回聊天列表"
              className="flex items-center justify-center w-10 h-10 rounded-full active:scale-95 transition-all duration-200"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            {/* 消息数 暂时先不需要 */}
            {/* {mode === 'group' && chatInfo.memberCount && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-xs font-bold">
            {chatInfo.memberCount}
          </div>
        )} */}
          </div>

          {/* 中间：聊天信息 */}
          <div className="flex-1 flex flex-col items-center justify-center px-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* 头像 */}
              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={
                    avatarError
                      ? DEFAULT_AVATAR
                      : chatInfo.avatar || DEFAULT_AVATAR
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
                  <div className="flex text-sm px-2 py-0.5">
                    LV{chatInfo.level}({chatInfo.memberCount || 0})
                    <div className="bg-white border border-[#1769df] rounded-sm text-[10px] text-[#1769df] ml-1 px-1">
                      认证
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 钱包地址 */}
            <button
              onClick={handleAddressCopy}
              aria-label={`复制地址 ${chatInfo.address}`}
              className="flex items-center gap-1 text-xs font-mono tracking-tighter"
            >
              <span>{chatInfo.address}</span>
              <Copy className="w-3 h-3" />
            </button>

            {/* 群条件 */}
            {mode === 'group' && chatInfo.level && (
              <div
                className={cn(
                  'text-xs mt-0.5 px-2 py-0.5 rounded',
                  chatInfo.level === 1 || chatInfo.level === 4
                    ? 'text-[#303133] bg-white/50'
                    : 'text-white bg-white/30'
                )}
              >
                {LEVEL_CONDITIONS[chatInfo.level] || chatInfo.groupCondition}
              </div>
            )}
          </div>

          <button
            onClick={handleMenu}
            aria-label="打开菜单"
            className="flex items-center justify-center w-10 h-10 rounded-full active:scale-95 transition-all duration-200"
          >
            <MoreVertical className="w-6 h-6 rotate-90" />
          </button>
        </>
      )}
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
    const regionCode = topSection?.regionCode || DEFAULT_REGION;
    const regionFlag = topSection?.regionFlag;
    const showWalletButton = topSection?.showWalletButton ?? true;

    // 背景样式
    const backgroundStyle = useMemo(() => {
      if (mode === 'private') {
        return { backgroundColor: '#ffffff' };
      }
      return levelTheme.backgroundImage
        ? {
            backgroundImage: `url(${levelTheme.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }
        : { backgroundColor: levelTheme.backgroundColor };
    }, [mode, levelTheme]);

    return (
      <div className={cn('w-full', className)} style={backgroundStyle}>
        {/* 顶部区域 */}
        <TopSection
          regionCode={regionCode}
          regionFlag={regionFlag}
          showWalletButton={showWalletButton}
          onWalletConnect={onWalletConnect}
          levelTheme={levelTheme}
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
