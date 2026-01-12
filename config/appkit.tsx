import { cookieStorage, createStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { arbitrum } from '@reown/appkit/networks';
import type { Chain } from 'viem';
import { http, fallback } from 'viem';
import { opBNB, arbitrumRpcUrls, opBNBRpcUrls } from '@/lib/web3/networks';

// 从环境变量读取项目 ID
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

// 用显式常量承载站点 URL，避免 SSR 环境下访问 window
export const appUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://unichat-rho.vercel.app';

// 确保项目 ID 在构建时已定义
if (!projectId) {
  throw new Error(
    'NEXT_PUBLIC_PROJECT_ID is not defined. Please set it in .env.local'
  );
}

/**
 * 支持的网络列表
 * Arbitrum (42161) + opBNB (204)
 */
export const networks: [Chain, ...Chain[]] = [arbitrum, opBNB as Chain];

/**
 * 创建 Wagmi 适配器实例
 * 配置多链 RPC 和 fallback 策略
 */
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }), // 使用 cookieStorage 支持 SSR
  ssr: true, // 启用 SSR 支持
  projectId,
  networks, // 传递多链网络数组
  // 🔧 配置自定义传输层（使用多个RPC节点，自动故障转移）
  transports: {
    // Arbitrum RPC fallback
    [arbitrum.id]: fallback(
      arbitrumRpcUrls.map((url) =>
        http(url, {
          batch: true, // 启用批量请求
          retryCount: 3, // 失败重试3次
          timeout: 10_000 // 10秒超时
        })
      )
    ),
    // opBNB RPC fallback
    [opBNB.id]: fallback(
      opBNBRpcUrls.map((url) =>
        http(url, {
          batch: true,
          retryCount: 3,
          timeout: 10_000
        })
      )
    )
  },
  pollingInterval: 8_000 // 设置全局轮询间隔为 8 秒
});

// 导出适配器生成的 Wagmi 配置
export const config = wagmiAdapter.wagmiConfig;
