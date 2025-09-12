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
 * 全局错误边界组件
 * 捕获并显示应用中的运行时错误
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 记录错误到控制台用于调试
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          {/* 错误图标 */}
          <div className="mb-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>

          {/* 标题和描述 */}
          <div className="mb-8">
            <h1 className="mb-3 text-2xl font-bold">出现错误</h1>
            <p className="mb-4 text-muted-foreground">
              抱歉，应用程序遇到了一个意外错误。
            </p>
            
            {/* 开发环境下显示错误详情 */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  查看错误详情
                </summary>
                <div className="mt-2 rounded bg-muted p-3 text-xs  ">
                  <p className="text-destructive">{error.message}</p>
                  {error.digest && (
                    <p className="mt-1 text-muted-foreground">
                      错误ID: {error.digest}
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col space-y-3">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </Link>
          </div>

          {/* 帮助信息 */}
          <div className="mt-8 text-sm text-muted-foreground">
            <p>如果问题持续存在，请联系技术支持。</p>
          </div>
        </Card>
      </div>
    </div>
  );
}