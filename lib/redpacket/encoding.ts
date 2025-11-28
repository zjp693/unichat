/**
 * 红包消息编解码工具
 * 用于在聊天消息中嵌入红包信息
 */

import { Address } from 'viem';

/**
 * 编码个人红包消息内容（用于 DirectMessage 的 content 字段）
 * 格式: RP|v1|<packetId>|p|<tokenAddress>|<memo>
 */
export function encodeDmRedPacketContent(
  packetId: bigint | number,
  token: Address,
  memo: string
): string {
  return ['RP', 'v1', String(packetId), 'p', token, memo ?? ''].join('|');
}

/**
 * 解码个人红包消息内容
 * 返回 null 表示这不是红包消息
 */
export function decodeDmRedPacketContent(content: string): {
  packetId: bigint;
  token: Address;
  memo: string;
} | null {
  const parts = content.split('|');

  if (parts[0] === 'RP' && parts[1] === 'v1' && parts.length >= 3) {
    const mode = parts[3]; // 应该是 'p' (personal)

    if (mode === 'p') {
      try {
        const packetId = BigInt(parts[2]);
        const token = (parts[4] ??
          '0x0000000000000000000000000000000000000000') as Address;
        const memo = parts[5] ?? '';

        return {
          packetId,
          token,
          memo
        };
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * 检查消息内容是否为红包消息
 */
export function isRedPacketMessage(content: string): boolean {
  return content.startsWith('RP|v1|');
}

/**
 * 编码群聊红包 CID（用于 Community Message 的 cid 字段）
 * 格式: redpacket:v1:<packetId>
 */
export function encodeGroupRedPacketCid(packetId: bigint | number): string {
  return `redpacket:v1:${packetId}`;
}

/**
 * 解码群聊红包 CID
 * 返回 null 表示这不是红包消息
 */
export function decodeGroupRedPacketCid(cid: string): bigint | null {
  const prefix = 'redpacket:v1:';
  if (!cid.startsWith(prefix)) return null;
  const idStr = cid.slice(prefix.length);
  try {
    return BigInt(idStr);
  } catch {
    return null;
  }
}
