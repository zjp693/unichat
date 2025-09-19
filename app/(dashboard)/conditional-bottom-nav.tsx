'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from './bottom-nav';

export function ConditionalBottomNav() {
  const pathname = usePathname();

  // 只在这些路径显示底部导航
  const showBottomNavPaths = [
    '/', // 主界面
    '/contacts', // 联系人页面
    '/discover', // 发现页面
    '/me' // 个人页面
  ];

  // 检查当前路径是否需要显示底部导航
  const shouldShowBottomNav = showBottomNavPaths.includes(pathname);

  // 如果需要显示，则渲染底部导航
  if (shouldShowBottomNav) {
    return <BottomNav />;
  }

  // 否则不渲染底部导航
  return null;
}
