/**
 * 密钥管理类型定义
 */

/**
 * 密钥对
 */
export interface KeyPair {
  id: string;
  name: string;
  publicKey: string;
  privateKey: string;
  createdAt: string;
  password?: string; // 可选的密码字段
}

/**
 * 解密结果
 */
export type DecryptResult =
  | { success: true; decrypted: string }
  | { success: false; error: string };

/**
 * 密钥管理状态（按钱包地址隔离）
 */
export interface KeyManagementState {
  // 按钱包地址存储密钥列表
  // { '0xAAA...': [key1, key2], '0xBBB...': [key3] }
  keysByWallet: Record<string, KeyPair[]>;

  // 按钱包地址存储选中的密钥ID
  // { '0xAAA...': 'key1-id', '0xBBB...': null }
  selectedKeyByWallet: Record<string, string | null>;

  loading: boolean;
  error: string | null;
}
