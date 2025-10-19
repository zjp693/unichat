import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import { headers } from 'next/headers';
import ContextProvider from 'context/AppKitProvider';
import { Toaster } from '@/components/ui/toaster';
import type { Viewport } from 'next';

export const metadata = {
  title: 'UniChat - Web3 社交平台',
  description: '现代化 Web3 社交平台',
  icons: {
    icon: [{ url: '/discover/unishop.png' }]
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover' // 添加此行以启用 env(safe-area-inset-*)
};

// RootLayout 必须是异步函数以使用 headers()
export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // 在服务器上从请求头检索 cookie
  const headersObj = await headers();
  const cookies = headersObj.get('cookie');

  return (
    <html lang="zh">
      <body className="flex min-h-screen w-full flex-col">
        {/* 用 ContextProvider 包装 children，传递 cookies */}
        <ContextProvider cookies={cookies}>{children}</ContextProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
