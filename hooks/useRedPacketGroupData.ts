/**
 * Red Packet Group Data Hooks
 *
 * 红包群数据查询相关的 Hooks 集合：
 * - useRedPacketGroupLastMessage: 获取红包群的最后一条消息时间戳
 * - useUnclaimedPackets: 查询用户在所有红包群的未领取红包数量
 */

import { useMemo, useEffect } from 'react';
import { useReadContract, useChainId } from 'wagmi';
import { Address, Abi } from 'viem';
import { getContractAddress } from '@/lib/web3/contracts';
import RedPacketGroupViewABI from '@/contract/abi/RedPacketGroupView.json';

// ==================== useRedPacketGroupLastMessage ====================

/**
 * 获取红包群的最后一条消息时间戳
 */
export function useRedPacketGroupLastMessage(
  groupAddress: Address | undefined,
  viewerAddress:
    | Address
    | undefined = '0x0000000000000000000000000000000000000000'
) {
  const chainId = useChainId();
  const viewAddress = getContractAddress(chainId, 'redPacketGroupView');

  // 1. 获取消息总数 - 使用 View 合约
  const { data: messageCount, isLoading: isCountLoading } = useReadContract({
    address: viewAddress ?? undefined,
    abi: RedPacketGroupViewABI.abi as Abi,
    functionName: 'mainMessageCount',
    args: groupAddress ? [groupAddress] : undefined,
    query: {
      enabled: !!groupAddress && !!viewAddress
    }
  });

  const count = messageCount as bigint | undefined;

  // 2. 获取最后一条消息 - 使用 View 合约的 getMainMessages(group, viewer, offset, limit)
  const { data: messagesResult, isLoading: isMessageLoading } = useReadContract(
    {
      address: viewAddress ?? undefined,
      abi: RedPacketGroupViewABI.abi as Abi,
      functionName: 'getMainMessages',
      args:
        groupAddress && count && count > BigInt(0)
          ? [groupAddress, viewerAddress, count - BigInt(1), BigInt(1)]
          : undefined,
      query: {
        enabled: !!groupAddress && !!viewAddress && !!count && count > BigInt(0)
      }
    }
  );

  // 解析返回数据：getMainMessages 返回 [Message[], totalCount]
  let timestamp: bigint | undefined;

  if (messagesResult && Array.isArray(messagesResult)) {
    const messages = messagesResult[0] as any[];
    if (messages && messages.length > 0) {
      const lastMsg = messages[0];
      // Message 结构 [from, content, timestamp, subgroupId]
      if (Array.isArray(lastMsg)) {
        timestamp = lastMsg[2] as bigint;
      } else if (typeof lastMsg === 'object' && 'timestamp' in lastMsg) {
        timestamp = (lastMsg as { timestamp: bigint }).timestamp;
      }
    }
  }

  return {
    timestamp,
    messageCount: count ? Number(count) : 0,
    isLoading: isCountLoading || isMessageLoading
  };
}

// ==================== useUnclaimedPackets ====================

/**
 * 未领取红包信息（合约返回的结构）
 */
export interface UnclaimedPacketInfo {
  group: Address; // 群地址
  packetId: bigint; // 红包ID
  token: Address; // 代币地址
  remainingAmount: bigint; // 剩余金额
  remainingShares: number; // 剩余份数
  createdAt: bigint; // 创建时间戳
  targetSubgroupId: number; // 目标分群ID (0=全群)
}

/**
 * Hook 返回值类型
 */
export interface UseUnclaimedPacketsResult {
  /** 群地址(小写) -> 未领取红包数量 */
  groupCounts: Record<string, number>;
  /** 未领取红包总数 */
  totalCount: number;
  /** 是否加载中 */
  isLoading: boolean;
  /** 手动刷新函数 */
  refetch: () => void;
}

/**
 * 查询用户在所有红包群的未领取红包
 *
 * @param userAddress 用户钱包地址
 * @returns 按群地址分组的未领取红包数量
 */
export function useUnclaimedPackets(
  userAddress?: Address
): UseUnclaimedPacketsResult {
  const chainId = useChainId();

  // 多链合约地址
  const registryAddress = getContractAddress(chainId, 'registry');
  const viewAddress = getContractAddress(chainId, 'redPacketGroupView');

  // 🔍 调试日志：合约地址
  // 🔍 调试日志：合约地址
  // useEffect(() => {
  //     console.log('🔵 [useUnclaimedPackets] 初始化:', {
  //         chainId,
  //         userAddress,
  //         registryAddress,
  //         viewAddress,
  //         enabled: !!userAddress && !!registryAddress && !!viewAddress
  //     });
  // }, [chainId, userAddress, registryAddress, viewAddress]);

  // 调用合约查询未领取红包
  const { data, isLoading, error, refetch } = useReadContract({
    address: viewAddress ?? undefined,
    abi: RedPacketGroupViewABI.abi as Abi,
    functionName: 'getUserAllUnclaimedPackets',
    args:
      registryAddress && userAddress
        ? [registryAddress, userAddress, 10n] // maxGroups = 10
        : undefined,
    query: {
      enabled: !!userAddress && !!registryAddress && !!viewAddress,
      refetchInterval: 30000, // 30秒自动刷新
      staleTime: 10000, // 10秒内视为新鲜数据
      gcTime: 5 * 60 * 1000 // 5分钟后清理缓存
    }
  });

  // 🔍 调试日志：合约返回数据
  // 🔍 调试日志：合约返回数据
  // useEffect(() => {
  //     console.log('🔵 [useUnclaimedPackets] 合约响应:', {
  //         isLoading,
  //         error: error?.message,
  //         data,
  //         rawPackets: (data as any)?.[0],
  //         rawTotalCount: (data as any)?.[1]
  //     });
  // }, [data, isLoading, error]);

  // 按群地址分组统计未领取红包数量
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // data 结构: [UnclaimedPacketInfo[], totalCount]
    const packets = (data as [any[], bigint] | undefined)?.[0];
    if (packets && Array.isArray(packets)) {
      packets.forEach((packet) => {
        const groupAddr = (packet.group as string).toLowerCase();
        counts[groupAddr] = (counts[groupAddr] || 0) + 1;
      });
    }
    // console.log('🔵 [useUnclaimedPackets] 分组统计结果:', counts);
    return counts;
  }, [data]);

  // 获取总数
  const totalCount = useMemo(() => {
    const count = (data as [any[], bigint] | undefined)?.[1];
    return count ? Number(count) : 0;
  }, [data]);

  return {
    groupCounts,
    totalCount,
    isLoading,
    refetch
  };
}
