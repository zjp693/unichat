'use client';

/**
 * 排行榜领奖台组件
 *
 * 用于展示排行榜前三名用户的领奖台区域。
 * 布局为：左侧第二名、中间第一名（突出显示）、右侧第三名。
 * 每个位置使用不同的主题颜色以区分名次。
 *
 * 支持只有1人、2人的情况：
 * - 1人：只显示第1名（中间）
 * - 2人：显示第1名（中间）和第2名（左侧）
 * - 3人及以上：完整显示前三名
 */

import React from 'react';
import {
  type LeaderboardUser,
  getLevelIcon
} from '@/hooks/useReferralLeaderboard';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { IPFSImg } from '@/components/ui/ipfs-img';

/**
 * 排行榜领奖台组件属性
 * @property topUsers - 前三名用户数据数组
 */
interface InviteLeaderboardPodiumProps {
  topUsers: LeaderboardUser[];
}

export function InviteLeaderboardPodium({
  topUsers
}: InviteLeaderboardPodiumProps) {
  // 从用户数据中提取前三名
  const first = topUsers.find((u) => u.rank === 1);
  const second = topUsers.find((u) => u.rank === 2);
  const third = topUsers.find((u) => u.rank === 3);

  // 如果连第一名都没有，不渲染组件
  if (!first) return null;

  return (
    <div className="flex items-end justify-between gap-2 px-3 pt-10 pb-1">
      {/* 第二名（左侧） - 如果没有则显示占位 */}
      {second ? (
        <PodiumItem user={second} rank={2} />
      ) : (
        <div className="w-[32%]" /> // 空占位，保持布局
      )}

      {/* 第一名（中间 - 突出显示） */}
      <PodiumItem user={first} rank={1} />

      {/* 第三名（右侧） - 如果没有则显示占位 */}
      {third ? (
        <PodiumItem user={third} rank={3} />
      ) : (
        <div className="w-[32%]" /> // 空占位，保持布局
      )}
    </div>
  );
}

/**
 * 领奖台单项组件
 *
 * 用于渲染单个排名用户的卡片，包含排名图标、头像、用户名、邀请人数和等级徽章。
 *
 * @param user - 用户排行榜数据
 * @param rank - 用户排名（1-3）
 */
function PodiumItem({ user, rank }: { user: LeaderboardUser; rank: number }) {
  // 判断是否是第一名
  const isFirst = rank === 1;

  // 排名图标映射
  const rankIcon = {
    1: '/invite/first.png', // 第一名图标
    2: '/invite/second.png', // 第二名图标
    3: '/invite/thirdly.png' // 第三名图标
  }[rank];

  // 根据排名动态设置样式
  const stylesMap: Record<
    number,
    {
      bg: string; // 背景渐变色
      text: string; // 文字颜色
      avatarBorder: string; // 头像边框颜色
      badgeBg: string; // 徽章背景色
    }
  > = {
    1: {
      // 第一名：金色主题
      bg: 'bg-gradient-to-b from-amber-100 via-amber-50 to-white',
      text: 'text-amber-600',
      avatarBorder: 'border-amber-300',
      badgeBg: 'bg-amber-50'
    },
    2: {
      // 第二名：蓝色主题
      bg: 'bg-gradient-to-b from-blue-100 via-blue-50 to-white',
      text: 'text-blue-600',
      avatarBorder: 'border-blue-300',
      badgeBg: 'bg-blue-50'
    },
    3: {
      // 第三名：橙色主题
      bg: 'bg-gradient-to-b from-orange-100 via-orange-50 to-white',
      text: 'text-orange-600',
      avatarBorder: 'border-orange-300',
      badgeBg: 'bg-orange-50'
    }
  };

  // 获取当前排名对应的样式，默认使用第三名样式
  const styles = stylesMap[rank] || stylesMap[3];

  return (
    <div
      className={cn(
        'relative flex flex-col items-center w-[32%] rounded-xl p-3 pt-8',
        styles.bg,
        isFirst && 'mb-8' // 第一名向上偏移，更加突出
      )}
    >
      {/* 排名桂冠图标 - 位于卡片内部顶部 */}
      <div className="flex items-center justify-center mb-4">
        {rankIcon && (
          <Image
            src={rankIcon}
            alt={`第${rank}名`}
            width={40}
            height={40}
            className="object-contain"
          />
        )}
      </div>

      {/* 用户头像 - 方形圆角设计，使用 IPFSImg */}
      <div
        className={cn(
          'w-16 h-16 rounded-lg overflow-hidden mb-2',
          styles.avatarBorder
        )}
      >
        <IPFSImg
          src={user.avatarCid || ''}
          fallbackSrc="/me/me2.png"
          alt={user.name || '用户'}
          className="w-full h-full object-cover"
          enableLogging={false}
        />
      </div>

      {/* 用户名称 */}
      <div className="text-sm font-medium text-gray-800 line-clamp-1 mb-1">
        {user.name}
      </div>

      {/* 邀请人数 - 不使用千分位格式 */}
      <div className={cn('text-base font-bold mb-2', styles.text)}>
        {user.inviteCount}人
      </div>

      {/* 等级徽章区域 - 只在有等级时显示 */}
      {user.level && (
        <div className="mt-auto flex items-center justify-center">
          <div className="relative flex items-center">
            {/* 等级图标 */}
            <div className="relative z-10 shrink-0">
              <Image
                src={getLevelIcon(user.level)}
                alt={user.level}
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            {/* 等级文字标签 */}
            <div
              className={cn(
                'relative z-0 -ml-3 pl-4 pr-3 py-1 rounded-full text-xs font-bold shadow-sm',
                styles.badgeBg,
                styles.text
              )}
            >
              {user.level}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
