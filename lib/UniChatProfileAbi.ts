/**
 * UniChatProfile 合约 ABI 和 Hooks
 * 封装所有合约交互方法
 */

import { Address, Abi } from 'viem';
import {
  useReadContract,
  useWriteContract,
  useWatchContractEvent
} from 'wagmi';

import UniChatProfileABI from '@/contract/abi/UniChatProfile.json';

// ============================================
// 合约地址配置
// ============================================

const contractAddressFromEnv = process.env.NEXT_PUBLIC_UNICHAT_PROFILE_ADDRESS;

if (
  !contractAddressFromEnv ||
  contractAddressFromEnv === 'NEXT_PUBLIC_UNICHAT_PROFILE_ADDRESS'
) {
  console.error(
    '❌ 错误: NEXT_PUBLIC_UNICHAT_PROFILE_ADDRESS 环境变量未正确设置！'
  );
  console.error(
    '请在 .env.local 文件中添加: NEXT_PUBLIC_UNICHAT_PROFILE_ADDRESS=0x你的合约地址'
  );
}

export const UNICHAT_PROFILE_ADDRESS: Address =
  contractAddressFromEnv as Address;

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
 * @param user 用户地址
 */
export function useHasProfile(user?: Address) {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'hasProfile',
    args: user ? [user] : undefined,
    query: {
      enabled: !!user
    }
  });
}

/**
 * 获取用户拥有的所有 Profile tokenIds
 * @param user 用户地址
 */
export function useGetProfilesOf(user?: Address) {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'getProfilesOf',
    args: user ? [user] : undefined,
    query: {
      enabled: !!user
    }
  });
}

/**
 * 获取指定 tokenId 的 Profile 详情
 * @param tokenId Profile NFT 的 tokenId
 */
export function useGetProfile(tokenId?: bigint) {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'getProfile',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined
    }
  });
}

/**
 * 获取 NFT 的 owner
 * @param tokenId NFT tokenId
 */
export function useOwnerOf(tokenId?: bigint) {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined
    }
  });
}

/**
 * 获取用户拥有的 NFT 数量
 * @param owner 用户地址
 */
export function useBalanceOf(owner?: Address) {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: {
      enabled: !!owner
    }
  });
}

/**
 * 获取 NFT 的 tokenURI
 * @param tokenId NFT tokenId
 */
export function useTokenURI(tokenId?: bigint) {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined
    }
  });
}

/**
 * 获取默认头像 CID
 */
export function useDefaultAvatarCid() {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'defaultAvatarCid'
  });
}

/**
 * 检查升级是否已被禁用
 */
export function useUpgradeDisabled() {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'upgradeDisabled'
  });
}

/**
 * 获取合约 name
 */
export function useContractName() {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'name'
  });
}

/**
 * 获取合约 symbol
 */
export function useContractSymbol() {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'symbol'
  });
}

/**
 * 获取合约 owner
 */
export function useContractOwner() {
  return useReadContract({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'owner'
  });
}

// ============================================
// 写入方法 Hook (Write Functions)
// ============================================

/**
 * 通用写入合约 Hook
 * 用于所有写入操作：mintProfile, updateProfile, burnProfile 等
 */
export function useUniChatProfileWrite() {
  return useWriteContract();
}

// ============================================
// 事件监听 Hooks
// ============================================

/**
 * 监听 ProfileMinted 事件
 * @param onLogs 事件回调
 */
export function useWatchProfileMinted(
  onLogs: (logs: any[]) => void,
  enabled: boolean = true
) {
  useWatchContractEvent({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    eventName: 'ProfileMinted',
    onLogs,
    enabled
  });
}

/**
 * 监听 ProfileUpdated 事件
 * @param onLogs 事件回调
 */
export function useWatchProfileUpdated(
  onLogs: (logs: any[]) => void,
  enabled: boolean = true
) {
  useWatchContractEvent({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    eventName: 'ProfileUpdated',
    onLogs,
    enabled
  });
}

/**
 * 监听 ProfileBurned 事件
 * @param onLogs 事件回调
 */
export function useWatchProfileBurned(
  onLogs: (logs: any[]) => void,
  enabled: boolean = true
) {
  useWatchContractEvent({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    eventName: 'ProfileBurned',
    onLogs,
    enabled
  });
}

/**
 * 监听 Transfer 事件 (ERC721)
 * @param onLogs 事件回调
 */
export function useWatchTransfer(
  onLogs: (logs: any[]) => void,
  enabled: boolean = true
) {
  useWatchContractEvent({
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    eventName: 'Transfer',
    onLogs,
    enabled
  });
}

// ============================================
// 辅助函数
// ============================================

/**
 * 构建 mintProfile 参数
 */
export function buildMintProfileArgs(
  name: string,
  description: string,
  useDefaultAvatar: boolean,
  avatarCid: string,
  tokenUri: string
) {
  return {
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'mintProfile',
    args: [name, description, useDefaultAvatar, avatarCid, tokenUri]
  };
}

/**
 * 构建 updateProfile 参数
 */
export function buildUpdateProfileArgs(
  tokenId: bigint,
  newName: string,
  newDescription: string,
  newAvatarCid: string,
  newTokenUri: string
) {
  return {
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'updateProfile',
    args: [tokenId, newName, newDescription, newAvatarCid, newTokenUri]
  };
}

/**
 * 构建 burnProfile 参数
 */
export function buildBurnProfileArgs(tokenId: bigint) {
  return {
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'burnProfile',
    args: [tokenId]
  };
}

/**
 * 构建 useDefaultAvatar 参数
 */
export function buildUseDefaultAvatarArgs(tokenId: bigint) {
  return {
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'useDefaultAvatar',
    args: [tokenId]
  };
}

/**
 * 构建 setDefaultAvatarCid 参数 (仅 owner)
 */
export function buildSetDefaultAvatarCidArgs(cid: string) {
  return {
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'setDefaultAvatarCid',
    args: [cid]
  };
}

/**
 * 构建 transferFrom 参数
 */
export function buildTransferFromArgs(
  from: Address,
  to: Address,
  tokenId: bigint
) {
  return {
    address: UNICHAT_PROFILE_ADDRESS,
    abi: UniChatProfileABI.abi as Abi,
    functionName: 'transferFrom',
    args: [from, to, tokenId]
  };
}
