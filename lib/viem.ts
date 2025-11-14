import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';

// 创建公共客户端用于读取合约数据
export const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http()
});

// 合约地址
export const FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
export const UNICHAT_TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_UNICHAT_TOKEN_ADDRESS as `0x${string}`;

// 验证合约地址配置
if (!FACTORY_ADDRESS) {
  console.error('⚠️ 警告: NEXT_PUBLIC_FACTORY_ADDRESS 环境变量未设置');
}

if (!UNICHAT_TOKEN_ADDRESS) {
  console.error('⚠️ 警告: NEXT_PUBLIC_UNICHAT_TOKEN_ADDRESS 环境变量未设置');
}
