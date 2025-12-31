import { useQuery } from '@tanstack/react-query';
import {
  getRedPacketGroupList,
  RedPacketGroupMetadata
} from '@/lib/redpacket-groups/getRedPacketGroupList';
import { Address } from 'viem';

export function useRedPacketGroups(userAddress?: string) {
  console.log('[useRedPacketGroups] Hook called with address:', userAddress);
  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['redpacket-groups', userAddress],
    enabled: true, // 始终允许获取列表（即使用户未登录也能看群列表）
    queryFn: async () => {
      // 确保地址格式正确，虽然 getRedPacketGroupList 内部有处理，但这里类型转一下更安全
      const addr = userAddress?.startsWith('0x')
        ? (userAddress as Address)
        : undefined;
      return await getRedPacketGroupList(addr);
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
