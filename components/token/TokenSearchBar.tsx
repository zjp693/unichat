'use client';

import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { TokenSearchBarProps } from './types';

export function TokenSearchBar({
  searchKeyword,
  onSearchChange,
  onAddClick
}: TokenSearchBarProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 bg-white sticky top-0 z-10">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="搜索代币名称或地址"
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 pr-4 h-12 border-2 border-gray-200 rounded-full focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all bg-gray-50 hover:bg-white"
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddClick}
        className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
