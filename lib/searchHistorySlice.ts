import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// 搜索历史项类型
export interface SearchHistoryItem {
  id: string;
  content: string; // 搜索内容（地址或昵称）
  type: 'address' | 'name'; // 搜索类型
  timestamp: number; // 时间戳
  result?: {
    // 搜索结果（静态阶段使用固定数据）
    name: string;
    address: string;
    avatar: string;
  };
}

// 状态类型
interface SearchHistoryState {
  history: SearchHistoryItem[];
  isExpanded: boolean; // 历史记录展开/收起状态
}

// 初始状态
const initialState: SearchHistoryState = {
  history: [],
  isExpanded: false
};

const searchHistorySlice = createSlice({
  name: 'searchHistory',
  initialState,
  reducers: {
    // 添加搜索历史
    addHistory: (
      state,
      action: PayloadAction<Omit<SearchHistoryItem, 'id' | 'timestamp'>>
    ) => {
      const newItem: SearchHistoryItem = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now()
      };

      // 去重：移除相同内容的旧记录，新记录置顶，最多保留 20 条
      state.history = [
        newItem,
        ...state.history.filter((h) => h.content !== action.payload.content)
      ].slice(0, 20);
    },

    // 删除单条历史记录
    deleteHistoryItem: (state, action: PayloadAction<string>) => {
      state.history = state.history.filter(
        (item) => item.id !== action.payload
      );
    },

    // 清空所有历史记录
    clearAllHistory: (state) => {
      state.history = [];
    },

    // 切换展开/收起状态
    toggleExpanded: (state) => {
      state.isExpanded = !state.isExpanded;
    },

    // 设置展开状态
    setExpanded: (state, action: PayloadAction<boolean>) => {
      state.isExpanded = action.payload;
    }
  }
});

export const {
  addHistory,
  deleteHistoryItem,
  clearAllHistory,
  toggleExpanded,
  setExpanded
} = searchHistorySlice.actions;

export default searchHistorySlice.reducer;
