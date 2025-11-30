'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TokenList } from './TokenList';
import { TokenEmptyState } from './TokenEmptyState';
import { AddTokenDialog } from './AddTokenDialog';
import { ChevronLeft, LayoutGrid, Search } from 'lucide-react';
import { useRecommendedTokens, useTokenFilter } from './hooks/useTokenData';
import { useToast } from '@/hooks/use-toast';
import type { TokenSelectorProps, Token } from './types';

export function TokenSelector({
  isOpen,
  onClose,
  selectedToken,
  onSelectToken
}: TokenSelectorProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  // 只存储自定义代币的地址
  const [customAddresses, setCustomAddresses] = useState<string[]>([]);
  const { toast } = useToast();

  // 🔍 监控自定义地址的变化
  useEffect(() => {
    console.log('🔄 [TokenSelector] 当前自定义代币地址列表:', customAddresses);
  }, [customAddresses]);

  // 当弹窗关闭时，重置搜索关键词
  useEffect(() => {
    if (!isOpen) {
      setSearchKeyword('');
    }
  }, [isOpen]);

  // 传入自定义地址，统一获取所有代币信息（包括余额）
  const { tokens: allTokens, isLoading } =
    useRecommendedTokens(customAddresses);

  const filteredTokens = useTokenFilter(allTokens, searchKeyword);

  const handleSelectToken = (token: Token) => {
    onSelectToken(token);
    onClose();
  };

  const handleAddCustomToken = (token: Token) => {
    const newAddress = token.address.toLowerCase();

    console.log('➕ [TokenSelector] 尝试添加新代币:', newAddress);

    // 检查是否已存在（在所有代币中检查）
    const exists = allTokens.some(
      (t) => t.address.toLowerCase() === newAddress
    );

    if (exists) {
      console.log('⚠️ [TokenSelector] 代币已存在，跳过添加');
      toast({
        title: '代币已存在',
        description: `${token.symbol} 已经在列表中了`,
        variant: 'destructive'
      });
      return; // 👈 直接返回，不执行后续操作
    }

    console.log('✅ [TokenSelector] 代币不存在，添加到列表');
    setCustomAddresses((prev) => [newAddress, ...prev]);

    // 只在成功添加时才执行这些操作
    onSelectToken(token);
    onClose();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="h-[85vh] p-0 flex flex-col bg-white rounded-t-xl !border-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">选择代币</SheetTitle>

          <div className="flex items-center gap-3 px-4 py-3 bg-white">
            {/* 返回/关闭按钮 */}
            <button onClick={onClose} className="p-1 -ml-1">
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>

            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="代币名称"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full h-9 pl-9 pr-4 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* 添加代币按钮 */}
            <button
              onClick={() => setIsAddingToken(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-900 shadow-sm active:bg-gray-50"
            >
              添加代币
            </button>

            {/* 更多/视图切换图标 */}
            <button className="p-1">
              <LayoutGrid className="w-6 h-6 text-black" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm">正在加载代币列表...</p>
            </div>
          ) : filteredTokens.length > 0 ? (
            <TokenList
              tokens={filteredTokens}
              selectedToken={selectedToken}
              onSelect={handleSelectToken}
            />
          ) : (
            <TokenEmptyState onAddClick={() => setIsAddingToken(true)} />
          )}
        </SheetContent>
      </Sheet>

      <AddTokenDialog
        isOpen={isAddingToken}
        onClose={() => setIsAddingToken(false)}
        onConfirm={handleAddCustomToken}
      />
    </>
  );
}
