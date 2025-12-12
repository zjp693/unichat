import { RootState } from '../store';

/**
 * 获取聊天时间戳 Map
 */
export const selectTimestampMap = (state: RootState) => state.chat.timestampMap;

/**
 * 根据时间戳对聊天列表进行排序
 * @param chats 原始聊天列表
 * @param timestampMap 时间戳 Map
 * @returns 按时间降序排列的聊天列表（最新的在前）
 */
export function sortChatsByTimestamp<T extends { id: string }>(
  chats: T[],
  timestampMap: Record<string, number>
): T[] {
  return [...chats].sort((a, b) => {
    const timeA = timestampMap[a.id] || 0;
    const timeB = timestampMap[b.id] || 0;
    // 降序排列：时间戳大的在前
    return timeB - timeA;
  });
}
