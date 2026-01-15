import { useQuery } from '@tanstack/react-query';
import { useChainId } from 'wagmi';
import { CommunityWithStatus, UserStatusResponse } from '@/lib/types/community';

/**
 * 获取群聊列表和用户状态（合并为单一 API 调用）
 * 优化：只调用 user-status API，它返回完整数据
 */
export function useCommunitiesWithStatus(userAddress?: string): {
  communities: CommunityWithStatus[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const chainId = useChainId();

  const {
    data: communities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['communities-with-status', userAddress, chainId],
    queryFn: async () => {
      if (!userAddress) return [];

      console.log('🔍 [群聊列表] 开始获取群聊列表和用户状态...', { chainId });
      const response = await fetch(
        `/api/communities/user-status?address=${userAddress}&chainId=${chainId}`
      );
      const result: UserStatusResponse = await response.json();

      if (result.success && result.data) {
        console.log(
          '✅ [群聊列表] 成功获取:',
          result.data.communities.length,
          '个群聊'
        );
        return result.data.communities as CommunityWithStatus[];
      } else {
        console.error('❌ [群聊列表] 获取失败:', result.error);
        throw new Error(result.error || '获取群聊列表失败');
      }
    },
    enabled: !!userAddress,
    staleTime: 1000 * 30, // 30秒缓存
    refetchOnWindowFocus: false
  });

  return {
    communities,
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}
