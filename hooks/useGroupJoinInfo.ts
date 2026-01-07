'use client';

/**
 * 加入群聊信息 Hook
 *
 * 用于 /join 页面，从 URL 解析邀请码和群地址，
 * 并获取相关的群信息、代币信息、邀请人信息
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { parseAbi, formatUnits } from 'viem';
import { usePeerAvatar } from '@/hooks/usePeerProfile';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';

// Registry ABI
const REGISTRY_ABI = parseAbi([
  'function referralExists(bytes32 code) external view returns (bool)',
  'function getReferrer(bytes32 code) external view returns (address)',
  'function getListingShareBps(bytes32 code) external view returns (uint16)'
]);

// ERC20 ABI
const ERC20_ABI = parseAbi([
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)'
]);

/**
 * 获取 Registry 合约地址
 */
function getRegistryAddress(): `0x${string}` | null {
  const address = process.env.NEXT_PUBLIC_UNICHAT_REGISTRY_CONTRACT_ADDRESS;
  if (!address) {
    console.warn('缺少环境变量: NEXT_PUBLIC_UNICHAT_REGISTRY_CONTRACT_ADDRESS');
    return null;
  }
  return address as `0x${string}`;
}

export function useGroupJoinInfo() {
  const searchParams = useSearchParams();
  const { address: currentUserAddress } = useAccount();
  const publicClient = usePublicClient();

  // 从 URL 解析参数
  const referralCode = searchParams.get('code') as `0x${string}` | null;
  const groupAddress = searchParams.get('group') as `0x${string}` | null;

  const registryAddress = getRegistryAddress();

  // 1️⃣ 验证邀请码
  const { data: codeExists } = useReadContract({
    address: registryAddress || undefined,
    abi: REGISTRY_ABI,
    functionName: 'referralExists',
    args: referralCode ? [referralCode] : undefined,
    query: { enabled: !!referralCode && !!registryAddress }
  });

  // 2️⃣ 获取推荐人地址
  const { data: referrerAddress } = useReadContract({
    address: registryAddress || undefined,
    abi: REGISTRY_ABI,
    functionName: 'getReferrer',
    args: referralCode ? [referralCode] : undefined,
    query: { enabled: !!referralCode && !!registryAddress }
  });

  // 3️⃣ 获取群信息
  const { data: groupName } = useReadContract({
    address: groupAddress || undefined,
    abi: RedPacketGroupABI.abi as any,
    functionName: 'groupName',
    query: { enabled: !!groupAddress }
  });

  const { data: memberCount } = useReadContract({
    address: groupAddress || undefined,
    abi: RedPacketGroupABI.abi as any,
    functionName: 'memberCount',
    query: { enabled: !!groupAddress }
  });

  const { data: economicModel } = useReadContract({
    address: groupAddress || undefined,
    abi: RedPacketGroupABI.abi as any,
    functionName: 'economicModel',
    query: { enabled: !!groupAddress }
  });

  const { data: groupRules } = useReadContract({
    address: groupAddress || undefined,
    abi: RedPacketGroupABI.abi as any,
    functionName: 'groupRules',
    query: { enabled: !!groupAddress }
  });

  const { data: announcement } = useReadContract({
    address: groupAddress || undefined,
    abi: RedPacketGroupABI.abi as any,
    functionName: 'announcement',
    query: { enabled: !!groupAddress }
  });

  const { data: entryFeeAmount } = useReadContract({
    address: groupAddress || undefined,
    abi: RedPacketGroupABI.abi as any,
    functionName: 'entryFeeAmount',
    query: { enabled: !!groupAddress }
  });

  const { data: groupTokenAddress } = useReadContract({
    address: groupAddress || undefined,
    abi: RedPacketGroupABI.abi as any,
    functionName: 'groupToken',
    query: { enabled: !!groupAddress }
  });

  // 4️⃣ 获取代币信息
  const { data: tokenSymbol } = useReadContract({
    address: groupTokenAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: !!groupTokenAddress }
  });

  const { data: tokenDecimals } = useReadContract({
    address: groupTokenAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!groupTokenAddress }
  });

  // 5️⃣ 获取推荐人头像和昵称
  const {
    avatarCid: referrerAvatarCid,
    avatarUrl: referrerAvatarUrl,
    name: referrerName
  } = usePeerAvatar(referrerAddress as `0x${string}` | undefined);

  // 6️⃣ 检查当前用户是否已是群成员
  const { data: memberData } = useReadContract({
    address: groupAddress || undefined,
    abi: RedPacketGroupABI.abi as any,
    functionName: 'getMember',
    args: currentUserAddress ? [currentUserAddress] : undefined,
    query: { enabled: !!groupAddress && !!currentUserAddress }
  });

  // 判断是否已是成员（memberData 是数组：[exists, joinedAt, subgroupId]）
  const isMember = memberData ? (memberData as any)[0] === true : false;

  // 格式化进群费用
  const formattedEntryFee =
    entryFeeAmount && tokenDecimals
      ? formatUnits(entryFeeAmount as bigint, tokenDecimals as number)
      : '0';

  // 加载状态
  const isLoading = !groupAddress || !groupName;

  return {
    // URL 参数
    referralCode,
    groupAddress,

    // 邀请码信息
    isValidCode: !!codeExists,
    referrerAddress: referrerAddress as `0x${string}` | undefined,

    // 群信息
    groupName: (groupName as string) || '',
    memberCount: Number(memberCount || 0),
    economicModel: (economicModel as string) || '',
    groupRules: (groupRules as string) || '',
    announcement: (announcement as string) || '',

    // 代币信息
    groupTokenAddress: groupTokenAddress as `0x${string}` | undefined,
    tokenSymbol: (tokenSymbol as string) || 'TOKEN',
    tokenDecimals: Number(tokenDecimals || 18),
    entryFeeAmount: entryFeeAmount as bigint | undefined,
    formattedEntryFee,

    // 推荐人信息
    referrerName: referrerName || referrerAddress?.slice(0, 6) || '未知',
    referrerAvatar: referrerAvatarUrl,
    referrerInviteCount: 0, // TODO: 实现真实查询

    // 状态
    isLoading,
    isMember,
    currentUserAddress
  };
}
