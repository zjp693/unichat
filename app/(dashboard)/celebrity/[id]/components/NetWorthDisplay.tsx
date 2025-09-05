'use client';

interface NetWorthDisplayProps {
  total: number;
  change24h: number | null;
  loading: boolean;
}

export function NetWorthDisplay({ total, change24h, loading }: NetWorthDisplayProps) {
  function formatNumber(value: number, fractionDigits = 0) {
    if (!isFinite(value)) return '0';
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits
    });
  }

  return (
    <div className="text-3xl font-bold text-gray-900 mb-2">
      {loading ? (
        <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] h-9 w-48 rounded"></div>
      ) : (
        <div className="flex items-center">
          <span>${formatNumber(total)}</span>
          {/* {change24h !== null && (
            <span className={`ml-2 text-lg ${change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({change24h >= 0 ? '+' : ''}{formatNumber(change24h, 2)}%)
            </span>
            这是增长百分比
          )} */}
        </div>
      )}
    </div>
  );
}
