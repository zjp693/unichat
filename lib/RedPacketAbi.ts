import { useReadContract, useWriteContract, useChainId } from 'wagmi';
import { Address, Abi, getAddress } from 'viem';
import RedPacketAbiJson from '@/contract/abi/RedPacket.json';
import { getContractAddress } from '@/lib/web3/contracts';

// JSON 文件结构: { "abi": [...] }
export const RedPacketAbi = (RedPacketAbiJson as { abi: Abi }).abi;

/**
 * Hook: 获取当前链的 RedPacket 合约地址
 */
export function useRedPacketAddress(): Address | null {
  const chainId = useChainId();
  return getContractAddress(chainId, 'redPacket');
}

/**
 * 获取指定链的 RedPacket 合约地址
 * @param chainId 链 ID
 */
export function getRedPacketAddress(chainId: number): Address | null {
  return getContractAddress(chainId, 'redPacket');
}

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
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'redPacket');

  return useReadContract({
    address: address || undefined,
    abi: RedPacketAbi,
    functionName: 'getPacket',
    args: packetId !== undefined ? [packetId] : undefined,
    query: {
      enabled: packetId !== undefined && !!address,
      staleTime: 1 * 60 * 1000,
      gcTime: 10 * 60 * 1000
    }
  });
}

/**
 * 钩子: 检查用户是否已领取红包
 */
export function useHasClaimed(
  packetId: bigint | undefined,
  user: Address | undefined
) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'redPacket');

  return useReadContract({
    address: address || undefined,
    abi: RedPacketAbi,
    functionName: 'hasClaimed',
    args: packetId !== undefined && user ? [packetId, user] : undefined,
    query: {
      enabled: packetId !== undefined && !!user && !!address,
      staleTime: 1 * 60 * 1000,
      gcTime: 10 * 60 * 1000
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
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'redPacket');

  return useReadContract({
    address: address || undefined,
    abi: RedPacketAbi,
    functionName: 'getClaimRecordsPaged',
    args: packetId !== undefined ? [packetId, offset, limit] : undefined,
    query: {
      enabled: packetId !== undefined && !!address
    }
  });
}

/**
 * 钩子: 获取推荐代币地址列表（分页）
 */
export function useGetRecommendedTokensPaged(
  offset: bigint = BigInt(0),
  limit: bigint = BigInt(20)
) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'redPacket');

  return useReadContract({
    address: address || undefined,
    abi: RedPacketAbi,
    functionName: 'getRecommendedTokensPaged',
    args: [offset, limit],
    query: {
      enabled: !!address
    }
  });
}

/**
 * 钩子: 获取单个代币的推荐信息
 */
export function useGetRecommendedTokenInfo(tokenAddress: Address | undefined) {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'redPacket');

  return useReadContract({
    address: address || undefined,
    abi: RedPacketAbi,
    functionName: 'recommendedTokens',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!address
    }
  });
}

/**
 * 钩子: 获取默认过期时长
 */
export function useGetDefaultExpiryDuration() {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'redPacket');

  return useReadContract({
    address: address || undefined,
    abi: RedPacketAbi,
    functionName: 'defaultExpiryDuration',
    query: {
      enabled: !!address
    }
  });
}

/**
 * 钩子: 退款过期红包
 */
export function useRefundExpiredPacket() {
  return useWriteContract();
}

/**
 * 钩子: 推荐新代币到列表
 */
export function useRecommendToken() {
  return useWriteContract();
}
