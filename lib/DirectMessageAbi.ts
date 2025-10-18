import {
  useReadContract,
  useWriteContract,
  useWatchContractEvent
} from 'wagmi';
import { Address, Abi } from 'viem';
import DirectMessageAbiJson from '../contract/abi/DirectMessageAbi.json';

export const DirectMessageAbi = DirectMessageAbiJson.abi as Abi;

// DirectMessage 合约地址 (硬编码)
const DIRECT_MESSAGE_CONTRACT_ADDRESS: Address =
  '0xdDF2B78d9Cd8E2219d6a15bC9A3455f0aC056678';

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
export function useGetMessageCount(addressA: Address, addressB: Address) {
  return useReadContract({
    address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
    abi: DirectMessageAbi,
    functionName: 'messageCount',
    args: [addressA, addressB],
    query: {
      // 只有当两个地址都有效时才启用查询
      enabled: !!addressA && !!addressB
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
