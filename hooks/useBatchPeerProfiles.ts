/**
 * 批量获取多个用户的 Profile
 * 使用 wagmi 的 useReadContracts 批量读取，显著减少 RPC 调用
 */

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { Address, Abi } from 'viem';
import {
  UNICHAT_PROFILE_ADDRESS,
  type ProfileView
} from '@/lib/UniChatProfileAbi';
import UniChatProfileABI from '@/contract/abi/UniChatProfile.json';

// ============================================================
// 辅助函数
// ============================================================

/**
 * 过滤有效地址并去重
 */
function dedupeAddresses(addresses: Address[]): Address[] {
  const seen = new Set<string>();
  return addresses.filter((addr) => {
    if (!addr || seen.has(addr.toLowerCase())) return false;
    seen.add(addr.toLowerCase());
    return true;
  });
}

// ============================================================
// 子 Hooks
// ============================================================

/**
 * 批量获取用户的 tokenId
 */
function useBatchTokenIds(addresses: Address[]) {
  const contracts = useMemo(
    () =>
      addresses.map((addr) => ({
        address: UNICHAT_PROFILE_ADDRESS,
        abi: UniChatProfileABI.abi as Abi,
        functionName: 'getProfilesOf' as const,
        args: [addr]
      })),
    [addresses]
  );

  const { data: results, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: addresses.length > 0,
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  });

  // 构建 address -> tokenId 映射
  const tokenIdMap = useMemo(() => {
    const map = new Map<string, bigint>();
    if (!results) return map;

    addresses.forEach((addr, index) => {
      const result = results[index];
      if (result?.status === 'success' && Array.isArray(result.result)) {
        const tokenIds = result.result as bigint[];
        if (tokenIds.length > 0) {
          map.set(addr.toLowerCase(), tokenIds[0]);
        }
      }
    });
    return map;
  }, [addresses, results]);

  return { tokenIdMap, isLoading };
}

/**
 * 批量获取 Profile 详情
 */
function useBatchProfiles(
  addresses: Address[],
  tokenIdMap: Map<string, bigint>
) {
  // 只查询有 tokenId 的地址
  const addressesWithTokenId = useMemo(
    () => addresses.filter((addr) => tokenIdMap.has(addr.toLowerCase())),
    [addresses, tokenIdMap]
  );

  const contracts = useMemo(
    () =>
      addressesWithTokenId.map((addr) => ({
        address: UNICHAT_PROFILE_ADDRESS,
        abi: UniChatProfileABI.abi as Abi,
        functionName: 'getProfile' as const,
        args: [tokenIdMap.get(addr.toLowerCase())!]
      })),
    [addressesWithTokenId, tokenIdMap]
  );

  const { data: results, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  });

  // 构建 address -> Profile 映射
  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileView>();
    if (!results) return map;

    addressesWithTokenId.forEach((addr, index) => {
      const result = results[index];
      if (result?.status === 'success' && result.result) {
        map.set(addr.toLowerCase(), result.result as ProfileView);
      }
    });
    return map;
  }, [addressesWithTokenId, results]);

  return { profileMap, isLoading };
}

// ============================================================
// 主 Hook
// ============================================================

/**
 * 批量获取多个用户的 Profile
 * @param addresses 用户地址数组
 * @returns profileMap: 地址 -> Profile 的映射
 */
export function useBatchPeerProfiles(addresses: Address[]) {
  // 1. 预处理：过滤并去重
  const validAddresses = useMemo(() => dedupeAddresses(addresses), [addresses]);

  // 2. 第一步：批量获取 tokenId
  const { tokenIdMap, isLoading: isLoadingTokenIds } =
    useBatchTokenIds(validAddresses);

  // 3. 第二步：批量获取 Profile
  const { profileMap, isLoading: isLoadingProfiles } = useBatchProfiles(
    validAddresses,
    tokenIdMap
  );

  return {
    profileMap,
    isLoading: isLoadingTokenIds || isLoadingProfiles
  };
}
