/**
 * 邀请排行榜 Hook
 *
 * 功能：
 * 1. 从合约获取排行榜数据 (getReferralLeaderboard)
 * 2. 监听 ReferralCountIncremented 事件自动刷新
 * 3. 根据邀请数量计算等级
 * 4. 支持分页
 */

import { useState, useEffect, useMemo } from 'react';
import { useReadContract, useWatchContractEvent, useChainId } from 'wagmi';
import { Address, Abi } from 'viem';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';
import RedPacketGroupViewABI from '@/contract/abi/RedPacketGroupView.json';
import { getContractAddress } from '@/lib/web3/contracts';

// ============================================
// 类型定义
// ============================================

/**
 * 链上返回的排行榜数据
 */
export type ReferralRank = {
  referrer: Address;
  count: bigint;
};

/**
 * 等级信息
 */
export type LevelInfo = {
  level: string;
  levelColor: string;
  levelBg: string;
  levelIcon: string;
};

/**
 * 排行榜用户完整信息
 */
export interface LeaderboardUser {
  rank: number;
  address: Address;
  inviteCount: number;
  // Profile 信息（可选，需要从 useBatchPeerProfiles 获取）
  name?: string;
  avatarCid?: string;
  // 等级信息（可选，邀请数<10时不显示）
  level?: string;
  levelColor?: string;
  levelBg?: string;
  levelIcon?: string;
}

// ============================================
// 等级计算
// ============================================

/**
 * 等级图标映射
 */
export const LEVEL_ICONS: Record<string, string> = {
  核心领导人: '/invite/leader.png',
  中将: '/invite/LtGen.png',
  少将: '/invite/mjGen.png',
  千夫长: '/invite/tLder.png',
  团队长: '/invite/tLder.png',
  百夫长: '/invite/centurion.png',
  班长: '/invite/SL.png'
};

/**
 * 根据邀请数量获取等级信息
 * 规则：
 * - 核心领导人: 50000+
 * - 中将: 10000+
 * - 少将: 5000+
 * - 千夫长: 1000+
 * - 团队长: 500+
 * - 百夫长: 100+
 * - 班长: 10+
 * - 不足10人: 不显示等级
 */
export function getLevelByCount(count: number): LevelInfo | null {
  if (count >= 50000) {
    return {
      level: '核心领导人',
      levelColor: 'text-amber-600',
      levelBg: 'bg-amber-50',
      levelIcon: LEVEL_ICONS['核心领导人']
    };
  }
  if (count >= 10000) {
    return {
      level: '中将',
      levelColor: 'text-blue-500',
      levelBg: 'bg-blue-50',
      levelIcon: LEVEL_ICONS['中将']
    };
  }
  if (count >= 5000) {
    return {
      level: '少将',
      levelColor: 'text-orange-400',
      levelBg: 'bg-orange-50',
      levelIcon: LEVEL_ICONS['少将']
    };
  }
  if (count >= 1000) {
    return {
      level: '千夫长',
      levelColor: 'text-pink-500',
      levelBg: 'bg-pink-100',
      levelIcon: LEVEL_ICONS['千夫长']
    };
  }
  if (count >= 500) {
    return {
      level: '团队长',
      levelColor: 'text-purple-500',
      levelBg: 'bg-purple-100',
      levelIcon: LEVEL_ICONS['团队长']
    };
  }
  if (count >= 100) {
    return {
      level: '百夫长',
      levelColor: 'text-cyan-500',
      levelBg: 'bg-cyan-100',
      levelIcon: LEVEL_ICONS['百夫长']
    };
  }
  if (count >= 10) {
    return {
      level: '班长',
      levelColor: 'text-red-400',
      levelBg: 'bg-orange-100',
      levelIcon: LEVEL_ICONS['班长']
    };
  }
  // 不足10人，不显示等级
  return null;
}

/**
 * 获取等级图标路径
 */
export function getLevelIcon(level: string): string {
  return LEVEL_ICONS[level] || '/invite/SL.png';
}

// ============================================
// 合约 ABI
// ============================================

const LEADERBOARD_ABI = RedPacketGroupABI.abi as Abi;

// ============================================
// Hook
// ============================================

/**
 * 邀请排行榜 Hook
 * @param groupAddress 群组合约地址
 * @param page 当前页码（从0开始）
 * @param pageSize 每页数量
 */
export function useReferralLeaderboard(
  groupAddress: Address | undefined,
  page: number = 0,
  pageSize: number = 20
) {
  const chainId = useChainId();
  const RED_PACKET_GROUP_VIEW_ADDRESS = getContractAddress(
    chainId,
    'redPacketGroupView'
  );
  const [shouldRefetch, setShouldRefetch] = useState(0);

  // 监听邀请计数更新事件，自动刷新
  useWatchContractEvent({
    address: groupAddress,
    abi: LEADERBOARD_ABI,
    eventName: 'ReferralCountIncremented',
    onLogs: () => {
      console.log('📊 [排行榜] 检测到邀请计数更新，刷新数据...');
      setShouldRefetch((prev) => prev + 1);
    },
    enabled: !!groupAddress
  });

  // 获取排行榜数据
  const { data, isLoading, error, refetch } = useReadContract({
    address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
    abi: RedPacketGroupViewABI.abi as Abi,
    functionName: 'getReferralLeaderboard',
    args: [groupAddress as Address, BigInt(page * pageSize), BigInt(pageSize)],
    query: {
      enabled: !!groupAddress && !!RED_PACKET_GROUP_VIEW_ADDRESS
    }
  });

  // 当事件触发时重新获取
  useEffect(() => {
    if (shouldRefetch > 0) {
      refetch();
    }
  }, [shouldRefetch, refetch]);

  // 解析数据
  const result = useMemo(() => {
    if (!data) {
      return { ranks: [] as ReferralRank[], total: 0 };
    }

    const [ranks, count] = data as [ReferralRank[], bigint];
    return {
      ranks: ranks || [],
      total: Number(count)
    };
  }, [data]);

  // 转换为 LeaderboardUser 格式（不含 Profile 信息）
  const users = useMemo(() => {
    return result.ranks.map((rank, index): LeaderboardUser => {
      const inviteCount = Number(rank.count);
      const levelInfo = getLevelByCount(inviteCount);

      return {
        rank: page * pageSize + index + 1,
        address: rank.referrer,
        inviteCount,
        // 只有 levelInfo 不为 null 时才展开
        ...(levelInfo || {})
      };
    });
  }, [result.ranks, page, pageSize]);

  // 提取所有地址（用于批量获取 Profile）
  const addresses = useMemo(() => {
    return result.ranks.map((r) => r.referrer);
  }, [result.ranks]);

  return {
    users,
    addresses,
    total: result.total,
    isLoading,
    error,
    hasMore: result.total === pageSize,
    refetch
  };
}

/**
 * 获取推荐人总数
 */
export function useReferrerListLength(groupAddress: Address | undefined) {
  const chainId = useChainId();
  const RED_PACKET_GROUP_VIEW_ADDRESS = getContractAddress(
    chainId,
    'redPacketGroupView'
  );
  return useReadContract({
    address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
    abi: RedPacketGroupViewABI.abi as Abi,
    functionName: 'referrerListLength',
    args: [groupAddress as Address],
    query: {
      enabled: !!groupAddress && !!RED_PACKET_GROUP_VIEW_ADDRESS
    }
  });
}
