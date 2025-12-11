import { useReadContract } from 'wagmi';
import { Address, Abi } from 'viem';
import communityABI from '@/contract/abi/community.json';

/**
 * 获取群聊的最后一条消息时间戳
 * 逻辑：
 * 1. 先获取消息总数 communityMessageCount
 * 2. 再获取最后一条消息 getCommunityMessage(count - 1)
 * 3. 从消息中提取时间戳 ts
 */
export function useGroupLastMessage(communityAddress: Address | undefined) {
  // 1. 获取消息总数
  const { data: messageCount, isLoading: isCountLoading } = useReadContract({
    address: communityAddress,
    abi: communityABI.abi as Abi,
    functionName: 'communityMessageCount',
    query: {
      enabled: !!communityAddress
    }
  });

  const count = messageCount as bigint | undefined;

  // 2. 获取最后一条消息
  // getCommunityMessage 返回: (sender, ts, kind, content, cid)
  const { data: lastMessageData, isLoading: isMessageLoading } =
    useReadContract({
      address: communityAddress,
      abi: communityABI.abi as Abi,
      functionName: 'getCommunityMessage',
      args: count && count > BigInt(0) ? [count - BigInt(1)] : undefined,
      query: {
        enabled: !!communityAddress && !!count && count > BigInt(0)
      }
    });

  // 解析返回数据：[sender, ts, kind, content, cid]
  const timestamp =
    lastMessageData && Array.isArray(lastMessageData)
      ? (lastMessageData[1] as bigint)
      : undefined;

  return {
    timestamp,
    messageCount: count ? Number(count) : 0,
    isLoading: isCountLoading || isMessageLoading
  };
}
