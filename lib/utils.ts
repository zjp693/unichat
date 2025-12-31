import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { keccak256, encodePacked, getAddress } from 'viem';

// 配置 day.js 插件
dayjs.extend(relativeTime);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===== 日期相关工具函数 =====
/**
 * 转换为日期格式 YYYY/MM/DD
 * @param ts 时间戳或日期字符串
 * @returns 格式化的日期字符串
 */
export function toDateYMD(ts?: string | number | Date): string {
  if (!ts) return '';
  return dayjs(ts).format('YYYY/MM/DD');
}

/**
 * 转换为日期时间格式 YYYY-MM-DD HH:MM
 * @param ts 时间戳或日期字符串
 * @returns 格式化的日期时间字符串
 */
export function toDateTime(ts?: string | number | Date): string {
  if (!ts) return '';
  return dayjs(ts).format('YYYY-MM-DD HH:mm');
}

/**
 * 转换为相对时间（如：2小时前、3天前）
 * @param ts 时间戳或日期字符串
 * @returns 相对时间字符串
 */
export function toRelativeTime(ts?: string | number | Date): string {
  if (!ts) return '';
  return dayjs(ts).fromNow();
}

/**
 * 检查日期是否有效
 * @param ts 时间戳或日期字符串
 * @returns 是否有效
 */
export function isValidDate(ts?: string | number | Date): boolean {
  if (!ts) return false;
  return dayjs(ts).isValid();
}

/**
 * 获取当前时间戳
 * @returns 当前时间戳
 */
export function getCurrentTimestamp(): number {
  return dayjs().valueOf();
}

// ===== 地址相关工具函数 =====
/**
 * 格式化地址显示（截取前6位和后4位）
 * @param address 完整地址
 * @param prefixLength 前缀长度，默认6
 * @param suffixLength 后缀长度，默认4
 * @returns 格式化后的地址
 */
export function formatAddress(
  address: string,
  prefixLength: number = 6,
  suffixLength: number = 4
): string {
  if (!address || address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * 检查是否为有效的以太坊地址
 * @param address 地址字符串
 * @returns 是否有效
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 生成基于地址的颜色（用于头像等）
 * @param address 地址
 * @returns 十六进制颜色值
 */
export function getAddressColor(address: string): string {
  if (!address || address.length < 8) return '#8B5CF6'; // 默认紫色
  // 使用地址的前6位作为颜色
  const hash = address.slice(2, 8);
  return `#${hash}`;
}

// 定义 Address 类型，用于与 viem 交互
export type Address = `0x${string}`;

/**
 * 计算 DirectMessage 合约中的会话 ID (convoId)
 * @param a 地址 A
 * @param b 地址 B
 * @returns 会话 ID (bytes32 字符串)
 */
export function computeConvoId(a: Address, b: Address): `0x${string}` {
  const A = getAddress(a);
  const B = getAddress(b);
  // 与 Solidity 中 address 的 < 比较等价：固定 20 字节十六进制，按数值大小排序
  const [x, y] = A.toLowerCase() < B.toLowerCase() ? [A, B] : [B, A];
  return keccak256(encodePacked(['address', 'address'], [x, y]));
}

// ===== 数字相关工具函数 =====
/**
 * 格式化数字显示
 * @param n 数字
 * @param maxFractionDigits 最大小数位数，默认6
 * @returns 格式化后的数字字符串
 */
export function formatNumber(n: number, maxFractionDigits: number = 6): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits
  });
}

/**
 * 格式化货币显示
 * @param amount 金额
 * @param currency 货币代码，默认'USD'
 * @param locale 地区，默认'en-US'
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}
