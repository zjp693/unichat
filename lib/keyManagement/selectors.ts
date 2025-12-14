/**
 * 密钥管理选择器
 */

import type { KeyPair, KeyManagementState } from './types';

// 假设 RootState 包含 keyManagement
interface RootState {
  keyManagement: KeyManagementState;
}

/**
 * 获取指定钱包的密钥列表
 */
export const selectKeysByWallet = (
  state: RootState,
  walletAddress: string | undefined
): KeyPair[] => {
  if (!walletAddress) return [];
  return state.keyManagement.keysByWallet[walletAddress] || [];
};

/**
 * 获取指定钱包选中的密钥 ID
 */
export const selectSelectedKeyIdByWallet = (
  state: RootState,
  walletAddress: string | undefined
): string | null => {
  if (!walletAddress) return null;
  return state.keyManagement.selectedKeyByWallet[walletAddress] || null;
};

/**
 * 获取指定钱包选中的密钥对象
 */
export const selectSelectedKeyByWallet = (
  state: RootState,
  walletAddress: string | undefined
): KeyPair | null => {
  if (!walletAddress) return null;

  const keys = state.keyManagement.keysByWallet[walletAddress] || [];
  const selectedId = state.keyManagement.selectedKeyByWallet[walletAddress];

  if (!selectedId) return null;
  return keys.find((key) => key.id === selectedId) || null;
};

/**
 * 获取加载状态
 */
export const selectKeyManagementLoading = (state: RootState): boolean => {
  return state.keyManagement.loading;
};

/**
 * 获取错误信息
 */
export const selectKeyManagementError = (state: RootState): string | null => {
  return state.keyManagement.error;
};
