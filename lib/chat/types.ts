import { Address } from '@/lib/utils';

/**
 * 聊天类型
 */
export type ChatType = 'private' | 'group';

/**
 * 消息类型
 */
export type MessageType =
  | 'text'
  | 'image'
  | 'system'
  | 'system-time'
  | 'red-packet'
  | 'red-packet-claim';

/**
 * 消息发送者类型
 */
export type MessageSender = 'user' | 'other' | 'system';

/**
 * 消息状态
 */
export type MessageStatus = 'sending' | 'failed' | 'sent';

/**
 * 消息对象的数据结构
 */
export interface Message {
  id: string;
  sender: MessageSender;
  timestamp: Date | string; // 允许字符串以便从API接收
  type: MessageType;
  isEncrypted?: boolean;
  originalContent: string | null; // 修正为 string 或 null
  status?: MessageStatus; // 用于UI反馈发送状态
  // 从 DMMessage 手动复制的属性
  recipient: Address;
  content: string; // 确保 content 属性存在
  senderAddress?: Address; // 群聊消息的发送者地址
  isGroupMessage?: boolean; // 是否为群聊消息
}

/**
 * 红包数据结构
 */
export interface RedPacketData {
  type: 'LUCKY' | 'NORMAL';
  amount: string;
  count: number;
  message: string;
  senderName: string;
  senderAvatar: string;
  status: 'active' | 'claimed' | 'expired';
  distribution: number[]; // 红包金额分配数组
  claimedList: Array<{
    address: Address;
    name: string;
    amount: number;
    timestamp: number;
  }>;
  remainingCount: number;
}

/**
 * 聊天配置
 */
export interface ChatConfig {
  conversationId: string;
  chatType: ChatType;
  recipientAddress: Address;
  // 群聊相关
  groupName?: string | null;
  groupAddress?: string;
  groupAvatar?: string | null;
  memberCount?: number;
  groupLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  groupCondition?: string;
  invitedMembersMessage?: string | null;
}
