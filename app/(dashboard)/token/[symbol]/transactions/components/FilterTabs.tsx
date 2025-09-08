'use client';

interface FilterTabsProps {
  activeTab: 'all' | 'income' | 'expense';
  onTabChange: (tab: 'all' | 'income' | 'expense') => void;
}

export function FilterTabs({ activeTab, onTabChange }: FilterTabsProps) {
  return (
    <div className="mx-4 mt-4 mb-3">
      <div className="flex items-center justify-between">
        <span className="text-[#303133] font-medium text-base">最近交易记录</span>
        <div className="flex items-center space-x-2 rounded-lg bg-white">
          <button
            onClick={() => onTabChange('all')}
            className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-[#e8e7fc] text-[#722ED1]'
                : 'text-[#666666]'
            }`}
          > 
            全部
          </button>
          <button
            onClick={() => onTabChange('income')}
            className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
              activeTab === 'income'
                ? 'bg-[#F0F0FF] text-[#722ED1]'
                : ' text-[#666666]'
            }`}
          >
            收入
          </button>
          <button
            onClick={() => onTabChange('expense')}
            className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
              activeTab === 'expense'
                ? 'bg-[#F0F0FF] text-[#722ED1]'
                : ' text-[#666666] hover:bg-[#E8E8E8]'
            }`}
          >
            支出
          </button>
        </div>
      </div>
    </div>
  );
}
