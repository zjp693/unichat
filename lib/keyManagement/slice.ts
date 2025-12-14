/**
 * 密钥管理 Redux Slice
 * 按钱包地址隔离密钥列表
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { KeyPair, KeyManagementState } from './types';
import { chatEncryption } from './encryption';

// 初始状态
const initialState: KeyManagementState = {
  keysByWallet: {},
  selectedKeyByWallet: {},
  loading: false,
  error: null
};

// ============================================
// Async Thunks
// ============================================

/**
 * 生成新密钥对
 */
export const generateKeyPair = createAsyncThunk(
  'keyManagement/generateKeyPair',
  async ({ name, walletAddress }: { name: string; walletAddress: string }) => {
    const { publicKey, privateKey } = chatEncryption.generateKeyPair();

    const newKey: KeyPair = {
      id: Date.now().toString(),
      name,
      publicKey,
      privateKey,
      createdAt: new Date().toISOString()
    };

    return { walletAddress, key: newKey };
  }
);

// ============================================
// Slice
// ============================================

const keyManagementSlice = createSlice({
  name: 'keyManagement',
  initialState,
  reducers: {
    /**
     * 保存密钥到指定钱包
     */
    saveKey(
      state,
      action: PayloadAction<{ walletAddress: string; key: KeyPair }>
    ) {
      const { walletAddress, key } = action.payload;
      if (!walletAddress) return;

      if (!state.keysByWallet[walletAddress]) {
        state.keysByWallet[walletAddress] = [];
      }
      state.keysByWallet[walletAddress].push(key);
    },

    /**
     * 删除指定钱包的密钥
     */
    deleteKey(
      state,
      action: PayloadAction<{ walletAddress: string; keyId: string }>
    ) {
      const { walletAddress, keyId } = action.payload;
      if (!walletAddress || !state.keysByWallet[walletAddress]) return;

      state.keysByWallet[walletAddress] = state.keysByWallet[
        walletAddress
      ].filter((key) => key.id !== keyId);

      // 如果删除的是当前选中的密钥，清除选中状态
      if (state.selectedKeyByWallet[walletAddress] === keyId) {
        state.selectedKeyByWallet[walletAddress] = null;
      }
    },

    /**
     * 设置指定钱包的选中密钥
     */
    setSelectedKey(
      state,
      action: PayloadAction<{ walletAddress: string; keyId: string | null }>
    ) {
      const { walletAddress, keyId } = action.payload;
      if (!walletAddress) return;
      state.selectedKeyByWallet[walletAddress] = keyId;
    },

    /**
     * 清除错误
     */
    clearError(state) {
      state.error = null;
    },

    /**
     * 迁移旧密钥数据到指定钱包
     */
    migrateKeys(
      state,
      action: PayloadAction<{ walletAddress: string; keys: KeyPair[] }>
    ) {
      const { walletAddress, keys } = action.payload;
      if (!walletAddress || !keys.length) return;

      if (!state.keysByWallet[walletAddress]) {
        state.keysByWallet[walletAddress] = [];
      }

      // 合并密钥，避免重复（按 id 去重）
      const existingIds = new Set(
        state.keysByWallet[walletAddress].map((k) => k.id)
      );
      const newKeys = keys.filter((k) => !existingIds.has(k.id));
      state.keysByWallet[walletAddress].push(...newKeys);
    },

    /**
     * 清除指定钱包的所有密钥
     */
    clearWalletKeys(state, action: PayloadAction<string>) {
      const walletAddress = action.payload;
      if (!walletAddress) return;
      delete state.keysByWallet[walletAddress];
      delete state.selectedKeyByWallet[walletAddress];
    }
  },
  extraReducers: (builder) => {
    builder
      // 生成密钥对
      .addCase(generateKeyPair.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateKeyPair.fulfilled, (state, action) => {
        state.loading = false;
        const { walletAddress, key } = action.payload;

        if (!state.keysByWallet[walletAddress]) {
          state.keysByWallet[walletAddress] = [];
        }
        state.keysByWallet[walletAddress].push(key);
      })
      .addCase(generateKeyPair.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '生成密钥失败';
      });
  }
});

export const {
  saveKey,
  deleteKey,
  setSelectedKey,
  clearError,
  migrateKeys,
  clearWalletKeys
} = keyManagementSlice.actions;

export default keyManagementSlice.reducer;
