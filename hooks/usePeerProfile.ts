/**
 * 获取对方用户的 Profile 信息（包含头像）
 * 使用 wagmi 的 useReadContract 自动缓存
 */

import { Address, Abi } from 'viem';
import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import {
  UNICHAT_PROFILE_ADDRESS,
  type ProfileView,
  useDefaultAvatarCid
} from '@/lib/UniChatProfileAbi';
import UniChatProfileABI from '@/contract/abi/UniChatProfile.json';
import { buildIPFSUrl } from '@/lib/ipfs-gateways';

/**
 * 获取单个对方的 Profile（两步查询）
 * @param peerAddress 对方地址
 * @returns Profile 信息（包含头像）
 */
export function usePeerProfile(peerAddress?: Address) {
  // 第一步：获取对方的 tokenId 数组
  const {
    data: tokenIds,
    isLoading: isLoadingTokenIds,
    error: tokenIdsError
  } = useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'getProfilesOf',
    args: peerAddress ? [peerAddress] : undefined,
    query: {
      enabled: !!peerAddress,
      staleTime: 24 * 60 * 60 * 1000, // 24小时内数据新鲜
      gcTime: 7 * 24 * 60 * 60 * 1000, // 缓存保留7天
      refetchOnWindowFocus: false, // 禁用窗口聚焦刷新
      refetchOnReconnect: false // 禁用重连刷新
    }
  });

  // 提取第一个 tokenId
  const firstTokenId = useMemo(() => {
    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return undefined;
    }
    return tokenIds[0] as bigint;
  }, [tokenIds]);

  // 第二步：获取 Profile 详情
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError
  } = useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'getProfile',
    args: firstTokenId !== undefined ? [firstTokenId] : undefined,
    query: {
      enabled: firstTokenId !== undefined,
      staleTime: 24 * 60 * 60 * 1000, // 24小时内数据新鲜
      gcTime: 7 * 24 * 60 * 60 * 1000, // 缓存保留7天
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  });

  return {
    profile: profile as ProfileView | undefined,
    isLoading: isLoadingTokenIds || isLoadingProfile,
    error: tokenIdsError || profileError,
    hasProfile: !!profile
  };
}

/**
 * 在组件中批量获取多个对方的 Profile
 * 注意：这个 hook 会为每个地址创建独立的查询
 * @param peerAddress 单个对方地址
 * @returns 包含头像 CID 和 URL 的简化信息
 */
export function usePeerAvatar(peerAddress?: Address) {
  const { profile, isLoading, error } = usePeerProfile(peerAddress);

  // 获取合约的默认头像 CID
  const { data: defaultAvatarCid } = useDefaultAvatarCid();

  // 获取头像 CID
  const avatarCid = useMemo(() => {
    try {
      // 如果有 Profile 且有头像，使用 Profile 头像
      if (profile && profile.avatarCid && profile.avatarCid.trim()) {
        return profile.avatarCid.trim();
      }

      // 如果没有 Profile 或没有头像，使用合约默认头像
      if (
        defaultAvatarCid &&
        typeof defaultAvatarCid === 'string' &&
        defaultAvatarCid.trim()
      ) {
        return defaultAvatarCid.trim();
      }
    } catch (err) {
      console.error('❌ [usePeerAvatar] 获取头像 CID 失败:', err);
    }

    return '';
  }, [profile, defaultAvatarCid]);

  // 构建 IPFS 头像 URL（用于向后兼容）
  const avatarUrl = useMemo(() => {
    if (avatarCid) {
      return buildIPFSUrl(avatarCid);
    }
    return '/me/me2.png';
  }, [avatarCid]);

  return {
    avatarCid,
    avatarUrl,
    name: profile?.name,
    isLoading,
    error
  };
}
