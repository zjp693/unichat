import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectTimestampMap,
  sortChatsByTimestamp
} from '@/lib/selectors/chatSelectors';

/**
 * 获取按时间排序后的聊天列表
 *
 * @param chats 原始聊天列表（需要有 id 字段）
 * @returns 按最后消息时间降序排列的聊天列表
 */
export function useSortedChats<T extends { id: string }>(chats: T[]): T[] {
  const timestampMap = useSelector(selectTimestampMap);

  const sortedChats = useMemo(() => {
    return sortChatsByTimestamp(chats, timestampMap);
  }, [chats, timestampMap]);

  return sortedChats;
}
