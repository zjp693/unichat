'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** 左侧自定义内容，默认为返回箭头 */
  left?: React.ReactNode;
  /** 覆盖默认返回行为 */
  onBack?: () => void;
  /** 隐藏左侧 */
  hideLeft?: boolean;

  /** 快捷方式：字符串标题 */
  title?: string;
  /** 完全自定义中间内容 */
  center?: React.ReactNode;

  /** 右侧内容（自行处理点击） */
  right?: React.ReactNode;

  /** 额外样式 */
  className?: string;
  /** 是否显示底部边框，默认 true */
  bordered?: boolean;
}

export function PageHeader({
  left,
  onBack,
  hideLeft = false,
  title,
  center,
  right,
  className,
  bordered = true
}: PageHeaderProps) {
  const router = useRouter();

  // 默认返回行为
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 bg-white',
        bordered && 'border-b border-gray-100',
        className
      )}
    >
      {/* 左侧 - 固定宽度保证居中 */}
      <div className="w-10 flex justify-start">
        {!hideLeft && (
          <button onClick={handleBack} className="p-1">
            {left || (
              <ChevronLeft
                className="w-6 h-6 text-gray-900"
                strokeWidth={1.5}
              />
            )}
          </button>
        )}
      </div>

      {/* 中间 - flex-1 自动居中 */}
      <div className="flex-1 flex justify-center">
        {center ||
          (title && (
            <h1 className="text-base font-medium text-gray-900">{title}</h1>
          ))}
      </div>

      {/* 右侧 - 固定宽度保证居中 */}
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  );
}
