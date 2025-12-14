'use client';

import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { RootState, AppDispatch } from '@/lib/store';
import {
  setSelectedCelebrity as setAction,
  clearSelectedCelebrity as clearAction
} from '@/lib/chatSlice';
import type { Contact } from '@/lib/contacts';
import { store } from '@/lib/store';

/**
 * 选中名人状态管理 Hook
 * 按当前连接的钱包地址隔离数据
 */
export function useSelectedCelebrity() {
  const dispatch = useDispatch<AppDispatch>();
  const { address: currentWallet } = useAccount();

  // 获取当前钱包的选中名人
  const selected = useSelector((state: RootState) => {
    if (!currentWallet) return null;
    return state.chat.selectedCelebrityByWallet[currentWallet] || null;
  });

  // 设置选中的名人
  const setSelectedCelebrity = useCallback(
    (celebrity: Contact | null) => {
      if (!currentWallet) {
        console.warn('无法设置选中名人：钱包未连接');
        return;
      }
      dispatch(setAction({ walletAddress: currentWallet, celebrity }));
    },
    [dispatch, currentWallet]
  );

  // 清除选中的名人
  const clearSelectedCelebrity = useCallback(() => {
    if (!currentWallet) return;
    dispatch(clearAction(currentWallet));
  }, [dispatch, currentWallet]);

  return {
    selected,
    setSelectedCelebrity,
    clearSelectedCelebrity,
    hydrated: true, // Redux 自动处理 hydration
    isWalletConnected: !!currentWallet
  };
}

// ====== 兼容非 Hook 调用（需要外部传入钱包地址）======

/**
 * 非 Hook 场景设置选中名人
 * @param celebrity 名人联系人对象
 * @param walletAddress 当前钱包地址
 */
export function setSelectedCelebrityDirect(
  celebrity: Contact | null,
  walletAddress: string
) {
  if (!walletAddress) {
    console.warn('setSelectedCelebrityDirect: 需要提供钱包地址');
    return;
  }
  store.dispatch(setAction({ walletAddress, celebrity }));
}

/**
 * 非 Hook 场景获取选中名人
 * @param walletAddress 钱包地址
 */
export function getSelectedCelebrityDirect(
  walletAddress: string
): Contact | null {
  if (!walletAddress) return null;
  const state = store.getState();
  return state.chat.selectedCelebrityByWallet[walletAddress] || null;
}
