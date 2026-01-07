import { useReadContract } from 'wagmi';
import { parseAbi, Address } from 'viem';

/**
 * 获取红包群的最后一条消息时间戳
 *
 * 逻辑：
 * 1. 先获取消息总数 mainMessageCount()
 * 2. 再获取最后一条消息 mainMessages(count - 1)
 * 3. 从消息中提取时间戳 timestamp
 *
 * 注意：这与 useLastMainMessageAt 不同，后者是获取特定用户的最后发消息时间，
 * 而本 hook 是获取群里任何人的最后一条消息时间。
 */
export function useRedPacketGroupLastMessage(
  groupAddress: Address | undefined
) {
  // 1. 获取消息总数
  const { data: messageCount, isLoading: isCountLoading } = useReadContract({
    address: groupAddress,
    abi: parseAbi(['function mainMessageCount() view returns (uint256)']),
    functionName: 'mainMessageCount',
    query: {
      enabled: !!groupAddress
    }
  });

  const count = messageCount as bigint | undefined;

  // 2. 获取最后一条消息
  // mainMessages 返回: (from, content, timestamp, subgroupId)
  const { data: lastMessageData, isLoading: isMessageLoading } =
    useReadContract({
      address: groupAddress,
      abi: parseAbi([
        'function mainMessages(uint256) view returns (address from, string content, uint64 timestamp, uint32 subgroupId)'
      ]),
      functionName: 'mainMessages',
      args: count && count > BigInt(0) ? [count - BigInt(1)] : undefined,
      query: {
        enabled: !!groupAddress && !!count && count > BigInt(0)
      }
    });

  // 解析返回数据：[from, content, timestamp, subgroupId]
  // 或者可能是对象形式 { from, content, timestamp, subgroupId }
  let timestamp: bigint | undefined;

  if (lastMessageData) {
    if (Array.isArray(lastMessageData)) {
      // 数组形式
      timestamp = lastMessageData[2] as bigint;
    } else if (
      typeof lastMessageData === 'object' &&
      'timestamp' in lastMessageData
    ) {
      // 对象形式
      timestamp = (lastMessageData as { timestamp: bigint }).timestamp;
    }
  }

  return {
    timestamp,
    messageCount: count ? Number(count) : 0,
    isLoading: isCountLoading || isMessageLoading
  };
}
