'use client';

/**
 * 邀请新人排行榜页面
 *
 * 该页面展示邀请新用户的排行榜，包含以下部分：
 * 1. 页眉 - 显示页面标题
 * 2. 领奖台区域 - 展示前三名用户（固定不滚动）
 * 3. 排行榜列表 - 第四名及以后的用户（可滚动）
 * 4. 底部邀请卡片 - 固定在底部的邀请链接操作区
 */

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Address } from 'viem';
import {
  useReferralLeaderboard,
  type LeaderboardUser
} from '@/hooks/useReferralLeaderboard';
import { useBatchPeerProfiles } from '@/hooks/useBatchPeerProfiles';
import { InviteLeaderboardPodium } from '@/components/invite/invite-leaderboard-podium';
import { InviteLeaderboardList } from '@/components/invite/invite-leaderboard-list';
import { InviteActionCard } from '@/components/invite/invite-action-card';
import { PageHeader } from '@/components/ui/page-header';
import { Loader2 } from 'lucide-react';

/**
 * 格式化地址显示（前6位...后4位）
 */
function formatAddress(addr: Address): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function InviteRankPage() {
  // 从 URL 获取群地址
  const searchParams = useSearchParams();
  const groupAddress = searchParams.get('group') as Address | null;

  // 获取排行榜数据（前20名）
  const { users, addresses, isLoading, error } = useReferralLeaderboard(
    groupAddress || undefined,
    0, // 第一页
    20 // 每页20条
  );

  // 批量获取用户 Profile（头像和名字）
  const { profileMap, isLoading: isLoadingProfiles } =
    useBatchPeerProfiles(addresses);

  // 组合排行榜数据：合并 Profile 信息
  const leaderboardData = useMemo((): LeaderboardUser[] => {
    return users.map((user) => {
      const profile = profileMap.get(user.address.toLowerCase());
      return {
        ...user,
        name: profile?.name || formatAddress(user.address),
        avatarCid: profile?.avatarCid || ''
      };
    });
  }, [users, profileMap]);

  // 拆分排行榜数据：前三名用于领奖台展示，其余用于列表展示
  const topUsers = leaderboardData.slice(0, 3);
  const otherUsers = leaderboardData.slice(3);

  // 加载状态
  const isPageLoading = isLoading || isLoadingProfiles;

  return (
    <div
      className="h-screen relative flex flex-col overflow-hidden"
      style={{
        background:
          'linear-gradient(to bottom, #dbccf5 0%, #dbccf5 8%, #ffffff 25%, #ffffff 100%)'
      }}
    >
      {/* 页眉区域 */}
      <PageHeader
        title="邀请新人排行榜"
        className="shrink-0 bg-[#dbccf5]/80 backdrop-blur-md"
        bordered={false}
      />

      {/* 加载状态 */}
      {isPageLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <span className="text-sm text-gray-500">加载排行榜...</span>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && !isPageLoading && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center max-w-sm">
            <p className="text-sm text-red-600">加载失败，请稍后重试</p>
          </div>
        </div>
      )}

      {/* 未提供群地址 */}
      {!groupAddress && !isPageLoading && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center max-w-sm">
            <p className="text-sm text-gray-600">请从群聊页面进入排行榜</p>
          </div>
        </div>
      )}

      {/* 空数据状态 */}
      {!isPageLoading &&
        !error &&
        groupAddress &&
        leaderboardData.length === 0 && (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <p className="text-gray-500">暂无排行数据</p>
              <p className="text-sm text-gray-400 mt-1">快去邀请好友吧！</p>
            </div>
          </div>
        )}

      {/* 有数据时展示 */}
      {!isPageLoading && !error && leaderboardData.length > 0 && (
        <>
          {/* 领奖台区域 - 固定不滚动，展示前三名用户 */}
          <div className="shrink-0">
            <InviteLeaderboardPodium topUsers={topUsers} />
          </div>

          {/* 排行榜列表区域 - 可滚动，展示第四名及以后的用户 */}
          <div className="flex-1 overflow-y-auto pb-24">
            {/* 排行榜列表（第四名及以后） */}
            <div className="px-2">
              <InviteLeaderboardList users={otherUsers} />
            </div>
          </div>
        </>
      )}

      {/* 底部固定邀请链接卡片 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <InviteActionCard
          groupAddress={groupAddress as `0x${string}` | undefined}
        />
      </div>
    </div>
  );
}
