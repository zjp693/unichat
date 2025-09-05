'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function TransactionsSkeleton() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-4 bg-white border-b">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 flex items-center justify-center"
          onClick={() => router.back()}
        >
          <img src="/contacts/arrow_left.png" alt="返回" className="h-4 object-cover" />
        </Button>
        <div className="text-[#303133] text-base font-semibold">交易记录</div>
        <div className="w-5" />
      </div>

      {/* 加载骨架屏 */}
      <div className="flex-1 bg-gray-50">
        {/* 联系人信息骨架屏 */}
        <div className="bg-white mx-4 mt-4 rounded-lg p-4">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse mb-3"></div>
            <div className="h-5 bg-gray-200 rounded w-20 animate-pulse mb-2"></div>
            <div className="flex items-center space-x-4 mt-3">
              <div className="text-center">
                <div className="h-6 bg-gray-200 rounded w-12 animate-pulse mb-1"></div>
                <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
              </div>
              <div className="text-center">
                <div className="h-6 bg-gray-200 rounded w-24 animate-pulse mb-1"></div>
                <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-100 rounded w-64 animate-pulse mt-3"></div>
          </div>
        </div>

        {/* 交易记录骨架屏 */}
        <div className="mx-4 mt-4">
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse mb-3"></div>
          <div className="bg-white rounded-lg">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center px-4 py-3 border-b border-gray-100 last:border-b-0">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse mr-4"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-gray-100 rounded w-48 animate-pulse"></div>
                    <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
