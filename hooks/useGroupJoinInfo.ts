'use client';

/**
 * 加入群聊信息 Hook
 *
 * 用于 /join 页面，从 URL 解析邀请码和群地址，
 * 并获取相关的群信息、代币信息、邀请人信息
 */

import { useSearchParams } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { parseAbi, formatUnits } from 'viem';
import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { useReferrerInviteCount } from '@/hooks/useReferrerInviteCount';
import { useContractAddress } from '@/lib/web3/hooks/useActiveContracts';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';
import RedPacketGroupViewABI from '@/contract/abi/RedPacketGroupView.json';

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

export function useGroupJoinInfo() {
  const searchParams = useSearchParams();
  const { address: currentUserAddress } = useAccount();

  // 从 URL 解析参数
  const referralCode = searchParams.get('code') as `0x${string}` | null;
  const groupAddress = searchParams.get('group') as `0x${string}` | null;

  // 从多链配置获取 Registry 和 View 合约地址
  const registryAddress = useContractAddress('registry');
  const RED_PACKET_GROUP_VIEW_ADDRESS =
    useContractAddress('redPacketGroupView');

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

  // 3️⃣ 获取群信息（使用 RedPacketGroupView 合约的 getGroupSettings）
  const {
    data: groupSettings,
    isLoading: isLoadingGroupName,
    isError: isGroupError
  } = useReadContract({
    address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
    abi: RedPacketGroupViewABI.abi as any,
    functionName: 'getGroupSettings',
    args: groupAddress ? [groupAddress] : undefined,
    query: { enabled: !!groupAddress && !!RED_PACKET_GROUP_VIEW_ADDRESS }
  });

  // 解析 groupSettings 数组：[groupName, economicModel, groupRules, announcement]
  const groupName = groupSettings ? (groupSettings as any)[0] : '';
  const economicModel = groupSettings ? (groupSettings as any)[1] : '';
  const groupRules = groupSettings ? (groupSettings as any)[2] : '';
  const announcement = groupSettings ? (groupSettings as any)[3] : '';

  const { data: memberCount } = useReadContract({
    address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
    abi: RedPacketGroupViewABI.abi as any,
    functionName: 'memberListLength',
    args: groupAddress ? [groupAddress] : undefined,
    query: { enabled: !!groupAddress && !!RED_PACKET_GROUP_VIEW_ADDRESS }
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

  // 6️⃣ 检查当前用户是否已是群成员（使用 RedPacketGroupView 合约）
  const { data: memberData } = useReadContract({
    address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
    abi: RedPacketGroupViewABI.abi as any,
    functionName: 'getMember',
    args:
      currentUserAddress && groupAddress
        ? [groupAddress, currentUserAddress]
        : undefined,
    query: {
      enabled:
        !!groupAddress &&
        !!currentUserAddress &&
        !!RED_PACKET_GROUP_VIEW_ADDRESS
    }
  });

  // 7️⃣ 获取邀请人在该群的邀请人数
  const { inviteCount: referrerInviteCount } = useReferrerInviteCount(
    groupAddress || undefined,
    referrerAddress as `0x${string}` | undefined
  );

  // 判断是否已是成员（memberData 是数组：[exists, joinedAt, subgroupId]）
  const isMember = memberData ? (memberData as any)[0] === true : false;

  // 格式化进群费用
  const formattedEntryFee =
    entryFeeAmount && tokenDecimals
      ? formatUnits(entryFeeAmount as bigint, tokenDecimals as number)
      : '0';

  // 加载状态：有群地址但正在查询群名称时
  const isLoading = !!groupAddress && isLoadingGroupName;

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
    referrerInviteCount,

    // 状态
    isLoading,
    isGroupError,
    isMember,
    currentUserAddress
  };
}
