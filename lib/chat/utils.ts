import { Address } from '@/lib/utils';
import type { Message } from './types';
import type { ChatItem } from '@/lib/types/chat';
import type { CommunityWithStatus } from '@/lib/types/community';
import dayjs from 'dayjs';

/**
 * 将链上群聊数据转换为 ChatItem 格式
 */
export function convertCommunityToChat(
  community: CommunityWithStatus
): ChatItem {
  return {
    id: community.communityAddress,
    name: community.name,
    avatar: community.avatarCid || '/me/me1.png',
    lastMessage: community.communityAddress, // 显示群聊地址而不是代币地址
    time: '-',
    isGroup: true,
    level: community.maxTier as 1 | 2 | 3 | 4 | 5 | 6,
    memberCount: 0, // 可以后续从合约获取
    groupCondition: `档位 ${community.maxTier}`,
    address: community.communityAddress,
    // 添加状态标识
    canJoin: community.canJoin,
    isJoined: community.isJoined,
    proofData: community.proofData
  };
}

/**
 * 生成红包分配方案
 * @param type 红包类型：LUCKY（拼手气）或 NORMAL（普通）
 * @param totalAmount 红包总金额
 * @param count 红包个数
 * @returns 红包金额分配数组
 */
export function generateRedPacketDistribution(
  type: 'LUCKY' | 'NORMAL',
  totalAmount: number,
  count: number
): number[] {
  if (count <= 0) return [];

  if (type === 'NORMAL') {
    // 普通红包：直接均分总金额
    const perAmount = totalAmount / count;
    return Array(count).fill(perAmount);
  } else {
    // 拼手气红包逻辑 (模拟二倍均值法)
    // 核心思想：每次随机金额的上限是 (剩余金额 / 剩余人数) * 2
    // 这样可以保证每个人抢到的期望值是相等的
    let remaining = totalAmount;
    const result: number[] = [];

    for (let i = 0; i < count - 1; i++) {
      // 随机范围：0.01 到 (剩余金额 / 剩余人数 * 2)
      const max = (remaining / (count - i)) * 2;
      const amount = Math.max(0.01, Math.random() * max);
      const fixedAmount = parseFloat(amount.toFixed(2)); // 保留两位小数
      result.push(fixedAmount);
      remaining -= fixedAmount;
    }

    // 最后一个红包直接拿走剩下的所有金额，确保总额准确
    result.push(parseFloat(remaining.toFixed(2)));
    return result;
  }
}

/**
 * 格式化地址为简短形式
 * @param address 以太坊地址
 * @returns 格式化后的地址 (0x1234...5678)
 */
export function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 按日期分组消息
 * @param messages 消息列表
 * @returns 分组后的消息对象
 */
export function groupMessagesByDate(
  messages: Message[]
): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {};

  messages.forEach((msg) => {
    const date = dayjs(msg.timestamp).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
  });

  return groups;
}

/**
 * 检查消息是否需要显示发送者名称（群聊中判断）
 * @param message 当前消息
 * @param previousMessage 上一条消息
 * @param chatType 聊天类型
 * @returns 是否显示发送者名称
 */
export function shouldShowSenderName(
  message: Message,
  previousMessage: Message | null,
  chatType: 'private' | 'group'
): boolean {
  // 私聊不显示发送者名称
  if (chatType === 'private') return false;

  // 系统消息不显示
  if (message.sender === 'system') return false;

  // 自己发的消息不显示
  if (message.sender === 'user') return false;

  // 如果是第一条消息，显示
  if (!previousMessage) return true;

  // 如果与上一条消息的发送者不同，显示
  if (message.senderAddress !== previousMessage.senderAddress) return true;

  return false;
}

/**
 * 检查两条消息之间是否需要显示时间分隔
 * @param currentMessage 当前消息
 * @param previousMessage 上一条消息
 * @param thresholdMinutes 时间阈值（分钟）
 * @returns 是否显示时间分隔
 */
export function shouldShowTimeDivider(
  currentMessage: Message,
  previousMessage: Message | null,
  thresholdMinutes: number = 5
): boolean {
  if (!previousMessage) return true;

  const currentTime = dayjs(currentMessage.timestamp);
  const previousTime = dayjs(previousMessage.timestamp);

  const diffMinutes = currentTime.diff(previousTime, 'minute');

  return diffMinutes >= thresholdMinutes;
}
