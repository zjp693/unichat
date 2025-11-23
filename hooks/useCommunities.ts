import { useQuery } from '@tanstack/react-query';
import {
  CommunityMetadata,
  UserCommunityStatus,
  CommunityWithStatus,
  CommunitiesListResponse,
  UserStatusResponse
} from '@/lib/types/community';
import { useMemo } from 'react';

/**
 * 获取所有群聊列表
 */
export function useCommunitiesList() {
  const {
    data: communities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['communities-list'],
    queryFn: async () => {
      console.log('🔍 [群聊列表] 开始获取群聊列表...');
      const response = await fetch('/api/communities/list');
      const result: CommunitiesListResponse = await response.json();

      if (result.success && result.data) {
        console.log(
          '✅ [群聊列表] 成功获取群聊列表:',
          result.data.communities.length,
          '个群聊'
        );
        return result.data.communities;
      } else {
        console.error('❌ [群聊列表] 获取失败:', result.error);
        throw new Error(result.error || '获取群聊列表失败');
      }
    },
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    refetchOnWindowFocus: false // 窗口聚焦时不自动刷新，避免频繁闪烁
  });

  return {
    communities,
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}

/**
 * 获取用户对所有群聊的状态（资格和加入状态）
 */
export function useUserCommunityStatus(userAddress?: string) {
  const {
    data: userStatus = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user-community-status', userAddress],
    queryFn: async () => {
      if (!userAddress) return [];

      console.log('🔍 [用户状态] 开始查询用户状态:', userAddress);
      const response = await fetch(
        `/api/communities/user-status?address=${userAddress}`
      );
      const result: UserStatusResponse = await response.json();

      if (result.success && result.data) {
        console.log(
          '✅ [用户状态] 成功获取用户状态:',
          result.data.communities.length,
          '个群聊'
        );
        return result.data.communities;
      } else {
        console.error('❌ [用户状态] 获取失败:', result.error);
        throw new Error(result.error || '获取用户状态失败');
      }
    },
    enabled: !!userAddress,
    staleTime: 1000 * 30 // 30秒缓存
  });

  return {
    userStatus,
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}

/**
 * 合并群聊列表和用户状态
 */
export function useCommunitiesWithStatus(userAddress?: string): {
  communities: CommunityWithStatus[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const {
    communities,
    isLoading: isCommunitiesLoading,
    error: communitiesError,
    refetch: refetchCommunities
  } = useCommunitiesList();

  const {
    userStatus,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus
  } = useUserCommunityStatus(userAddress);

  const communitiesWithStatus = useMemo(() => {
    if (!communities.length) return [];

    // 合并数据
    const merged = communities.map((community) => {
      const status = userStatus.find(
        (s) =>
          s.communityAddress.toLowerCase() ===
          community.communityAddress.toLowerCase()
      );

      return {
        ...community,
        canJoin: status?.canJoin || false,
        isJoined: status?.isJoined || false,
        proofData: status?.proofData
      };
    });

    return merged;
  }, [communities, userStatus]);

  const refetch = () => {
    refetchCommunities();
    refetchStatus();
  };

  return {
    communities: communitiesWithStatus,
    isLoading: isCommunitiesLoading || isStatusLoading,
    error: communitiesError || statusError,
    refetch
  };
}
