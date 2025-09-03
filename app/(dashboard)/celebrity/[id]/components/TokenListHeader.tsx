'use client';

interface TokenListHeaderProps {
  total: number;
  loading: boolean;
  onSearchClick: () => void;
}

export function TokenListHeader({ total, loading, onSearchClick }: TokenListHeaderProps) {
  function formatNumber(value: number) {
    if (!isFinite(value)) return '0';
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  return (
    <div className="flex justify-between items-center text-sm text-gray-500 space-x-4 px-3 py-3 bg-[#f6f6f6]">
      <div className="flex items-baseline">
        <span>代币</span>
        <span className="text-black pl-2">
          {loading ? (
            <span className="inline-block bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] h-4 w-24 rounded align-baseline translate-y-0.5"></span>
          ) : (
            `$${formatNumber(total)}`
          )}
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <button 
          className="w-4 h-4 flex items-center justify-center transition-transform duration-150 hover:scale-110 active:scale-95"
          onClick={onSearchClick}
        >
          <img className="w-4 h-4" src="/contacts/search.png" alt="搜索" />
        </button>
        <img className="w-4 h-4" src="/contacts/set.png" alt="" />
        <img className="w-4 h-4" src="/contacts/add.png" alt="" />
      </div>
    </div>
  );
}
