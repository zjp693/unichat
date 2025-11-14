import { useState, useEffect } from 'react';
import {
  CommunityMetadata,
  UserCommunityStatus,
  CommunityWithStatus,
  CommunitiesListResponse,
  UserStatusResponse
} from '@/lib/types/community';

/**
 * 获取所有群聊列表
 */
export function useCommunitiesList() {
  const [communities, setCommunities] = useState<CommunityMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCommunities() {
      try {
        console.log('🔍 [群聊列表] 开始获取群聊列表...');
        setIsLoading(true);
        const response = await fetch('/api/communities/list');
        const result: CommunitiesListResponse = await response.json();

        if (isCancelled) {
          console.log('⚠️ [群聊列表] 请求已取消');
          return;
        }

        console.log('📦 [群聊列表] API 返回结果:', {
          success: result.success,
          total: result.data?.total,
          communities: result.data?.communities
        });

        if (result.success && result.data) {
          console.log(
            '✅ [群聊列表] 成功获取群聊列表:',
            result.data.communities.length,
            '个群聊'
          );
          setCommunities(result.data.communities);
        } else {
          console.error('❌ [群聊列表] 获取失败:', result.error);
          setError(result.error || '获取群聊列表失败');
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('❌ [群聊列表] 网络错误:', err);
          setError(err instanceof Error ? err.message : '网络错误');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCommunities();

    return () => {
      isCancelled = true;
    };
  }, []);

  return { communities, isLoading, error };
}

/**
 * 获取用户对所有群聊的状态（资格和加入状态）
 */
export function useUserCommunityStatus(userAddress?: string) {
  const [userStatus, setUserStatus] = useState<UserCommunityStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 手动刷新函数
  const refetch = () => {
    console.log('🔄 [用户状态] 手动触发刷新');
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!userAddress) {
      console.log('⚠️ [用户状态] 未连接钱包，跳过查询');
      setUserStatus([]);
      return;
    }

    // 使用标志位防止重复请求
    let isCancelled = false;

    async function fetchUserStatus() {
      try {
        console.log('🔍 [用户状态] 开始查询用户状态:', userAddress);
        setIsLoading(true);
        const response = await fetch(
          `/api/communities/user-status?address=${userAddress}`
        );
        const result: UserStatusResponse = await response.json();

        // 如果组件已卸载或地址已变化，不更新状态
        if (isCancelled) {
          console.log('⚠️ [用户状态] 请求已取消');
          return;
        }

        console.log('📦 [用户状态] API 返回结果:', {
          success: result.success,
          communities: result.data?.communities
        });

        if (result.success && result.data) {
          console.log(
            '✅ [用户状态] 成功获取用户状态:',
            result.data.communities.length,
            '个群聊'
          );
          setUserStatus(result.data.communities);
        } else {
          console.error('❌ [用户状态] 获取失败:', result.error);
          setError(result.error || '获取用户状态失败');
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('❌ [用户状态] 网络错误:', err);
          setError(err instanceof Error ? err.message : '网络错误');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchUserStatus();

    // 清理函数：组件卸载或地址变化时取消请求
    return () => {
      isCancelled = true;
    };
  }, [userAddress, refreshTrigger]);

  return { userStatus, isLoading, error, refetch };
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
    error: communitiesError
  } = useCommunitiesList();

  const {
    userStatus,
    isLoading: isStatusLoading,
    error: statusError,
    refetch
  } = useUserCommunityStatus(userAddress);

  const [communitiesWithStatus, setCommunitiesWithStatus] = useState<
    CommunityWithStatus[]
  >([]);

  useEffect(() => {
    if (!communities.length) {
      console.log('⚠️ [合并数据] 群聊列表为空');
      setCommunitiesWithStatus([]);
      return;
    }

    // 合并数据
    const merged = communities.map((community) => {
      const status = userStatus.find(
        (s) =>
          s.communityAddress.toLowerCase() ===
          community.communityAddress.toLowerCase()
      );

      // console.log(`🔍 [合并数据] 处理群聊 ${community.name}:`, {
      //   communityAddress: community.communityAddress,
      //   hasStatus: !!status,
      //   canJoin: status?.canJoin,
      //   isJoined: status?.isJoined,
      //   hasProofData: !!status?.proofData,
      //   proofLength: status?.proofData?.proof?.length
      // });

      return {
        ...community,
        canJoin: status?.canJoin || false,
        isJoined: status?.isJoined || false,
        proofData: status?.proofData
      };
    });

    console.log('✅ [合并数据] 合并完成，总共', merged.length, '个群聊');
    console.log('   - 可加入:', merged.filter((c) => c.canJoin).length, '个');
    console.log('   - 已加入:', merged.filter((c) => c.isJoined).length, '个');
    console.log(
      '   - 无资格:',
      merged.filter((c) => !c.canJoin && !c.isJoined).length,
      '个'
    );
    setCommunitiesWithStatus(merged);
  }, [communities, userStatus]);

  return {
    communities: communitiesWithStatus,
    isLoading: isCommunitiesLoading || isStatusLoading,
    error: communitiesError || statusError,
    refetch
  };
}
