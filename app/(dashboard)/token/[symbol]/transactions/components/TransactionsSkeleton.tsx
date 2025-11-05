'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function TransactionsSkeleton() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full bg-[#F2F4F9]">
      {/* 交易记录导航栏 */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 flex items-center justify-center"
          onClick={() => router.back()}
        >
          <img
            src="/contacts/arrow_left.png"
            alt="返回"
            className="h-4 object-cover"
          />
        </Button>
        <div className="text-[#303133] text-base font-semibold">交易记录</div>
        <div className="w-5" />
      </div>

      {/* 加载骨架屏（结构与实渲染一致） */}
      <div className="flex-1 bg-[#F2F4F9]">
        {/* 联系人信息骨架屏 */}
        <div className="bg-white mx-3 mt-4 rounded-lg p-6">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse mb-4" />
            <div className="h-5 bg-gray-200 rounded w-24 animate-pulse mb-4" />
            <div className="w-full flex justify-between items-center mb-4">
              <div className="text-center w-[48%] p-3 rounded-md bg-[#edf2fe]">
                <div className="h-4 bg-[#dfe6fd] rounded w-20 mx-auto mb-2 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-16 mx-auto animate-pulse" />
              </div>
              <div className="text-center w-[48%] p-3 rounded-md bg-[#edf2fe]">
                <div className="h-4 bg-[#dfe6fd] rounded w-20 mx-auto mb-2 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-24 mx-auto animate-pulse" />
              </div>
            </div>
            <div className="h-4 bg-gray-100 rounded w-72 animate-pulse" />
          </div>
        </div>

        {/* 筛选标签骨架屏：最近交易记录 + 三个切换按钮 */}
        <div className="mx-4 mt-4 mb-3">
          <div className="flex items-center justify-between">
            {/* 左侧标题占位 */}
            <div className="h-4 bg-gray-200 rounded-lg w-28 animate-pulse" />
            {/* 右侧三个小Tab占位（更小尺寸，靠右对齐） */}
            <div className="flex items-center gap-1 justify-end">
              <div className="h-4 w-10 rounded-lg bg-[#F0F0FF]" />
              <div className="h-4 w-10 rounded-lg bg-[#F5F5F5]" />
              <div className="h-4 w-10 rounded-lg bg-[#F5F5F5]" />
            </div>
          </div>
        </div>

        {/* 交易记录骨架屏 */}
        <div className="mx-4 mt-4">
          <div className="bg-white rounded-lg overflow-hidden">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="relative px-4 py-3 border-b border-[#DCDFE6] last:border-b-0"
              >
                {/* 顶部：标题 + 勾选 + 金额 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mr-2" />
                    <div className="h-4 w-4 rounded-full bg-gray-200 animate-pulse" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                </div>
                {/* 右侧方向箭头占位 */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 bg-gray-100 rounded-sm" />
                {/* 地址两行 */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mr-2" />
                    <div className="h-3 bg-gray-100 rounded w-48" />
                  </div>
                  <div className="flex items-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mr-2" />
                    <div className="h-3 bg-gray-100 rounded w-56" />
                  </div>
                </div>
                {/* 底部：时间 + 美元值 */}
                <div className="flex items-center justify-between mt-3">
                  <div className="h-3 bg-gray-100 rounded w-24" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
