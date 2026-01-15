import UniChatRegistryArtifact from '@/contract/abi/UniChatRegistry.json';
import RedPacketGroupViewABI from '@/contract/abi/RedPacketGroupView.json';
import { parseAbi } from 'viem';
import { getContractAddress } from '@/lib/web3/contracts';

// RedPacketGroup 合约的写操作 ABI（仅保留非 View 函数）
const RedPacketGroupABI = parseAbi([
  'function entryFeeAmount() view returns (uint256)',
  'function getMainRank() view returns (string)',
  'function mainOwner() view returns (address)'
]);

// RedPacketGroupView 合约的 ABI（所有 View 函数）
const ViewABI = RedPacketGroupViewABI.abi as any;

export interface RedPacketGroupMetadata {
  address: `0x${string}`;
  name: string;
  avatar: string;
  level: number;
  memberCount: number;
  fee: bigint;
  isJoined: boolean;
  /** 群消息总数 */
  mainMessageCount: number;
  /** 最后一条消息的时间戳 (秒) */
  lastMessageTimestamp: number | null;
}

/**
 * 获取所有红包群列表
 * 包含：群名、费用、等级、人数、当前用户是否已加入
 */
export async function getRedPacketGroupList(
  publicClient: any,
  registryAddress: `0x${string}`,
  userAddress?: `0x${string}`
): Promise<RedPacketGroupMetadata[]> {
  const chainId = publicClient.chain?.id;
  const RED_PACKET_GROUP_VIEW_ADDRESS = getContractAddress(
    chainId,
    'redPacketGroupView'
  );

  // 1. 获取群组总数
  const count = (await publicClient.readContract({
    address: registryAddress,
    abi: UniChatRegistryArtifact.abi as any,
    functionName: 'groupsLength',
    args: []
  })) as bigint;

  if (count === BigInt(0)) return [];

  // 2. 批量获取所有群地址 (Registry.allGroups)
  const calls: any[] = [];
  for (let i = BigInt(0); i < count; i++) {
    calls.push({
      address: registryAddress,
      abi: UniChatRegistryArtifact.abi as any,
      functionName: 'allGroups',
      args: [i]
    });
  }

  // Multicall: 获取地址列表
  let groupAddresses: `0x${string}`[];
  try {
    groupAddresses = (await publicClient.multicall({
      contracts: calls,
      allowFailure: false
    })) as `0x${string}`[];
  } catch (error) {
    console.error('[getRedPacketGroupList] 获取群地址列表失败:', error);
    return [];
  }

  // 3. 批量获取所有群的详情 (RedPacketGroupView Contract)
  // 如果群数量很大，建议分页，这里假设数量可控
  const metadataCalls: any[] = [];

  if (!RED_PACKET_GROUP_VIEW_ADDRESS) {
    console.error('[getRedPacketGroupList] View 合约地址未配置');
    return [];
  }

  groupAddresses.forEach((addr) => {
    // 3.1 获取群设置 (Name) - 使用 View 合约
    metadataCalls.push({
      address: RED_PACKET_GROUP_VIEW_ADDRESS,
      abi: ViewABI,
      functionName: 'getGroupSettings',
      args: [addr]
    });
    // 3.2 获取入群费 - 还在主合约
    metadataCalls.push({
      address: addr,
      abi: RedPacketGroupABI,
      functionName: 'entryFeeAmount'
    });
    // 3.3 获取成员数 - 使用 View 合约（注意函数名改变）
    metadataCalls.push({
      address: RED_PACKET_GROUP_VIEW_ADDRESS,
      abi: ViewABI,
      functionName: 'memberListLength',
      args: [addr]
    });
    // 3.4 获取 MainOwner - 还在主合约
    metadataCalls.push({
      address: addr,
      abi: RedPacketGroupABI,
      functionName: 'mainOwner'
    });

    // 3.5 获取消息总数 - 使用 View 合约
    metadataCalls.push({
      address: RED_PACKET_GROUP_VIEW_ADDRESS,
      abi: ViewABI,
      functionName: 'mainMessageCount',
      args: [addr]
    });

    // 3.6 检查是否已加入 - 使用 View 合约
    if (userAddress) {
      metadataCalls.push({
        address: RED_PACKET_GROUP_VIEW_ADDRESS,
        abi: ViewABI,
        functionName: 'getMember',
        args: [addr, userAddress]
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
  // 每个群有: settings, fee, memberCount, mainOwner, mainMessageCount = 5 个基础调用
  // + 1 个可选的 getMember 调用 (如果有 userAddress)
  const itemsPerGroup = userAddress ? 6 : 5;

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

    // 解析 mainMessageCount
    const msgCountRes = results[baseIndex + 4];
    const mainMessageCount =
      msgCountRes.status === 'success'
        ? Number(msgCountRes.result as bigint)
        : 0;

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
      const memberRes = results[baseIndex + 5];
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
      isJoined,
      mainMessageCount,
      lastMessageTimestamp: null // 先设为 null，后续批量获取
    });
  }

  // 5. 批量获取有消息的群的最后一条消息时间戳
  const groupsWithMessages = groups.filter((g) => g.mainMessageCount > 0);
  if (groupsWithMessages.length > 0 && RED_PACKET_GROUP_VIEW_ADDRESS) {
    // 使用 getMainMessages 获取每个群的最后一条消息
    const lastMsgCalls = groupsWithMessages.map((g) => ({
      address: RED_PACKET_GROUP_VIEW_ADDRESS,
      abi: ViewABI,
      functionName: 'getMainMessages' as const,
      args: [
        g.address,
        BigInt(g.mainMessageCount - 1), // offset: 最后一条消息的索引
        BigInt(1) // limit: 只获取1条
      ]
    }));

    const lastMsgResults = await publicClient.multicall({
      contracts: lastMsgCalls,
      allowFailure: true
    });

    // 解析最后消息时间戳
    lastMsgResults.forEach((res: any, idx: number) => {
      if (res.status === 'success') {
        // getMainMessages 返回: [messages[], count]
        // messages[] 是 Message 结构数组: {from, content, timestamp, subgroupId}
        const [messages] = res.result as [any[], bigint];
        if (messages && messages.length > 0) {
          const lastMsg = messages[0];
          const timestamp = Number(lastMsg.timestamp);
          groupsWithMessages[idx].lastMessageTimestamp = timestamp;
        }
      }
    });
  }

  // 倒序排列（最新的在最前）
  return groups.reverse();
}
