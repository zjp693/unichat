'use client';

interface TokenData {
  symbol: string;
  amount: string;
  value: string;
  change: string;
  usdValue: string;
  isPositive: boolean;
  tokenAddress?: string;
  thumbnail?: string | null;
}

interface TokenListItemProps {
  token: TokenData;
  isLast?: boolean;
  onClick?: () => void;
}

export function TokenListItem({ token, isLast, onClick }: TokenListItemProps) {
  // 获取代币图标背景色
  const getTokenIcon = (symbol: string) => {
    const iconConfig: Record<string, { bg: string }> = {
      USDT: { bg: 'bg-green-500' },
      WBTC: { bg: 'bg-orange-500' },
      ETH: { bg: 'bg-blue-500' },
      BNB: { bg: 'bg-yellow-500' },
      AAVE: { bg: 'bg-purple-500' },
      LINK: { bg: 'bg-blue-600' },
      ARB: { bg: 'bg-gray-800' }
    };
    return iconConfig[symbol] || { bg: 'bg-gray-500' };
  };

  const iconConfig = getTokenIcon(token.symbol);

  return (
    <div className="bg-white">
      <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={onClick}>
        {/* 代币图标 */}
        <div className="mr-3 flex-shrink-0 relative">
          {token.thumbnail ? (
            <img
              src={token.thumbnail}
              alt={token.symbol}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-lg ${iconConfig.bg} flex items-center justify-center`}
            >
              <span className="text-white text-xs font-bold">{token.symbol}</span>
            </div>
          )}
        </div>

        {/* 代币信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            {/* 代币符号和涨跌幅 */}
            <div className="flex items-center">
              <span className="text-base font-medium text-gray-900 mr-2">
                {token.symbol}
              </span>
            </div>

            {/* 数量 */}
            <div className="text-base font-medium text-gray-900">
              {token.value}
            </div>
          </div>

          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 ">{token.amount}
            {token.change && (
                <span
                  className={`text-xs pl-1 ${
                    token.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {token.change}
                </span>
              )}
            </span>
            <span className="text-xs text-gray-500">{token.usdValue}</span>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      {!isLast && (
        <div className="mx-4">
          <div className="border-t border-gray-300"></div>
        </div>
      )}
    </div>
  );
}
