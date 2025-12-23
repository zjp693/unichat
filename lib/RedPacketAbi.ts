import { useReadContract, useWriteContract } from 'wagmi';
import { Address, Abi, getAddress } from 'viem';
import RedPacketAbiJson from '@/contract/abi/RedPacket.json';

// JSON 文件结构: { "abi": [...] }
export const RedPacketAbi = (RedPacketAbiJson as { abi: Abi }).abi;

// RedPacket 合约地址 (从环境变量读取)
const contractAddressFromEnv = process.env.NEXT_PUBLIC_RED_PACKET_ADDRESS;

if (
  !contractAddressFromEnv ||
  contractAddressFromEnv === 'NEXT_PUBLIC_RED_PACKET_ADDRESS'
) {
  console.error('❌ 错误: NEXT_PUBLIC_RED_PACKET_ADDRESS 环境变量未正确设置！');
  console.error(
    '请在 .env.local 文件中添加: NEXT_PUBLIC_RED_PACKET_ADDRESS=0x你的合约地址'
  );
}

export const RED_PACKET_CONTRACT_ADDRESS: Address = contractAddressFromEnv
  ? getAddress(contractAddressFromEnv)
  : (contractAddressFromEnv as Address);

// 枚举类型
export enum PacketType {
  Personal = 0,
  Group = 1
}

export enum PacketStatus {
  Active = 0,
  Exhausted = 1,
  Expired = 2,
  Refunded = 3
}

// 红包数据结构
export type RedPacket = {
  id: bigint;
  creator: Address;
  token: Address;
  totalAmount: bigint;
  distributable: bigint; // 扣税后可分配金额
  totalShares: bigint; // 总份数
  claimedShares: bigint; // 已领份数
  claimedAmount: bigint; // 已领金额
  packetType: PacketType;
  status: PacketStatus;
  createdAt: bigint;
  expiryTime: bigint;
  personalRecipient: Address; // 私聊红包的接收者
  groupContract: Address; // 群聊红包的群组合约
  isRandom: boolean; // 是否拼手气
};

// 领取记录
export type ClaimRecord = {
  claimer: Address;
  amount: bigint;
  claimedAt: bigint;
};

// 推荐代币信息
export type RecommendedTokenInfo = {
  isRecommended: boolean;
  iconCid: string;
  submitter: Address;
  stakedUnichat: bigint;
  isCore: boolean;
};

// ============= Hooks =============

/**
 * 钩子: 创建私聊红包
 */
export function useCreatePersonalPacket() {
  return useWriteContract();
}

/**
 * 钩子: 创建群聊红包
 */
export function useCreateGroupPacket() {
  return useWriteContract();
}

/**
 * 钩子: 领取私聊红包
 */
export function useClaimPersonalPacket() {
  return useWriteContract();
}

/**
 * 钩子: 领取群聊红包
 */
export function useClaimGroupPacket() {
  return useWriteContract();
}

/**
 * 钩子: 获取红包详情
 * 缓存策略：1分钟内不重新请求，缓存保留10分钟
 */
export function useGetPacket(packetId: bigint | undefined) {
  return useReadContract({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    functionName: 'getPacket',
    args: packetId !== undefined ? [packetId] : undefined,
    query: {
      enabled: packetId !== undefined,
      staleTime: 1 * 60 * 1000, // 1分钟内认为数据是新鲜的
      gcTime: 10 * 60 * 1000 // 缓存保留10分钟
    }
  });
}

/**
 * 钩子: 检查用户是否已领取红包
 * 缓存策略：1分钟内不重新请求，缓存保留10分钟
 */
export function useHasClaimed(
  packetId: bigint | undefined,
  user: Address | undefined
) {
  return useReadContract({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    functionName: 'hasClaimed',
    args: packetId !== undefined && user ? [packetId, user] : undefined,
    query: {
      enabled: packetId !== undefined && !!user,
      staleTime: 1 * 60 * 1000, // 2分钟内认为数据是新鲜的
      gcTime: 10 * 60 * 1000 // 缓存保留10分钟
    }
  });
}

/**
 * 钩子: 分页获取红包的领取记录
 */
export function useGetClaimRecordsPaged(
  packetId: bigint | undefined,
  offset: bigint,
  limit: bigint
) {
  return useReadContract({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    functionName: 'getClaimRecordsPaged',
    args: packetId !== undefined ? [packetId, offset, limit] : undefined,
    query: {
      enabled: packetId !== undefined
    }
  });
}

/**
 * 钩子: 获取推荐代币地址列表（分页）
 * @param offset 起始位置
 * @param limit 获取数量
 */
export function useGetRecommendedTokensPaged(
  offset: bigint = BigInt(0),
  limit: bigint = BigInt(20) // 默认获取 20 个，应该足够了
) {
  return useReadContract({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    functionName: 'getRecommendedTokensPaged',
    args: [offset, limit]
  });
}

/**
 * 钩子: 获取单个代币的推荐信息
 * @param tokenAddress 代币地址
 */
export function useGetRecommendedTokenInfo(tokenAddress: Address | undefined) {
  return useReadContract({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    functionName: 'recommendedTokens',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress
    }
  });
}

/**
 * 钩子: 获取默认过期时长
 */
export function useGetDefaultExpiryDuration() {
  return useReadContract({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    functionName: 'defaultExpiryDuration'
  });
}

/**
 * 钩子: 退款过期红包
 * 任何人都可以调用，资金将退回给红包创建者
 */
export function useRefundExpiredPacket() {
  return useWriteContract();
}
