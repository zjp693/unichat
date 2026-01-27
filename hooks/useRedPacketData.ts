/**
 * Red Packet Data Hooks (Private Chat & Community)
 *
 * 私聊和官方群红包数据查询相关的 Hooks：
 * - useUnclaimedPackets: 查询用户在私聊和官方群的未领取红包
 */

import { useMemo, useEffect } from 'react';
import { useReadContract, useChainId } from 'wagmi';
import { Address, Abi } from 'viem';
import { getContractAddress } from '@/lib/web3/contracts';
import RedPacketABI from '@/contract/abi/RedPacket.json';

// ==================== useUnclaimedPackets ====================

/**
 * 未领取红包信息（合约返回的结构）
 */
export interface UnclaimedPacketInfo {
  packetId: bigint; // 红包ID
  packetType: 0 | 1; // 0=私聊, 1=官方群
  chatContext: Address; // 私聊=对方地址, 群=群合约地址
}

/**
 * Hook 返回值类型
 */
export interface UseUnclaimedPacketsResult {
  /** 聊天地址(小写) -> 未领取红包数量 */
  chatPacketCounts: Record<string, number>;
  /** 未领取红包总数 */
  totalCount: number;
  /** 是否加载中 */
  isLoading: boolean;
  /** 手动刷新函数 */
  refetch: () => void;
}

/**
 * 查询用户在私聊和官方群的未领取红包
 *
 * @param userAddress 用户钱包地址
 * @param maxResults 最多返回多少个聊天（默认10）
 * @returns 按聊天地址分组的未领取红包信息
 */
export function useUnclaimedPackets(
  userAddress?: Address,
  maxResults: bigint = 10n
): UseUnclaimedPacketsResult {
  const chainId = useChainId();
  const redPacketAddress = getContractAddress(chainId, 'redPacket');

  // 🔍 调试日志：合约地址
  // 🔍 调试日志：合约地址
  // useEffect(() => {
  //     console.log('🟢 [useUnclaimedPackets] 初始化:', {
  //         chainId,
  //         userAddress,
  //         redPacketAddress,
  //         enabled: !!userAddress && !!redPacketAddress
  //     });
  // }, [chainId, userAddress, redPacketAddress]);

  // 调用合约查询未领取红包
  const { data, isLoading, error, refetch } = useReadContract({
    address: redPacketAddress ?? undefined,
    abi: RedPacketABI.abi as Abi,
    functionName: 'getUnclaimedPacketsByChat',
    args: userAddress ? [userAddress, maxResults] : undefined,
    query: {
      enabled: !!userAddress && !!redPacketAddress,
      refetchInterval: 30000, // 30秒自动刷新
      staleTime: 10000, // 10秒内视为新鲜数据
      gcTime: 5 * 60 * 1000 // 5分钟后清理缓存
    }
  });

  // 🔍 调试日志：合约返回数据
  // 🔍 调试日志：合约返回数据
  // useEffect(() => {
  //     console.log('🟢 [useUnclaimedPackets] 合约响应:', {
  //         isLoading,
  //         error: error?.message,
  //         data,
  //         packetsCount: Array.isArray(data) ? data.length : 0
  //     });
  // }, [data, isLoading, error]);

  // 按聊天地址分组统计未领取红包数量
  const chatPacketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const packets = data as UnclaimedPacketInfo[] | undefined;

    if (packets && Array.isArray(packets)) {
      packets.forEach((packet) => {
        const chatAddr = packet.chatContext.toLowerCase();
        // 累加统计每个聊天的红包数量
        counts[chatAddr] = (counts[chatAddr] || 0) + 1;
      });
    }
    return counts;
  }, [data]);

  // 获取总数
  const totalCount = useMemo(() => {
    const packets = data as UnclaimedPacketInfo[] | undefined;
    return packets ? packets.length : 0;
  }, [data]);

  return {
    chatPacketCounts,
    totalCount,
    isLoading,
    refetch
  };
}
