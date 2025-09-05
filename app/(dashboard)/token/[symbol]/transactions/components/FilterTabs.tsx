'use client';

interface FilterTabsProps {
  activeTab: 'all' | 'income' | 'expense';
  onTabChange: (tab: 'all' | 'income' | 'expense') => void;
}

export function FilterTabs({ activeTab, onTabChange }: FilterTabsProps) {
  return (
    <div className="mx-4 mt-4 mb-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-900 font-medium text-sm">最近交易记录</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onTabChange('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => onTabChange('income')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'income'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            收入
          </button>
          <button
            onClick={() => onTabChange('expense')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'expense'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            支出
          </button>
        </div>
      </div>
    </div>
  );
}
