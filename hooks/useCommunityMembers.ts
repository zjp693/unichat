import { useReadContract } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi } from 'viem';

/**
 * 获取群聊的活跃成员数量
 * @param groupAddress 群聊合约地址
 */
export function useCommunityMembersCount(groupAddress?: string) {
  const {
    data: memberCount,
    isLoading,
    error,
    refetch
  } = useReadContract({
    address: groupAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'getActiveMembersCount',
    query: {
      enabled: !!groupAddress,
      staleTime: 1000 * 30, // 30秒缓存
      refetchInterval: 1000 * 60 // 每分钟自动刷新一次
    }
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
 */
export function useCommunityMembers(
  groupAddress?: string,
  start: number = 0,
  count: number = 100
) {
  const {
    data: members,
    isLoading,
    error,
    refetch
  } = useReadContract({
    address: groupAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'getActiveMembers',
    args: [BigInt(start), BigInt(count)],
    query: {
      enabled: !!groupAddress,
      staleTime: 1000 * 30 // 30秒缓存
    }
  });

  return {
    members: (members as string[]) || [],
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}

/**
 * 检查某个地址是否是群聊的活跃成员
 * @param groupAddress 群聊合约地址
 * @param userAddress 用户地址
 */
export function useIsActiveMember(groupAddress?: string, userAddress?: string) {
  const {
    data: isActive,
    isLoading,
    error,
    refetch
  } = useReadContract({
    address: groupAddress as `0x${string}`,
    abi: communityABI.abi as Abi,
    functionName: 'isActiveMember',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!groupAddress && !!userAddress,
      staleTime: 1000 * 30 // 30秒缓存
    }
  });

  return {
    isActive: !!isActive,
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}
