/**
 * 二维码协议解析工具
 *
 * 协议格式: unichat://<type>/<data>[?params]
 * 示例: unichat://user/0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe
 */

export interface QRCodeData {
  type: 'user' | 'unknown';
  address?: string;
  params?: Record<string, string>;
  raw: string; // 原始扫码内容
}

const PROTOCOL_PREFIX = 'unichat://';

/**
 * 验证是否为有效的以太坊地址
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 解析二维码内容
 */
export function parseQRCode(content: string): QRCodeData {
  const trimmedContent = content.trim();

  // 1. 检查是否是 unichat 协议
  if (trimmedContent.startsWith(PROTOCOL_PREFIX)) {
    try {
      // unichat://user/0x... -> 解析
      const withoutPrefix = trimmedContent.slice(PROTOCOL_PREFIX.length);
      const [typePart, ...rest] = withoutPrefix.split('/');
      const dataWithParams = rest.join('/');

      // 解析参数
      let address = dataWithParams;
      let params: Record<string, string> | undefined;

      if (dataWithParams.includes('?')) {
        const [addr, queryString] = dataWithParams.split('?');
        address = addr;
        params = Object.fromEntries(new URLSearchParams(queryString));
      }

      // 验证类型
      if (typePart === 'user' && isValidEthereumAddress(address)) {
        return { type: 'user', address, params, raw: trimmedContent };
      }

      // 未知类型
      return { type: 'unknown', raw: trimmedContent };
    } catch {
      return { type: 'unknown', raw: trimmedContent };
    }
  }

  // 2. 无法识别
  return { type: 'unknown', raw: trimmedContent };
}

/**
 * 生成用户二维码内容
 */
export function generateUserQRCode(address: string): string {
  return `${PROTOCOL_PREFIX}user/${address}`;
}
