/**
 * UniChatProfile 合约 ABI 和 Hooks
 * 封装所有合约交互方法
 */

import { Address, Abi } from 'viem';
import {
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  useChainId
} from 'wagmi';

import UniChatProfileABI from '@/contract/abi/UniChatProfile.json';
import { getContractAddress } from '@/lib/web3/contracts';

// ============================================
// 多链合约地址获取
// ============================================

/**
 * Hook: 获取当前链的 Profile 合约地址
 */
export function useProfileAddress(): Address | null {
  const chainId = useChainId();
  return getContractAddress(chainId, 'profile');
}

/**
 * 获取指定链的 Profile 合约地址
 * @param chainId 链 ID
 */
export function getProfileAddress(chainId: number): Address | null {
  return getContractAddress(chainId, 'profile');
}

// ⚠️ 向后兼容：保留旧的全局常量（默认读取 Arbitrum 地址）
// 尚未迁移的文件仍依赖此常量
export const UNICHAT_PROFILE_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_PROFILE_ADDRESS_ARB as Address) ||
  ('0x0000000000000000000000000000000000000000' as Address);

// ============================================
// 类型定义
// ============================================

export interface ProfileView {
  tokenId: bigint;
  owner: Address;
  name: string;
  description: string;
  avatarCid: string;
  createdAt: bigint;
  updatedAt: bigint;
  tokenUri: string;
}

// ============================================
// 只读方法 Hooks (View Functions)
// ============================================

/**
 * 检查用户是否拥有 Profile
 */
export function useHasProfile(user?: Address) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'hasProfile',
    args: user ? [user] : undefined,
    query: {
      enabled: !!user && !!address,
      // 缓存策略优化
      staleTime: 30 * 1000, // 30秒内使用缓存，避免频繁查询
      refetchOnWindowFocus: true, // 窗口重新聚焦时重新查询
      refetchOnMount: true // 组件挂载时重新查询
    }
  });
}

/**
 * 获取用户拥有的所有 Profile tokenIds
 */
export function useGetProfilesOf(user?: Address) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'getProfilesOf',
    args: user ? [user] : undefined,
    query: {
      enabled: !!user && !!address
    }
  });
}

/**
 * 获取指定 tokenId 的 Profile 详情
 */
export function useGetProfile(tokenId?: bigint) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'getProfile',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined && !!address
    }
  });
}

/**
 * 获取 NFT 的 owner
 */
export function useOwnerOf(tokenId?: bigint) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined && !!address
    }
  });
}

/**
 * 获取用户拥有的 NFT 数量
 */
export function useBalanceOf(owner?: Address) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: {
      enabled: !!owner && !!address
    }
  });
}

/**
 * 获取 NFT 的 tokenURI
 */
export function useTokenURI(tokenId?: bigint) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined && !!address
    }
  });
}

/**
 * 获取默认头像 CID
 */
export function useDefaultAvatarCid() {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'defaultAvatarCid',
    query: {
      enabled: !!address
    }
  });
}

/**
 * 检查升级是否已被禁用
 */
export function useUpgradeDisabled() {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'upgradeDisabled',
    query: {
      enabled: !!address
    }
  });
}

/**
 * 获取合约 name
 */
export function useContractName() {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'name',
    query: {
      enabled: !!address
    }
  });
}

/**
 * 获取合约 symbol
 */
export function useContractSymbol() {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'symbol',
    query: {
      enabled: !!address
    }
  });
}

/**
 * 获取合约 owner
 */
export function useContractOwner() {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  return useReadContract({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'owner',
    query: {
      enabled: !!address
    }
  });
}

// ============================================
// 写入方法 Hook (Write Functions)
// ============================================

/**
 * 通用写入合约 Hook
 */
export function useUniChatProfileWrite() {
  return useWriteContract();
}

// ============================================
// 事件监听 Hooks
// ============================================

/**
 * 监听 ProfileMinted 事件
 */
export function useWatchProfileMinted(
  onLogs: (logs: any[]) => void,
  enabled: boolean = true
) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  useWatchContractEvent({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    eventName: 'ProfileMinted',
    onLogs,
    enabled: enabled && !!address
  });
}

/**
 * 监听 ProfileUpdated 事件
 */
export function useWatchProfileUpdated(
  onLogs: (logs: any[]) => void,
  enabled: boolean = true
) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  useWatchContractEvent({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    eventName: 'ProfileUpdated',
    onLogs,
    enabled: enabled && !!address
  });
}

/**
 * 监听 ProfileBurned 事件
 */
export function useWatchProfileBurned(
  onLogs: (logs: any[]) => void,
  enabled: boolean = true
) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  useWatchContractEvent({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    eventName: 'ProfileBurned',
    onLogs,
    enabled: enabled && !!address
  });
}

/**
 * 监听 Transfer 事件
 */
export function useWatchTransfer(
  onLogs: (logs: any[]) => void,
  enabled: boolean = true
) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'profile');

  useWatchContractEvent({
    address: address || undefined,
    abi: UniChatProfileABI.abi as Abi,
    eventName: 'Transfer',
    onLogs,
    enabled: enabled && !!address
  });
}

// ============================================
// 辅助函数 (需要动态获取地址，所以这里只提供构建参数的 helper 不是很方便，
// 因为调用者需要知道当前链的地址。建议调用者使用 useProfileAddress 获取地址后传给这些 Helper
// 或者直接在组件里构建参数
//为了保持兼容性，这里我们假设这些 helper 函数接受一个地址或者是使用旧常量兜底，
// 但 helper 函数是纯函数，没法用 hooks。
// 比较好的做法是让这些 helper 接受 address 参数。
// ============================================

// 这里为了兼容旧代码，我们依然引用全局常量，
// 但是我们应该鼓励调用者传入 address
// 检查旧代码你会发现这些 buildHelper 主要是为了方便，
// 它们内部引用了 UNICHAT_PROFILE_ADDRESS
// 我们先保持引用 UNICHAT_PROFILE_ADDRESS (Arbitrum)，如果用户切换到 opBNB，这些 write 操作可能会有问题
// 除非 writeContract 调用时覆盖 address。
// WriteContract 通常只有 abi, functionName, args。 address 是 writeContract({ address: ... }) 时传入
// 之前的 helper 返回的是 { address, abi, functionName, args }
// 所以这些 helper 是写死的地址。

// 修正方案：Helper 函数不再硬编码地址，或者接受 address 参数。
// 但修改 helper 签名会破坏旧代码。
// 我们可以改为：如果旧代码调用 buildMintProfileArgs()，它返回的是 Arbitrum 地址。
// 如果我们想支持多链，我们应该在组件层获取正确地址覆盖它，或者给 helper 加可选参数。

export function buildMintProfileArgs(
  name: string,
  description: string,
  useDefaultAvatar: boolean,
  avatarCid: string,
  tokenUri: string,
  contractAddress: Address = UNICHAT_PROFILE_ADDRESS // 新增可选参数
) {
  return {
    address: contractAddress,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'mintProfile',
    args: [name, description, useDefaultAvatar, avatarCid, tokenUri]
  };
}

export function buildUpdateProfileArgs(
  tokenId: bigint,
  newName: string,
  newDescription: string,
  newAvatarCid: string,
  newTokenUri: string,
  contractAddress: Address = UNICHAT_PROFILE_ADDRESS
) {
  return {
    address: contractAddress,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'updateProfile',
    args: [tokenId, newName, newDescription, newAvatarCid, newTokenUri]
  };
}

export function buildBurnProfileArgs(
  tokenId: bigint,
  contractAddress: Address = UNICHAT_PROFILE_ADDRESS
) {
  return {
    address: contractAddress,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'burnProfile',
    args: [tokenId]
  };
}

export function buildUseDefaultAvatarArgs(
  tokenId: bigint,
  contractAddress: Address = UNICHAT_PROFILE_ADDRESS
) {
  return {
    address: contractAddress,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'useDefaultAvatar',
    args: [tokenId]
  };
}

export function buildSetDefaultAvatarCidArgs(
  cid: string,
  contractAddress: Address = UNICHAT_PROFILE_ADDRESS
) {
  return {
    address: contractAddress,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'setDefaultAvatarCid',
    args: [cid]
  };
}

export function buildTransferFromArgs(
  from: Address,
  to: Address,
  tokenId: bigint,
  contractAddress: Address = UNICHAT_PROFILE_ADDRESS
) {
  return {
    address: contractAddress,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'transferFrom',
    args: [from, to, tokenId]
  };
}
