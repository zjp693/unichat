import { useParams, useSearchParams } from 'next/navigation';
import { Address } from '@/lib/utils';
import type { ChatType } from '@/lib/chat/types';

/**
 * 聊天参数 Hook
 * 负责解析和管理 URL 参数
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

  // 群聊参数
  const invitedMembersMessage = getParam('invitedMembers');

  const memberCount = parseInt(getParam('memberCount') || '0', 10);

  const groupLevel = parseInt(getParam('level') || '1', 10) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;

  const groupCondition = getParam('groupCondition') || undefined;

  const groupName = getParam('name');

  const groupAddress = getParam('address') || conversationId;

  const groupAvatar = getParam('avatar');

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
    invitedMembersMessage
  };
}
