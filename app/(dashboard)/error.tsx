'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 仪表板区域错误边界组件
 * 捕获仪表板内的错误，保持底部导航可用
 */
export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        {/* 错误图标 */}
        <div className="mb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        {/* 标题和描述 */}
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-bold">页面加载失败</h2>
          <p className="text-sm text-muted-foreground">
            当前页面遇到了一个错误，请尝试刷新页面。
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col space-y-2">
          <Button onClick={reset} size="sm" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            重新加载
          </Button>
          <Link href="/">
            <Button variant="outline" size="sm" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              回到首页
            </Button>
          </Link>
        </div>

        {/* 开发环境错误详情 */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              错误详情
            </summary>
            <div className="mt-2 rounded bg-muted p-2 text-xs  ">
              <p className="text-destructive">{error.message}</p>
            </div>
          </details>
        )}
      </Card>
    </div>
  );
}