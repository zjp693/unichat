'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface ChatListSkeletonProps {
  count?: number;
}

/**
 * 聊天列表骨架屏组件
 * 用于加载时显示占位效果
 */
export function ChatListSkeleton({ count = 5 }: ChatListSkeletonProps) {
  return (
    <div className="p-1">
      {Array.from({ length: count }).map((_, index) => (
        <ChatItemSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * 单个聊天项骨架屏
 */
function ChatItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-lg mb-1">
      {/* 头像骨架 */}
      <Skeleton className="w-14 h-14 rounded-sm flex-shrink-0" />

      {/* 右侧内容 */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* 第一行：名称 + 时间 */}
        <div className="flex items-center justify-between">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-12 h-3" />
        </div>
        {/* 第二行：消息预览 */}
        <Skeleton className="w-48 h-3" />
      </div>
    </div>
  );
}

export default ChatListSkeleton;
