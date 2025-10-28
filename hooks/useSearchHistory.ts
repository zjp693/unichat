import { useSelector, useDispatch } from 'react-redux';
import { useMemo } from 'react';
import type { RootState, AppDispatch } from '@/lib/store';
import {
  addHistory,
  deleteHistoryItem,
  clearAllHistory,
  toggleExpanded,
  type SearchHistoryItem
} from '@/lib/searchHistorySlice';

export const useSearchHistory = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { history, isExpanded } = useSelector(
    (state: RootState) => state.searchHistory
  );

  // 显示的历史记录（收起 6 条，展开 12 条）
  const displayedHistory = useMemo(() => {
    const limit = isExpanded ? 12 : 6;
    return history.slice(0, limit);
  }, [history, isExpanded]);

  // 是否显示展开按钮（历史记录大于 6 条时显示）
  const showExpandButton = history.length > 6;

  // 添加搜索记录（静态阶段：固定返回 James）
  const addSearchRecord = (content: string) => {
    const type = content.startsWith('0x') ? 'address' : 'name';

    // 静态数据：固定使用 James 作为搜索结果
    dispatch(
      addHistory({
        content,
        type,
        result: {
          name: 'James',
          address: content,
          avatar: '/me/me2.png'
        }
      })
    );
  };

  // 删除单条记录
  const deleteRecord = (itemId: string) => {
    dispatch(deleteHistoryItem(itemId));
  };

  // 清空所有记录
  const clearAll = () => {
    dispatch(clearAllHistory());
  };

  // 切换展开/收起
  const toggle = () => {
    dispatch(toggleExpanded());
  };

  return {
    history,
    displayedHistory,
    isExpanded,
    showExpandButton,
    addSearchRecord,
    deleteRecord,
    clearAll,
    toggle
  };
};
