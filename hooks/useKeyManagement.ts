'use client';

/**
 * 密钥管理 Hook
 * 按当前连接的钱包地址隔离密钥数据
 */

import { useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useAccount } from 'wagmi';
import type { RootState, AppDispatch } from '@/lib/store';
import type { KeyPair } from '@/lib/keyManagement';
import {
  generateKeyPair as generateKeyPairThunk,
  saveKey as saveKeyAction,
  deleteKey as deleteKeyAction,
  setSelectedKey as setSelectedKeyAction,
  clearError as clearErrorAction
} from '@/lib/keyManagement';

/**
 * ⭐ 常量空数组，用于避免 selector 每次返回新引用导致无限重渲染
 * 当钱包未连接或无密钥时，始终返回同一个引用
 */
const EMPTY_KEYS: KeyPair[] = [];

/**
 * 密钥管理 Hook
 * 提供当前钱包的密钥列表、选中密钥及相关操作
 */
export function useKeyManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const { address: currentWallet } = useAccount();

  // ========== 选择器 ==========

  /**
   * 获取当前钱包的密钥列表
   * ⭐ 使用常量空数组 + shallowEqual 避免不必要的重渲染
   */
  const keys = useSelector((state: RootState) => {
    if (!currentWallet) return EMPTY_KEYS;
    return state.keyManagement.keysByWallet[currentWallet] ?? EMPTY_KEYS;
  }, shallowEqual);

  /**
   * 获取当前钱包选中的密钥 ID
   * 注意：null 是原始值，不需要 shallowEqual
   */
  const selectedKeyId = useSelector((state: RootState) => {
    if (!currentWallet) return null;
    return state.keyManagement.selectedKeyByWallet[currentWallet] ?? null;
  });

  /**
   * 获取当前钱包选中的密钥对象
   * ⭐ 使用 shallowEqual 避免对象引用变化导致的重渲染
   */
  const selectedKey = useSelector((state: RootState) => {
    if (!currentWallet) return null;
    const walletKeys = state.keyManagement.keysByWallet[currentWallet];
    if (!walletKeys) return null;
    const keyId = state.keyManagement.selectedKeyByWallet[currentWallet];
    if (!keyId) return null;
    return walletKeys.find((key) => key.id === keyId) ?? null;
  }, shallowEqual);

  // 加载状态和错误
  const loading = useSelector(
    (state: RootState) => state.keyManagement.loading
  );
  const error = useSelector((state: RootState) => state.keyManagement.error);

  // ========== 操作方法 ==========

  /**
   * 生成新密钥对
   */
  const generateNewKeyPair = useCallback(
    async (name: string): Promise<KeyPair | null> => {
      if (!currentWallet) {
        console.warn('无法生成密钥：钱包未连接');
        return null;
      }

      try {
        const result = await dispatch(
          generateKeyPairThunk({ name, walletAddress: currentWallet })
        ).unwrap();
        return result.key;
      } catch (error) {
        console.error('生成密钥失败:', error);
        return null;
      }
    },
    [dispatch, currentWallet]
  );

  /**
   * 保存密钥
   */
  const saveKeyToStorage = useCallback(
    (key: KeyPair) => {
      if (!currentWallet) {
        console.warn('无法保存密钥：钱包未连接');
        return;
      }
      dispatch(saveKeyAction({ walletAddress: currentWallet, key }));
    },
    [dispatch, currentWallet]
  );

  /**
   * 删除密钥
   */
  const removeKey = useCallback(
    (keyId: string) => {
      if (!currentWallet) {
        console.warn('无法删除密钥：钱包未连接');
        return;
      }
      dispatch(deleteKeyAction({ walletAddress: currentWallet, keyId }));
    },
    [dispatch, currentWallet]
  );

  /**
   * 设置选中的密钥
   */
  const setSelectedKeyId = useCallback(
    (keyId: string | null) => {
      if (!currentWallet) {
        console.warn('无法设置选中密钥：钱包未连接');
        return;
      }
      dispatch(setSelectedKeyAction({ walletAddress: currentWallet, keyId }));
    },
    [dispatch, currentWallet]
  );

  /**
   * 清除错误
   */
  const clearErrorMessage = useCallback(() => {
    dispatch(clearErrorAction());
  }, [dispatch]);

  // ========== 返回值 ==========

  return {
    // 状态
    keys,
    selectedKey,
    selectedKeyId,
    loading,
    error,
    isWalletConnected: !!currentWallet,

    // 操作方法
    generateNewKeyPair,
    saveKeyToStorage,
    removeKey,
    setSelectedKeyId,
    clearErrorMessage
  };
}
