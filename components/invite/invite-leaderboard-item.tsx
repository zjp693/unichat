/**
 * 排行榜列表项组件
 *
 * 用于展示排行榜中第四名及以后用户的信息，包括：
 * - 排名序号
 * - 用户头像（从IPFS加载）
 * - 用户名称和钱包地址
 * - 等级徽章和邀请人数
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
 * 排行榜列表项组件属性
 * @property user - 用户排行榜数据
 */
interface InviteLeaderboardItemProps {
  user: LeaderboardUser;
}

/**
 * 格式化地址显示（前6位...后4位）
 */
function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function InviteLeaderboardItem({ user }: InviteLeaderboardItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-none hover:bg-gray-50/50 transition-colors">
      {/* 排名序号 */}
      <div className="w-8 flex justify-center text-sm font-medium text-gray-500">
        <span>{user.rank}.</span>
      </div>

      {/* 用户头像 - 使用 IPFSImg */}
      <div className="h-10 w-10 rounded-full border border-gray-100 overflow-hidden bg-gray-100 shrink-0">
        <IPFSImg
          src={user.avatarCid || ''}
          fallbackSrc="/me/me2.png"
          alt={user.name || '用户'}
          className="w-full h-full object-cover"
          enableLogging={false}
        />
      </div>

      {/* 基本信息：用户名和钱包地址 */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-semibold text-gray-800 truncate">
          {user.name}
        </span>
        <span className="text-[10px] text-gray-400 font-mono truncate">
          {formatAddress(user.address)}
        </span>
      </div>

      {/* 统计信息和等级徽章 */}
      <div className="flex flex-col items-end gap-1">
        {/* 等级徽章和邀请人数 */}
        <div className="flex items-center justify-end">
          {/* 等级徽章 - 只在有等级时显示 */}
          {user.level && (
            <div className="relative flex items-center mr-1">
              {/* 等级图标 */}
              <div className="relative z-10 shrink-0">
                <Image
                  src={getLevelIcon(user.level)}
                  alt={user.level}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              {/* 等级文字标签 */}
              <div
                className={cn(
                  'relative z-0 -ml-3 pl-4 pr-3 py-0.5 rounded-full text-[10px] font-bold shadow-sm shadow-black/5 min-w-[3rem] text-center',
                  user.levelBg || 'bg-gray-100',
                  user.levelColor
                )}
              >
                {user.level}
              </div>
            </div>
          )}

          {/* 邀请人数 */}
          <span className="text-sm font-medium text-gray-600">
            {user.inviteCount}人
          </span>
        </div>
      </div>
    </div>
  );
}
