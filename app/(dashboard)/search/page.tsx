'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TopNavbar } from '@/components/ui/top-navbar';
import Image from 'next/image';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import type { SearchHistoryItem } from '@/lib/searchHistorySlice';

export default function SearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const {
    displayedHistory,
    isExpanded,
    showExpandButton,
    addSearchRecord,
    deleteRecord,
    clearAll,
    toggle
  } = useSearchHistory();

  // 搜索结果（静态阶段：固定显示 James）
  const [searchResult, setSearchResult] = useState<{
    name: string;
    address: string;
    avatar: string;
  } | null>(null);

  // 模拟搜索（静态阶段）
  useEffect(() => {
    if (searchTerm.trim()) {
      // 延迟一下模拟搜索效果
      const timer = setTimeout(() => {
        setSearchResult({
          name: 'James',
          address: searchTerm,
          avatar: '/me/me2.png'
        });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResult(null);
    }
  }, [searchTerm]);

  // 点击搜索历史，回填到搜索框
  const handleHistoryClick = (content: string) => {
    setSearchTerm(content);
  };

  // 清除搜索框
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResult(null);
  };

  // 执行搜索（回车或点击）
  const handleSearch = () => {
    if (searchTerm.trim()) {
      addSearchRecord(searchTerm);
    }
  };

  // 监听回车键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 点击搜索结果（后续可以跳转到详情页）
  const handleResultClick = () => {
    // TODO: 跳转到联系人详情或聊天页
    console.log('点击了搜索结果:', searchResult);
  };

  // 删除单条历史
  const handleDeleteHistory = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    deleteRecord(itemId);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 顶部导航栏 */}
      <TopNavbar />

      {/* 搜索栏 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          <Input
            type="text"
            placeholder="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10 bg-gray-100 border-none rounded-full focus-visible:ring-1 focus-visible:ring-gray-300"
            autoFocus
          />
          {searchTerm && (
            <Button
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-full hover:bg-gray-200"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <ScrollArea className="flex-1">
        {!searchTerm ? (
          /* 搜索历史 */
          displayedHistory.length > 0 ? (
            <div className="px-4 py-4">
              {/* 标题栏 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-500">最近在搜</h3>
                <div className="flex items-center gap-1">
                  {showExpandButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 hover:bg-gray-100"
                      onClick={toggle}
                    >
                      {isExpanded ? '收起' : '展开'}
                      {isExpanded ? (
                        <ChevronUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ChevronDown className="ml-1 h-3 w-3" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-gray-100"
                    onClick={clearAll}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </div>

              {/* 历史记录网格 */}
              <div className="grid grid-cols-2 gap-2">
                {displayedHistory.map((item: SearchHistoryItem) => (
                  <div
                    key={item.id}
                    className="relative flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group"
                    onClick={() => handleHistoryClick(item.content)}
                  >
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">
                      {item.content.length > 15
                        ? `${item.content.slice(0, 6)}...${item.content.slice(-4)}`
                        : item.content}
                    </span>
                    <Button
                      variant="ghost"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 hover:bg-gray-200 rounded-full"
                      onClick={(e) => handleDeleteHistory(e, item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 空状态 */
            <div className="flex flex-col items-center justify-center py-20">
              <Search className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">暂无搜索历史</p>
            </div>
          )
        ) : (
          /* 搜索结果 */
          searchResult && (
            <div className="px-4 py-4">
              {/* 分类标题 */}
              <h3 className="text-xs px-4 py-3 font-medium text-gray-600 bg-[#ececec] -mx-4 mb-3">
                联系人
              </h3>

              {/* 搜索结果项 */}
              <div
                className="flex items-center p-3 hover:bg-gray-50 bg-white cursor-pointer rounded-lg transition-colors"
                onClick={handleResultClick}
              >
                <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                  <Image
                    src={searchResult.avatar}
                    alt={searchResult.name}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 ml-3 min-w-0">
                  <h3 className="font-medium text-sm mb-1">
                    {searchResult.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {searchResult.address}
                  </p>
                </div>
              </div>
            </div>
          )
        )}
      </ScrollArea>
    </div>
  );
}
