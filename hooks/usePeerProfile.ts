import { Address } from 'viem';
import {
  useGetProfilesOf,
  useGetProfile,
  useDefaultAvatarCid
} from '@/lib/UniChatProfileAbi';
import { useMemo } from 'react';

export interface PeerProfile {
  name: string;
  avatarCid: string;
  bio: string;
  tokenId: bigint | null;
  hasProfile: boolean;
}

export function usePeerProfile(address: Address | undefined) {
  // 1. 获取用户的 Profile Token IDs
  const { data: profileIdsRaw, isLoading: isLoadingIds } =
    useGetProfilesOf(address);
  const profileIds = profileIdsRaw as bigint[];

  // 假设用户可能拥有多个 Profile，我们取第一个
  // TODO: 如果有主 Profile 逻辑，在这里添加
  const tokenId =
    profileIds && profileIds.length > 0 ? profileIds[0] : undefined;

  // 2. 获取具体 Profile 数据
  const { data: profileData, isLoading: isLoadingProfile } =
    useGetProfile(tokenId);

  // 3. 获取默认头像 CID (作为 fallback)
  const { data: defaultAvatarCidRaw } = useDefaultAvatarCid();
  const defaultAvatarCid = (defaultAvatarCidRaw as string) || '';

  const profile: PeerProfile | undefined = useMemo(() => {
    if (!address) return undefined;

    if (!tokenId || !profileData) {
      // 没有 Profile，返回默认状态
      return {
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        avatarCid: defaultAvatarCid || '',
        bio: '',
        tokenId: null,
        hasProfile: false
      };
    }

    // 解析 Profile 数据 (struct 返回通常是数组或对象，视 wagmi 版本和 ABI 而定)
    // 根据 lib/UniChatProfileAbi.ts 的类型:
    // struct ProfileView { ... }
    // wagmi readContract 返回的如果是 struct，通常是一个对象

    // 注意：具体返回值结构取决于 ABI 生成的 TypeScript 类型，这里做安全访问
    const name = (profileData as any).name || (profileData as any)[2] || '';
    const description =
      (profileData as any).description || (profileData as any)[3] || '';
    const avatarCid =
      (profileData as any).avatarCid ||
      (profileData as any)[4] ||
      defaultAvatarCid ||
      '';

    return {
      name: name || `${address.slice(0, 6)}...${address.slice(-4)}`,
      avatarCid: String(avatarCid), // 确保是 string
      bio: description,
      tokenId: tokenId,
      hasProfile: true
    };
  }, [address, tokenId, profileData, defaultAvatarCid]);

  return {
    profile,
    isLoading: isLoadingIds || (!!tokenId && isLoadingProfile),
    hasProfile: profile?.hasProfile ?? false
  };
}

export function usePeerAvatar(address: Address | undefined) {
  const { profile, isLoading } = usePeerProfile(address);
  return {
    avatarCid: profile?.avatarCid,
    avatarUrl: profile?.avatarCid, // Compatible with legacy code expecting avatarUrl
    name: profile?.name,
    profile,
    isLoading
  };
}
