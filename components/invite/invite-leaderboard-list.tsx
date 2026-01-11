/**
 * 排行榜列表组件
 *
 * 用于展示第四名及以后的用户排行列表。
 * 遍历用户数据并使用 InviteLeaderboardItem 组件渲染每个用户。
 * 当没有用户数据时，显示空状态提示。
 */

import React from 'react';
import { type LeaderboardUser } from '@/hooks/useReferralLeaderboard';
import { InviteLeaderboardItem } from './invite-leaderboard-item';

/**
 * 排行榜列表组件属性
 * @property users - 用户排行榜数据数组（第四名及以后）
 */
interface InviteLeaderboardListProps {
  users: LeaderboardUser[];
}

export function InviteLeaderboardList({ users }: InviteLeaderboardListProps) {
  return (
    <div className="pb-4">
      {/* 用户列表容器 */}
      <div className="flex flex-col">
        {users.map((user) => (
          <InviteLeaderboardItem key={user.address} user={user} />
        ))}
      </div>

      {/* 空状态提示 */}
      {users.length === 0 && (
        <div className="py-10 text-center text-gray-400 text-sm">
          暂无更多排名数据
        </div>
      )}
    </div>
  );
}
