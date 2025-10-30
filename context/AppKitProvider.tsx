'use client';

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, cookieToInitialState, type Config } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { appUrl } from 'config/appkit';
// 从配置文件导入 config、networks、projectId 和 wagmiAdapter
import { config, networks, projectId, wagmiAdapter } from 'config/appkit';
// 单独导入默认网络
import {
  // mainnet
  arbitrum
} from '@reown/appkit/networks';

// 创建 React Query 客户端，用于管理缓存和数据同步
const queryClient = new QueryClient();

// AppKit 元数据配置
const metadata = {
  name: 'UniChat', // 应用名称
  description: '现代化 Web3 社交平台', // 应用描述
  url: appUrl, // 应用 URL
  icons: ['/discover/unishop.png'] // Web3钱包连接界面显示的应用图标
};

// 在组件渲染周期外初始化 AppKit
// 添加 projectId 检查以确保类型安全，尽管配置已经抛出错误
if (!projectId) {
  console.error('AppKit 初始化错误：缺少项目 ID');
  // 可选择抛出错误或渲染后备 UI
} else {
  createAppKit({
    adapters: [wagmiAdapter], // Wagmi 适配器
    // 使用非空断言 `!`，因为 projectId 在运行时已检查，TypeScript 需要
    projectId: projectId!, // Reown 项目 ID
    // 直接传递网络（类型现在从配置中正确推断）
    networks: networks, // 支持的区块链网络
    defaultNetwork: arbitrum, // 默认网络（arbitrum）
    metadata, // 应用元数据
    features: { analytics: true }, // 启用分析功能
    themeMode: 'light', // 主题模式：浅色
    themeVariables: {
      '--w3m-accent': '#635BFF', // 主题色：紫色
      '--w3m-color-mix': '#635BFF', // 混合色：紫色
      '--w3m-color-mix-strength': 20 // 混合强度
    }
  });
}

/**
 * Context Provider 组件
 * 为整个应用提供 Web3 连接和状态管理功能
 */
export default function ContextProvider({
  children,
  cookies
}: {
  children: ReactNode; // 子组件
  cookies: string | null; // 来自服务器的 Cookie，用于 SSR 水合
}) {
  // 计算 Wagmi SSR 水合的初始状态
  const initialState = cookieToInitialState(config as Config, cookies);

  return (
    // 将配置转换为 Config 类型用于 WagmiProvider
    <WagmiProvider config={config as Config} initialState={initialState}>
      {/* React Query 提供器，用于数据缓存和状态管理 */}
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
