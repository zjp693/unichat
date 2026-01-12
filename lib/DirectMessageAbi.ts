import {
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  useChainId
} from 'wagmi';
import { Address, Abi, getAddress } from 'viem';
import DirectMessageAbiJson from '../contract/abi/DirectMessageAbi.json';
import { getContractAddress } from '@/lib/web3/contracts';

// JSON 文件结构: { "abi": [...] }
// 强制类型断言以处理 TypeScript 导入
export const DirectMessageAbi = (DirectMessageAbiJson as { abi: Abi }).abi;

/**
 * Hook: 获取当前链的 DirectMessage 合约地址
 */
export function useDirectMessageAddress(): Address | null {
  const chainId = useChainId();
  return getContractAddress(chainId, 'directMessage');
}

/**
 * 获取指定链的 DirectMessage 合约地址
 * @param chainId 链 ID
 */
export function getDirectMessageAddress(chainId: number): Address | null {
  return getContractAddress(chainId, 'directMessage');
}

// ⚠️ 向后兼容：保留旧的全局常量（默认读取 Arbitrum 地址）
// 尚未迁移的文件仍依赖此常量
export const DIRECT_MESSAGE_CONTRACT_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_DIRECT_MESSAGE_ADDRESS_ARB as Address) ||
  ('0x0000000000000000000000000000000000000000' as Address);

// 1. 定义数据类型
export type DMMessage = {
  sender: Address;
  recipient: Address;
  timestamp: bigint;
  content: string;
};

// 2. 封装合约交互函数 (使用 Wagmi Hooks)

/**
 * 钩子：获取指定会话的消息总数
 */
export function useGetMessageCount(
  addressA: Address,
  addressB: Address,
  options?: { query?: { enabled?: boolean } }
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'messageCount',
    args: [addressA, addressB],
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!addressA &&
        !!addressB &&
        !!contractAddress,
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false
    }
  });
}

/**
 * 钩子：分页获取指定会话的消息列表
 */
export function useGetMessages(
  addressA: Address,
  addressB: Address,
  start: bigint,
  count: bigint
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'getMessages',
    args: [addressA, addressB, start, count],
    query: {
      enabled:
        !!addressA &&
        !!addressB &&
        start !== undefined &&
        count !== undefined &&
        !!contractAddress,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  });
}

/**
 * 钩子：发送消息
 */
export function useSendMessage() {
  return useWriteContract({});
}

/**
 * 钩子：获取指定用户的通讯录（会话对端）
 */
export function useGetPeersOf(user: Address) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'peersOf',
    args: [user],
    query: {
      enabled: !!user && !!contractAddress
    }
  });
}

/**
 * 钩子：获取合约定义的最大消息字节数
 */
export function useMaxMessageBytes() {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'MAX_MESSAGE_BYTES',
    query: {
      enabled: !!contractAddress
    }
  });
}

/**
 * 钩子：监听 MessageSent 事件
 */
export function useListenMessageSent(
  onLogs: (logs: any[]) => void,
  enabled: boolean,
  args?: { convoId?: `0x${string}`; from?: Address; to?: Address }
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  useWatchContractEvent({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    eventName: 'MessageSent',
    args: args,
    onLogs: onLogs,
    enabled: enabled && !!contractAddress
  });
}

/**
 * 钩子：统计指定接收者在指定时间范围内接收的消息总数
 */
export function useCountReceivedInRange(
  recipient: Address,
  startTs: bigint,
  endTs: bigint,
  options?: { query?: { enabled?: boolean } }
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'countReceivedInRange',
    args: [recipient, startTs, endTs],
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!recipient &&
        startTs !== undefined &&
        endTs !== undefined &&
        !!contractAddress
    }
  });
}

/**
 * 钩子：统计指定接收者和对端在指定时间范围内之间的消息数
 */
export function useCountReceivedInRangeBetween(
  recipient: Address,
  peer: Address,
  startTs: bigint,
  endTs: bigint,
  options?: { query?: { enabled?: boolean } }
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'countReceivedInRangeBetween',
    args: [recipient, peer, startTs, endTs],
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!recipient &&
        !!peer &&
        startTs !== undefined &&
        endTs !== undefined &&
        !!contractAddress
    }
  });
}

/**
 * 钩子：统计今天指定用户和对端之间的消息数
 */
export function useCountReceivedTodayBetween(
  me: Address,
  peer: Address,
  options?: { query?: { enabled?: boolean } }
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'countReceivedTodayBetween',
    args: [me, peer],
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!me &&
        !!peer &&
        !!contractAddress
    }
  });
}

/**
 * 钩子：获取指定用户的公钥
 */
export function useGetPublicKey(
  user: Address | undefined,
  options?: { query?: { enabled?: boolean } }
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'getPublicKey',
    args: user ? [user] : undefined,
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!user &&
        !!contractAddress
    }
  });
}

/**
 * 钩子：获取指定用户的公钥或默认公钥
 */
export function useGetPublicKeyOrDefault(
  user: Address | undefined,
  options?: { query?: { enabled?: boolean } }
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'getPublicKeyOrDefault',
    args: user ? [user] : undefined,
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!user &&
        !!contractAddress
    }
  });
}

/**
 * 钩子：批量获取多个用户的公钥或默认公钥
 */
export function useGetPublicKeysOrDefault(
  users: Address[] | undefined,
  options?: { query?: { enabled?: boolean } }
) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'getPublicKeysOrDefault',
    args: users ? [users] : undefined,
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!users &&
        users.length > 0 &&
        !!contractAddress
    }
  });
}

/**
 * 钩子：注册公钥到链上
 */
export function useRegisterPublicKey() {
  return useWriteContract({});
}

/**
 * 钩子：获取默认公钥
 */
export function useGetDefaultPublicKey() {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'directMessage');

  return useReadContract({
    address: contractAddress || undefined,
    abi: DirectMessageAbi,
    functionName: 'defaultPublicKey',
    query: {
      enabled: !!contractAddress
    }
  });
}
