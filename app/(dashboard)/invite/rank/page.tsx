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

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { MOCK_LEADERBOARD_DATA } from '@/components/invite/data';
import { InviteLeaderboardPodium } from '@/components/invite/invite-leaderboard-podium';
import { InviteLeaderboardList } from '@/components/invite/invite-leaderboard-list';
import { InviteActionCard } from '@/components/invite/invite-action-card';
import { PageHeader } from '@/components/ui/page-header';

export default function InviteRankPage() {
  // 从 URL 获取群地址
  const searchParams = useSearchParams();
  const groupAddress = searchParams.get('group');

  // 拆分排行榜数据：前三名用于领奖台展示，其余用于列表展示
  const topUsers = MOCK_LEADERBOARD_DATA.slice(0, 3);
  const otherUsers = MOCK_LEADERBOARD_DATA.slice(3);

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

      {/* 底部固定邀请链接卡片 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <InviteActionCard
          groupAddress={groupAddress as `0x${string}` | undefined}
        />
      </div>
    </div>
  );
}
