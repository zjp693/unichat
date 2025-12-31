import { useReadContract, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import communityABI from '@/contract/abi/community.json';
import { Abi, parseAbi } from 'viem';

const RedPacketGroupABI = parseAbi([
  'function memberCount() view returns (uint32)',
  'function memberListLength() view returns (uint256)',
  'function getMember(address) view returns (bool exists, uint64 joinAt, uint32 subgroupId)'
]);

type GroupType = 'community' | 'redpacket';

/**
 * 获取群聊的活跃成员数量
 * @param groupAddress 群聊合约地址
 * @param groupType 群聊类型 ('community' | 'redpacket')
 */
export function useCommunityMembersCount(
  groupAddress?: string,
  groupType: GroupType = 'community'
) {
  const isRedPacket = groupType === 'redpacket';

  const {
    data: memberCount,
    isLoading,
    error,
    refetch
  } = useReadContract({
    address: groupAddress as `0x${string}`,
    abi: (isRedPacket ? RedPacketGroupABI : communityABI.abi) as any,
    functionName: isRedPacket ? 'memberCount' : 'getActiveMembersCount',
    query: {
      enabled: !!groupAddress,
      staleTime: 1000 * 30, // 30秒缓存
      refetchInterval: 1000 * 60 // 每分钟自动刷新一次
    }
  });

  // 调试日志
  console.log('[成员数量查询]', {
    groupAddress,
    groupType,
    isRedPacket,
    functionName: isRedPacket ? 'memberCount' : 'getActiveMembersCount',
    rawMemberCount: memberCount,
    parsedMemberCount: memberCount ? Number(memberCount) : 0,
    error: error?.message
  });

  return {
    memberCount: memberCount ? Number(memberCount) : 0,
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}

/**
 * 获取群聊的活跃成员列表（分页）
 * @param groupAddress 群聊合约地址
 * @param start 起始索引
 * @param count 获取数量
 * @param groupType 群聊类型
 */
export function useCommunityMembers(
  groupAddress?: string,
  start: number = 0,
  count: number = 100,
  groupType: GroupType = 'community'
) {
  const isRedPacket = groupType === 'redpacket';

  // 红包群使用 getMembers 接口
  const RedPacketMembersABI = parseAbi([
    'function getMembers(uint256 offset, uint256 limit) view returns (address[] members, uint256 count)'
  ]);

  // 红包群成员查询
  const {
    data: redPacketMembersData,
    isLoading: isRedPacketLoading,
    error: redPacketError,
    refetch: refetchRedPacket
  } = useReadContract({
    address: groupAddress as `0x${string}`,
    abi: RedPacketMembersABI,
    functionName: 'getMembers',
    args: [BigInt(start), BigInt(count)],
    query: {
      enabled: !!groupAddress && isRedPacket,
      staleTime: 1000 * 30 // 30秒缓存
    }
  });

  // 官方群成员查询
  const {
    data: communityMembers,
    isLoading: isCommunityLoading,
    error: communityError,
    refetch: refetchCommunity
  } = useReadContract({
    address: groupAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'getActiveMembers',
    args: [BigInt(start), BigInt(count)],
    query: {
      enabled: !!groupAddress && !isRedPacket,
      staleTime: 1000 * 30 // 30秒缓存
    }
  });

  // 解析红包群成员数据
  const redPacketMembers = redPacketMembersData
    ? (redPacketMembersData as [string[], bigint])[0] || []
    : [];

  return {
    members: isRedPacket
      ? redPacketMembers
      : (communityMembers as string[]) || [],
    isLoading: isRedPacket ? isRedPacketLoading : isCommunityLoading,
    error: isRedPacket
      ? redPacketError
        ? String(redPacketError)
        : null
      : communityError
        ? String(communityError)
        : null,
    refetch: isRedPacket ? refetchRedPacket : refetchCommunity
  };
}

/**
 * 检查某个地址是否是群聊的活跃成员
 * @param groupAddress 群聊合约地址
 * @param userAddress 用户地址
 * @param groupType 群聊类型
 */
export function useIsActiveMember(
  groupAddress?: string,
  userAddress?: string,
  groupType: GroupType = 'community'
) {
  const isRedPacket = groupType === 'redpacket';

  const {
    data: result,
    isLoading,
    error,
    refetch
  } = useReadContract({
    address: groupAddress as `0x${string}`,
    abi: (isRedPacket ? RedPacketGroupABI : communityABI.abi) as any,
    functionName: isRedPacket ? 'getMember' : 'isActiveMember',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!groupAddress && !!userAddress,
      staleTime: 1000 * 30 // 30秒缓存
    }
  });

  // 解析结果
  let isActive = false;
  if (isRedPacket) {
    // getMember returns (bool exists, uint64 joinAt, uint32 subgroupId)
    if (result && Array.isArray(result)) {
      isActive = Boolean(result[0]);
    }
  } else {
    isActive = !!result;
  }

  return {
    isActive,
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}

// ============ 红包群：获取所有成员（自动分页）============

/**
 * 获取红包群的所有成员（自动分页）
 * @param groupAddress 群聊合约地址
 * @param publicClient viem PublicClient
 * @returns 所有成员地址数组
 */
export async function getAllRedPacketGroupMembers(
  groupAddress: `0x${string}`,
  publicClient: any
): Promise<`0x${string}`[]> {
  if (!groupAddress || !publicClient) {
    return [];
  }

  const MembersABI = parseAbi([
    'function memberListLength() view returns (uint256)',
    'function getMembers(uint256 offset, uint256 limit) view returns (address[] members, uint256 count)'
  ]);

  try {
    // 1. 获取成员总数
    const total = (await publicClient.readContract({
      address: groupAddress,
      abi: MembersABI,
      functionName: 'memberListLength'
    })) as bigint;

    if (!total || total === 0n) {
      return [];
    }

    console.log('[getAllRedPacketGroupMembers] 成员总数:', total.toString());

    // 2. 分页获取所有成员
    const allMembers: `0x${string}`[] = [];
    const pageSize = 100n;
    let offset = 0n;

    while (offset < total) {
      const result = (await publicClient.readContract({
        address: groupAddress,
        abi: MembersABI,
        functionName: 'getMembers',
        args: [offset, pageSize]
      })) as [readonly `0x${string}`[], bigint];

      if (result && result[0] && result[0].length > 0) {
        allMembers.push(...result[0]);
        offset += BigInt(result[0].length);
        console.log(
          `[getAllRedPacketGroupMembers] 已获取 ${allMembers.length}/${total} 成员`
        );
      } else {
        break;
      }
    }

    return allMembers;
  } catch (error) {
    console.error('[getAllRedPacketGroupMembers] 获取成员失败:', error);
    return [];
  }
}

/**
 * 获取群聊所有成员的 Hook（支持红包群和官方群）
 * 红包群：使用 getMembers 自动分页
 * 官方群：使用 getActiveMembers（暂时只获取前 100 个）
 *
 * @param groupAddress 群聊合约地址
 * @param groupType 群聊类型
 */
export function useAllGroupMembers(
  groupAddress?: string,
  groupType: GroupType = 'community'
) {
  const publicClient = usePublicClient();
  const isRedPacket = groupType === 'redpacket';

  const {
    data: members = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['all-group-members', groupAddress, groupType],
    enabled: !!groupAddress && !!publicClient,
    staleTime: 1000 * 60 * 5, // 5 分钟缓存
    queryFn: async () => {
      if (!groupAddress || !publicClient) return [];

      if (isRedPacket) {
        // 红包群：自动分页获取所有成员
        return await getAllRedPacketGroupMembers(
          groupAddress as `0x${string}`,
          publicClient
        );
      } else {
        // 官方群：暂时只获取前 100 个
        const result = (await publicClient.readContract({
          address: groupAddress as `0x${string}`,
          abi: communityABI.abi as Abi,
          functionName: 'getActiveMembers',
          args: [0n, 100n]
        })) as `0x${string}`[];
        return result || [];
      }
    }
  });

  return {
    members: members as `0x${string}`[],
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}
