import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { KeyPair, chatEncryption } from '@/lib/encryption';

// 定义状态类型
interface KeyManagementState {
  keys: KeyPair[];
  selectedKeyId: string | null;
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: KeyManagementState = {
  keys: [],
  selectedKeyId: null,
  loading: false,
  error: null
};

// 异步 thunk - 加载密钥
export const loadKeys = createAsyncThunk('keyManagement/loadKeys', async () => {
  const savedKeys = localStorage.getItem('chat_keys');
  if (savedKeys) {
    try {
      return JSON.parse(savedKeys) as KeyPair[];
    } catch (error) {
      console.error('加载密钥失败:', error);
      throw new Error('加载密钥失败');
    }
  }
  return [] as KeyPair[];
});

// 异步 thunk - 生成新密钥对
export const generateKeyPair = createAsyncThunk(
  'keyManagement/generateKeyPair',
  async (name: string) => {
    const { publicKey, privateKey } = chatEncryption.generateKeyPair();

    const newKey: KeyPair = {
      id: Date.now().toString(),
      name,
      publicKey,
      privateKey,
      createdAt: new Date().toISOString()
    };

    return newKey;
  }
);

// 异步 thunk - 保存密钥
export const saveKey = createAsyncThunk(
  'keyManagement/saveKey',
  async (key: KeyPair) => {
    const savedKeys = localStorage.getItem('chat_keys');
    let keys: KeyPair[] = [];

    if (savedKeys) {
      try {
        keys = JSON.parse(savedKeys);
      } catch (error) {
        console.error('解析现有密钥失败:', error);
      }
    }

    const updatedKeys = [...keys, key];
    localStorage.setItem('chat_keys', JSON.stringify(updatedKeys));

    // 返回更新后的密钥列表
    return updatedKeys;
  }
);

// 异步 thunk - 删除密钥
export const deleteKey = createAsyncThunk(
  'keyManagement/deleteKey',
  async (keyId: string) => {
    const savedKeys = localStorage.getItem('chat_keys');
    let keys: KeyPair[] = [];

    if (savedKeys) {
      try {
        keys = JSON.parse(savedKeys);
      } catch (error) {
        console.error('解析现有密钥失败:', error);
      }
    }

    const updatedKeys = keys.filter((key) => key.id !== keyId);
    localStorage.setItem('chat_keys', JSON.stringify(updatedKeys));

    return updatedKeys;
  }
);

const keyManagementSlice = createSlice({
  name: 'keyManagement',
  initialState,
  reducers: {
    setSelectedKey: (state, action: PayloadAction<string | null>) => {
      state.selectedKeyId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 加载密钥
      .addCase(loadKeys.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadKeys.fulfilled, (state, action) => {
        state.loading = false;
        state.keys = action.payload;
      })
      .addCase(loadKeys.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载密钥失败';
      })
      // 生成密钥对
      .addCase(generateKeyPair.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateKeyPair.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(generateKeyPair.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '生成密钥失败';
      })
      // 保存密钥
      .addCase(saveKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveKey.fulfilled, (state, action) => {
        state.loading = false;
        state.keys = action.payload;
      })
      .addCase(saveKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '保存密钥失败';
      })
      // 删除密钥
      .addCase(deleteKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteKey.fulfilled, (state, action) => {
        state.loading = false;
        state.keys = action.payload;
      })
      .addCase(deleteKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除密钥失败';
      });
  }
});

export const { setSelectedKey, clearError } = keyManagementSlice.actions;
export default keyManagementSlice.reducer;
