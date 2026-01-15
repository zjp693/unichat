import { useQuery } from '@tanstack/react-query';
import {
  getRedPacketGroupList,
  RedPacketGroupMetadata
} from '@/lib/redpacket-groups/getRedPacketGroupList';
import { Address } from 'viem';
import { useChainId, usePublicClient } from 'wagmi';
import { getContractAddress } from '@/lib/web3/contracts';

export function useRedPacketGroups(userAddress?: string) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  // 注意：getContractAddress 返回 null 如果 chainId 不支持。
  // 我们提供一个 fallback 或者在 queryFn 中检查。
  const registryAddress = getContractAddress(chainId, 'registry');

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['redpacket-groups', userAddress, chainId], // 添加 chainId 到 key
    enabled: !!registryAddress && !!publicClient, // 只有拿到地址和client才查询
    queryFn: async () => {
      // 确保地址格式正确，虽然 getRedPacketGroupList 内部有处理，但这里类型转一下更安全
      const addr = userAddress?.startsWith('0x')
        ? (userAddress as Address)
        : undefined;

      if (!registryAddress || !publicClient) {
        return [];
      }

      return await getRedPacketGroupList(publicClient, registryAddress, addr);
    },
    staleTime: 1000 * 30, // 30秒缓存，确保新创建的群能较快显示
    refetchOnWindowFocus: true
  });

  return {
    groups,
    isLoading,
    isRefetching,
    error,
    refetch
  };
}
