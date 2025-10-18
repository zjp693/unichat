/*
 * @Author: zhangjianping 942680978@qq.com
 * @Date: 2025-09-03 15:01:55
 * @LastEditors: zhangjianping 942680978@qq.com
 * @LastEditTime: 2025-10-17 23:49:28
 * @FilePath: \unichat\config\appkit.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { cookieStorage, createStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import {
  // mainnet,
  arbitrum
  // bsc
} from '@reown/appkit/networks';
import type { Chain } from 'viem';

// 从环境变量读取项目 ID
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

// 确保项目 ID 在构建时已定义
if (!projectId) {
  throw new Error(
    'NEXT_PUBLIC_PROJECT_ID is not defined. Please set it in .env.local'
  );
}

// 定义支持的网络，显式类型化为非空的链数组
export const networks: [Chain, ...Chain[]] = [
  // mainnet,
  arbitrum
  // bsc
];

// 创建 Wagmi 适配器实例
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }), // 使用 cookieStorage 支持 SSR
  ssr: true, // 启用 SSR 支持
  projectId,
  networks, // 传递显式类型化的网络数组
  pollingInterval: 3_000 // 设置全局轮询间隔为 3 秒
});

// 导出适配器生成的 Wagmi 配置
export const config = wagmiAdapter.wagmiConfig;
