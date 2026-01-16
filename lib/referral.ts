import { pad, type Address } from 'viem';

/**
 * 邀请码工具函数
 *
 * 新方案：邀请码直接由推荐人地址编码生成，无需链上交互
 * 邀请码格式：推荐人地址左填充到 32 字节 (bytes32)
 *
 * 示例：
 * 推荐人地址: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
 * 邀请码:     0x000000000000000000000000742d35Cc6634C0532925a3b844Bc9e7595f0bEb
 */

/**
 * 生成邀请码
 * @param referrerAddress 推荐人的钱包地址
 * @returns bytes32 格式的邀请码 (0x 开头的 66 字符)
 */
export function generateReferralCode(referrerAddress: Address): `0x${string}` {
  return pad(referrerAddress, { size: 32 });
}

/**
 * 空邀请码常量（用于无推荐人的情况）
 * 在 join() 函数中使用空邀请码时，推荐费用将分配给平台金库
 */
export const EMPTY_REFERRAL_CODE: `0x${string}` = `0x${'0'.repeat(64)}`;

/**
 * 验证邀请码格式是否有效
 * @param code 待验证的邀请码
 * @returns 是否为有效的 bytes32 格式
 */
export function isValidReferralCodeFormat(
  code: string | null
): code is `0x${string}` {
  return code !== null && code.startsWith('0x') && code.length === 66;
}

/**
 * 从邀请码中提取推荐人地址
 * @param code 邀请码
 * @returns 推荐人地址，如果是空邀请码则返回 null
 */
export function extractReferrerFromCode(code: `0x${string}`): Address | null {
  // 空邀请码检查
  if (code === EMPTY_REFERRAL_CODE) {
    return null;
  }

  // 提取后 20 字节（40 个十六进制字符）作为地址
  const addressPart = '0x' + code.slice(-40);

  // 验证是否为有效地址格式
  if (addressPart.startsWith('0x') && addressPart.length === 42) {
    return addressPart as Address;
  }

  return null;
}
