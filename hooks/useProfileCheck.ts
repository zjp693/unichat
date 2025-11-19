import { useAccount } from 'wagmi';
import {
  useHasProfile as useHasProfileBase,
  useGetProfilesOf,
  useGetProfile
} from '@/lib/UniChatProfileAbi';

/**
 * 检查当前用户是否已有 Profile
 */
export function useProfileCheck() {
  const { address, isConnected } = useAccount();

  const { data: hasProfile, isLoading } = useHasProfileBase(address);

  return {
    hasProfile: hasProfile as boolean | undefined,
    isLoading,
    isNewUser: isConnected && hasProfile === false
  };
}

/**
 * 获取当前用户的所有 Profile tokenIds
 */
export function useUserProfiles() {
  const { address, isConnected } = useAccount();

  const { data: tokenIds, isLoading } = useGetProfilesOf(address);

  const tokenIdsArray = tokenIds as bigint[] | undefined;

  return {
    tokenIds: tokenIdsArray,
    isLoading,
    hasProfiles: isConnected && tokenIdsArray && tokenIdsArray.length > 0
  };
}

/**
 * 获取指定 tokenId 的 Profile 详情
 */
export function useProfile(tokenId?: bigint) {
  const { data: profile, isLoading, refetch } = useGetProfile(tokenId);

  return {
    profile,
    isLoading,
    refetch
  };
}
