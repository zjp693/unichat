import { useParams, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Address } from '@/lib/utils';
import type { ChatType } from '@/lib/chat/types';
import type { RootState } from '@/lib/store';

/**
 * 聊天参数 Hook
 * 负责解析和管理 URL 参数
 * 群聊元信息从 Redux 读取，私聊参数从 URL 读取
 */
export function useChatParams() {
  const params = useParams();
  const searchParams = useSearchParams();

  // 基础参数
  const conversationId = (params?.id as string) || '';

  // 安全地获取 searchParams 值
  const getParam = (key: string): string | null => {
    try {
      return searchParams?.get(key) ?? null;
    } catch {
      return null;
    }
  };

  const chatType: ChatType = getParam('type') === 'group' ? 'group' : 'private';

  // 从 Redux 读取群聊元信息
  const chatMeta = useSelector(
    (state: RootState) => state.chatMeta.data[conversationId]
  );

  // 群聊参数 - 优先从 Redux 读取，兜底用默认值
  const invitedMembersMessage = getParam('invitedMembers');

  const memberCount = chatMeta?.memberCount ?? 0;

  const groupLevel = (chatMeta?.level ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;

  const groupCondition = chatMeta?.groupCondition || undefined;

  const groupName = chatMeta?.name || null;

  const groupAddress = chatMeta?.address || conversationId;

  const groupAvatar = chatMeta?.avatar || null;

  // 私聊参数
  // 验证并使用 conversationId 作为接收者地址（私聊时）
  // 群聊时使用空字符串，避免调用合约（空字符串会让钩子的 enabled 条件为 false）
  const recipientAddress: Address = (
    chatType === 'private' ? conversationId : ''
  ) as Address;

  return {
    // 基础
    conversationId,
    chatType,
    recipientAddress,
    // 群聊
    groupName,
    groupAddress,
    groupAvatar,
    memberCount,
    groupLevel,
    groupCondition,
    invitedMembersMessage,
    // 群类型 - 优先从 URL 读取（邀请链接场景），其次从 Redux 读取
    groupType:
      (getParam('groupType') as 'community' | 'redpacket') ||
      chatMeta?.groupType ||
      'community'
  };
}
