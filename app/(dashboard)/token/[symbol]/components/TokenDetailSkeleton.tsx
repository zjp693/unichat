'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function TokenDetailSkeleton() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center px-4 py-4 bg-white">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 flex items-center justify-center"
          onClick={() => router.back()}
        >
          <img src="/contacts/arrow_left.png" alt="" className="h-4 object-cover" />
        </Button>
        <div className="flex items-center space-x-2 ml-3">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="text-sm">
            <div className="h-4 bg-gray-200 rounded w-12 animate-pulse mb-1"></div>
            <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="h-8 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-32 animate-pulse" />
      </div>

      <div className="px-6 py-1 bg-gray-100">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-28" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
