import { useReadContract } from 'wagmi';
import { parseAbi, Address } from 'viem';

/**
 * 获取用户在红包群的最后一次发消息时间
 * 对应合约方法: function lastMainMessageAt(address) view returns (uint64)
 */
export function useLastMainMessageAt(
  groupAddress: Address | undefined,
  userAddress: Address | undefined
) {
  const { data: timestamp, isLoading } = useReadContract({
    address: groupAddress,
    abi: parseAbi([
      'function lastMainMessageAt(address) view returns (uint64)'
    ]),
    functionName: 'lastMainMessageAt',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!groupAddress && !!userAddress,
      // 设置较短的缓存时间，以便发消息后能较快更新
      staleTime: 5_000
    }
  });

  return {
    timestamp: timestamp ? BigInt(timestamp) : undefined,
    isLoading
  };
}
