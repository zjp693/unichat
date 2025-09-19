'use client';

import { usePathname } from 'next/navigation';

interface ConditionalContainerProps {
  children: React.ReactNode;
}

export function ConditionalContainer({ children }: ConditionalContainerProps) {
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

  // 根据是否显示底部导航来决定底部内边距
  const containerClass = shouldShowBottomNav
    ? 'flex flex-col flex-1 pb-16' // 有底部导航时需要预留空间
    : 'flex flex-col flex-1'; // 没有底部导航时不需要底部内边距

  return <div className={containerClass}>{children}</div>;
}
