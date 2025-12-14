/**
 * 密钥管理模块统一导出
 */

// ===== 类型 =====
export type { KeyPair, DecryptResult, KeyManagementState } from './types';

// ===== 加密工具 =====
export {
  ChatEncryption,
  chatEncryption,
  DEFAULT_PRIVATE_KEY
} from './encryption';

// ===== Redux =====
export { default as keyManagementReducer } from './slice';
export {
  generateKeyPair,
  saveKey,
  deleteKey,
  setSelectedKey,
  clearError,
  migrateKeys,
  clearWalletKeys
} from './slice';

// ===== 选择器 =====
export {
  selectKeysByWallet,
  selectSelectedKeyIdByWallet,
  selectSelectedKeyByWallet,
  selectKeyManagementLoading,
  selectKeyManagementError
} from './selectors';

// ===== 迁移工具 =====
export {
  checkNeedsMigration,
  getOldKeys,
  clearOldKeys,
  migrateOldKeys
} from './migration';
