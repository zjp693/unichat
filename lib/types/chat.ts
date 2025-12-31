/**
 * 聊天相关类型定义
 */

/**
 * 聊天列表项
 */
export interface ChatItem {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  isOnline?: boolean;
  isGroup?: boolean;
  copy?: boolean;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  memberCount?: number;
  groupCondition?: string;
  address?: string; // 群聊地址或私聊对方地址
  // 群聊状态
  canJoin?: boolean;
  isJoined?: boolean;
  proofData?: any;
  /** 是否为新版红包群（自定义群） */
  isRedPacketGroup?: boolean;
}
