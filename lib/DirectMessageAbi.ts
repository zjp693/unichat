import {
  useReadContract,
  useWriteContract,
  useWatchContractEvent
} from 'wagmi';
import { Address, Abi } from 'viem';
import DirectMessageAbiJson from '../contract/abi/DirectMessageAbi.json';

// JSON 文件结构: { "abi": [...] }
// 强制类型断言以处理 TypeScript 导入
export const DirectMessageAbi = (DirectMessageAbiJson as { abi: Abi }).abi;

// DirectMessage 合约地址 (从环境变量读取)
const contractAddressFromEnv =
  process.env.NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS;

if (
  !contractAddressFromEnv ||
  contractAddressFromEnv === 'NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS'
) {
  console.error(
    '❌ 错误: NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS 环境变量未正确设置！'
  );
  console.error(
    '请在 .env.local 文件中添加: NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS=0x你的合约地址'
  );
}

export const DIRECT_MESSAGE_CONTRACT_ADDRESS: Address =
  contractAddressFromEnv as Address;

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
 * @param addressA 地址 A
 * @param addressB 地址 B
 * @returns 消息总数 (bigint)
 */
export function useGetMessageCount(
  addressA: Address,
  addressB: Address,
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'messageCount',
    args: [addressA, addressB],
    query: {
      // 只有当两个地址都有效且外部条件满足时才启用查询
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!addressA &&
        !!addressB
    }
  });
}

/**
 * 钩子：分页获取指定会话的消息列表
 * @param addressA 地址 A
 * @param addressB 地址 B
 * @param start 起始下标
 * @param count 读取条数上限
 * @returns 消息列表 (DMMessage[])
 */
export function useGetMessages(
  addressA: Address,
  addressB: Address,
  start: bigint,
  count: bigint
) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'getMessages',
    args: [addressA, addressB, start, count],
    query: {
      // 只有当所有参数都有效时才启用查询
      enabled:
        !!addressA && !!addressB && start !== undefined && count !== undefined
    }
  });
}

/**
 * 钩子：发送消息
 * @returns useWriteContract 的返回值，包含 writeContract, data, isPending, error 等
 */
export function useSendMessage() {
  return useWriteContract({});
}

/**
 * 钩子：获取指定用户的通讯录（会话对端）
 * @param user 用户地址
 * @returns 对端地址列表 (Address[])
 */
export function useGetPeersOf(user: Address) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'peersOf',
    args: [user],
    query: {
      enabled: !!user
    }
  });
}

/**
 * 钩子：获取合约定义的最大消息字节数
 * @returns 最大消息字节数 (uint32)
 */
export function useMaxMessageBytes() {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'MAX_MESSAGE_BYTES'
  });
}

/**
 * 钩子：监听 MessageSent 事件
 * @param convoId 会话 ID (可选，用于过滤)
 * @param from 发送者地址 (可选，用于过滤)
 * @param to 接收者地址 (可选，用于过滤)
 * @param onLogs 事件回调函数
 * @param enabled 是否启用监听
 */
export function useListenMessageSent(
  onLogs: (logs: any[]) => void,
  enabled: boolean,
  args?: { convoId?: `0x${string}`; from?: Address; to?: Address }
) {
  useWatchContractEvent({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    eventName: 'MessageSent',
    args: args,
    onLogs: onLogs,
    enabled: enabled
  });
}

/**
 * 钩子：统计指定接收者在指定时间范围内接收的消息总数
 * @param recipient 接收者地址
 * @param startTs 开始时间戳 (uint40)
 * @param endTs 结束时间戳 (uint40)
 * @param options 可选配置项
 * @returns 消息总数 (bigint)
 */
export function useCountReceivedInRange(
  recipient: Address,
  startTs: bigint,
  endTs: bigint,
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
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
        endTs !== undefined
    }
  });
}

/**
 * 钩子：统计指定接收者和对端在指定时间范围内之间的消息数
 * @param recipient 接收者地址
 * @param peer 对端地址
 * @param startTs 开始时间戳 (uint40)
 * @param endTs 结束时间戳 (uint40)
 * @param options 可选配置项
 * @returns 消息总数 (bigint)
 */
export function useCountReceivedInRangeBetween(
  recipient: Address,
  peer: Address,
  startTs: bigint,
  endTs: bigint,
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
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
        endTs !== undefined
    }
  });
}

/**
 * 钩子：统计今天指定用户和对端之间的消息数
 * @param me 当前用户地址
 * @param peer 对端地址
 * @param options 可选配置项
 * @returns 今天的消息总数 (bigint)
 */
export function useCountReceivedTodayBetween(
  me: Address,
  peer: Address,
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'countReceivedTodayBetween',
    args: [me, peer],
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!me &&
        !!peer
    }
  });
}

/**
 * 钩子：获取指定用户的公钥
 * @param user 用户地址
 * @param options 可选配置项
 * @returns 用户的公钥字符串（如果未注册则返回空字符串）
 */
export function useGetPublicKey(
  user: Address | undefined,
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'getPublicKey',
    args: user ? [user] : undefined,
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) && !!user
    }
  });
}

/**
 * 钩子：获取指定用户的公钥或默认公钥
 * @param user 用户地址
 * @param options 可选配置项
 * @returns 用户的公钥字符串（如果未注册则返回默认公钥）
 */
export function useGetPublicKeyOrDefault(
  user: Address | undefined,
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'getPublicKeyOrDefault',
    args: user ? [user] : undefined,
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) && !!user
    }
  });
}

/**
 * 钩子：批量获取多个用户的公钥或默认公钥
 * @param users 用户地址数组
 * @param options 可选配置项
 * @returns 公钥字符串数组
 */
export function useGetPublicKeysOrDefault(
  users: Address[] | undefined,
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'getPublicKeysOrDefault',
    args: users ? [users] : undefined,
    query: {
      enabled:
        (options?.query?.enabled !== undefined
          ? options.query.enabled
          : true) &&
        !!users &&
        users.length > 0
    }
  });
}

/**
 * 钩子：注册公钥到链上
 * @returns useWriteContract 的返回值，包含 writeContract, data, isPending, error 等
 */
export function useRegisterPublicKey() {
  return useWriteContract({});
}

/**
 * 钩子：获取默认公钥
 * @returns 默认公钥字符串
 */
export function useGetDefaultPublicKey() {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'defaultPublicKey'
  });
}
