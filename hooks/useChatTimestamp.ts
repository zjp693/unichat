import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Address } from 'viem';
import { usePeerLastMessage, formatMessageTime } from './usePeerLastMessage';
import { useGroupLastMessage } from './useGroupLastMessage';
import { useLastMainMessageAt } from './useLastMainMessageAt';
import { updateTimestamp } from '@/lib/chatSlice';
import { AppDispatch } from '@/lib/store';

interface UseChatTimestampParams {
  chatId: string;
  isGroup: boolean;
  currentAddress?: Address;
  // 群聊：是否已加入（只有加入的群才获取时间戳）
  isJoined?: boolean;
  // 群组类型：'community' | 'redpacket'
  groupType?: 'community' | 'redpacket' | string;
}

/**
 * 统一的聊天时间戳 Hook
 *
 * 功能：
 * 1. 根据聊天类型自动选择获取方式（群聊/私聊）
 * 2. 获取到时间戳后自动上报到 Redux
 * 3. 返回格式化后的时间字符串
 *
 * 使用方式：
 * const { displayTime, isLoading } = useChatTimestamp({
 *   chatId: chat.id,
 *   isGroup: chat.isGroup,
 *   currentAddress,
 *   isJoined: chat.isJoined,
 *   groupType: chat.groupType
 * });
 */
export function useChatTimestamp({
  chatId,
  isGroup,
  currentAddress,
  isJoined = true,
  groupType
}: UseChatTimestampParams) {
  const dispatch = useDispatch<AppDispatch>();

  // 私聊：获取最后消息时间戳
  const { timestamp: privateTimestamp, isLoading: isPrivateLoading } =
    usePeerLastMessage(
      !isGroup && currentAddress ? currentAddress : undefined,
      !isGroup ? (chatId as Address) : (undefined as any)
    );

  // Community 群聊：获取最后消息时间戳
  const isCommunity = isGroup && (!groupType || groupType === 'community');
  const { timestamp: communityTimestamp, isLoading: isCommunityLoading } =
    useGroupLastMessage(
      isCommunity && isJoined ? (chatId as Address) : undefined
    );

  // RedPacket 群聊：获取用户最后消息时间戳
  const isRedPacket = isGroup && groupType === 'redpacket';
  const { timestamp: redPacketTimestamp, isLoading: isRedPacketLoading } =
    useLastMainMessageAt(
      isRedPacket && isJoined ? (chatId as Address) : undefined,
      currentAddress
    );

  // 选择正确的时间戳
  let timestamp: bigint | undefined;
  let isLoading = false;

  if (!isGroup) {
    timestamp = privateTimestamp;
    isLoading = isPrivateLoading;
  } else if (isRedPacket) {
    timestamp = redPacketTimestamp;
    isLoading = isRedPacketLoading;
  } else {
    timestamp = communityTimestamp;
    isLoading = isCommunityLoading;
  }

  // 时间戳获取到后，自动上报到 Redux
  useEffect(() => {
    if (timestamp) {
      const ts = Number(timestamp);
      if (ts > 0) {
        dispatch(updateTimestamp({ chatId, timestamp: ts }));
      }
    }
  }, [chatId, timestamp, dispatch]);

  // 格式化显示时间
  const displayTime = timestamp ? formatMessageTime(timestamp) : '-';

  return {
    timestamp: timestamp ? Number(timestamp) : undefined,
    displayTime,
    isLoading
  };
}
