import { useReadContract } from 'wagmi';
import { Address, parseAbi } from 'viem';

/**
 * 获取用户在红包群中的成员信息
 * 用于判断用户是否有分群权限
 */
export function useUserSubgroup(groupAddress?: Address, userAddress?: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: groupAddress,
    abi: parseAbi([
      'function getMember(address) view returns (bool exists, uint64 joinAt, uint32 subgroupId)'
    ]),
    functionName: 'getMember',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!groupAddress && !!userAddress
    }
  });

  // 解析返回数据
  const exists = data?.[0] ?? false;
  const joinAt = data?.[1] ?? BigInt(0);
  const subgroupId = data?.[2] ?? 0;

  return {
    /** 用户是否是群成员 */
    isMember: exists,
    /** 加入时间 */
    joinAt,
    /** 用户所属分群 ID (0 = 只在总群, >0 = 有分群) */
    subgroupId: Number(subgroupId),
    /** 用户是否有分群 */
    hasSubgroup: Number(subgroupId) > 0,
    isLoading,
    error,
    refetch
  };
}
