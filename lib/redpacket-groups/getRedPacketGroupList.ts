import { publicClient } from '@/lib/viem';

import UniChatRegistryArtifact from '@/contract/abi/UniChatRegistry.json';
import { parseAbi } from 'viem';

// 定义 RedPacketGroup 所需的最小 ABI
const RedPacketGroupABI = parseAbi([
  'function getGroupSettings() view returns (string groupName, string economicModel, string groupRules, string announcement)',
  'function entryFeeAmount() view returns (uint256)',
  'function memberCount() view returns (uint32)',
  'function getMember(address) view returns (bool exists, uint64 joinAt, uint32 subgroupId)',
  'function getMainRank() view returns (string)',
  'function mainOwner() view returns (address)'
]);

export interface RedPacketGroupMetadata {
  address: `0x${string}`;
  name: string;
  avatar: string;
  level: number;
  memberCount: number;
  fee: bigint;
  isJoined: boolean;
}

/**
 * 获取所有红包群列表
 * 包含：群名、费用、等级、人数、当前用户是否已加入
 */
export async function getRedPacketGroupList(
  userAddress?: `0x${string}`
): Promise<RedPacketGroupMetadata[]> {
  // 1. 获取群组总数
  const count = (await publicClient.readContract({
    address: process.env
      .NEXT_PUBLIC_UNICHAT_REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
    abi: UniChatRegistryArtifact.abi as any,
    functionName: 'groupsLength',
    args: []
  })) as bigint;

  if (count === BigInt(0)) return [];

  // 2. 批量获取所有群地址 (Registry.allGroups)
  const calls: any[] = [];
  for (let i = BigInt(0); i < count; i++) {
    calls.push({
      address: process.env
        .NEXT_PUBLIC_UNICHAT_REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
      abi: UniChatRegistryArtifact.abi as any,
      functionName: 'allGroups',
      args: [i]
    });
  }

  // Multicall: 获取地址列表
  const groupAddresses = (await publicClient.multicall({
    contracts: calls,
    allowFailure: false
  })) as `0x${string}`[];

  // 3. 批量获取所有群的详情 (RedPacketGroup Contract)
  // 如果群数量很大，建议分页，这里假设数量可控
  const metadataCalls: any[] = [];

  groupAddresses.forEach((addr) => {
    // 3.1 获取群设置 (Name)
    metadataCalls.push({
      address: addr,
      abi: RedPacketGroupABI,
      functionName: 'getGroupSettings'
    });
    // 3.2 获取入群费
    metadataCalls.push({
      address: addr,
      abi: RedPacketGroupABI,
      functionName: 'entryFeeAmount'
    });
    // 3.3 获取成员数
    metadataCalls.push({
      address: addr,
      abi: RedPacketGroupABI,
      functionName: 'memberCount'
    });
    // 3.4 获取 MainOwner (用于判断创建者是否加入)
    metadataCalls.push({
      address: addr,
      abi: RedPacketGroupABI,
      functionName: 'mainOwner'
    });

    // 3.5 检查是否已加入 (如果有 userAddress)
    if (userAddress) {
      metadataCalls.push({
        address: addr,
        abi: RedPacketGroupABI,
        functionName: 'getMember',
        args: [userAddress]
      });
    }
  });

  // Multicall: 获取详情
  // allowFailure: true 避免某个合约异常导致整体失败
  const results = await publicClient.multicall({
    contracts: metadataCalls,
    allowFailure: true
  });

  // 4. 组装数据
  const groups: RedPacketGroupMetadata[] = [];
  const itemsPerGroup = userAddress ? 5 : 4; // Each group has 4 base calls + 1 conditional getMember call

  for (let i = 0; i < groupAddresses.length; i++) {
    const baseIndex = i * itemsPerGroup;
    const address = groupAddresses[i];

    // 解析 getGroupSettings
    const settingsRes = results[baseIndex];
    let name = 'Unknown Group';
    if (settingsRes.status === 'success') {
      // getGroupSettings 返回 tuple: (groupName, economicModel, groupRules, announcement)
      const [gName] = settingsRes.result as [string, string, string, string];
      name = gName || 'Unnamed Group';
    } else {
      console.warn(
        `[RedPacketGroups] Failed to get settings for ${address}`,
        settingsRes
      );
    }

    // 解析 entryFeeAmount
    const feeRes = results[baseIndex + 1];
    const fee =
      feeRes.status === 'success' ? (feeRes.result as bigint) : BigInt(0);

    // 解析 memberCount
    const membersRes = results[baseIndex + 2];
    const memberCount =
      membersRes.status === 'success' ? (membersRes.result as number) : 0;

    // 解析 mainOwner
    const ownerRes = results[baseIndex + 3];
    const mainOwner =
      ownerRes.status === 'success'
        ? (ownerRes.result as `0x${string}`)
        : undefined;

    // 解析 getMember
    let isJoined = false;

    // 如果当前用户是 BigOwner/MainOwner，默认视为已加入
    if (
      userAddress &&
      mainOwner &&
      userAddress.toLowerCase() === mainOwner.toLowerCase()
    ) {
      isJoined = true;
    } else if (userAddress) {
      const memberRes = results[baseIndex + 4];
      if (memberRes.status === 'success') {
        const [exists] = memberRes.result as [boolean, bigint, number];
        isJoined = exists;
      }
    }

    groups.push({
      address,
      name,
      avatar: '/me/me1.png', // 目前合约未存储头像，暂时使用默认值
      level: 1, // 默认给1，但在UI中会通过 flag 隐藏
      memberCount,
      fee,
      isJoined
    });
  }

  // 倒序排列（最新的在最前）
  return groups.reverse();
}
