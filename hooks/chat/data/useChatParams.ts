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
  const conversationId = params.id as string;
  const chatType: ChatType =
    searchParams.get('type') === 'group' ? 'group' : 'private';

  // 群聊参数
  const invitedMembersMessage = searchParams.get('invitedMembers')
    ? decodeURIComponent(searchParams.get('invitedMembers') as string)
    : null;

  const memberCount = parseInt(searchParams.get('memberCount') || '0', 10);

  const groupLevel = parseInt(searchParams.get('level') || '1', 10) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;

  const groupCondition = searchParams.get('groupCondition')
    ? decodeURIComponent(searchParams.get('groupCondition') as string)
    : undefined;

  const groupName = searchParams.get('name')
    ? decodeURIComponent(searchParams.get('name') as string)
    : null;

  const groupAddress = searchParams.get('address') || conversationId;

  const groupAvatar = searchParams.get('avatar')
    ? decodeURIComponent(searchParams.get('avatar') as string)
    : null;

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
