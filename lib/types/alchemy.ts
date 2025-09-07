/**
 * Alchemy API 类型定义
 */

// 交易收据接口
export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  cumulativeGasUsed: string;
  gasUsed: string;
  contractAddress: string | null;
  logs: Log[];
  logsBloom: string;
  status: string;
  effectiveGasPrice: string;
  type: string;
}

// 日志接口
export interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  blockHash: string;
  transactionHash: string;
  transactionIndex: string;
  logIndex: string;
  removed: boolean;
}

// Alchemy API 响应接口
export interface AlchemyApiResponse<T = any> {
  jsonrpc: string;
  id: number;
  result: T;
}

// Gas费计算结果
export interface GasFeeResult {
  gasFeeWei: string;        // Gas费（Wei单位）
  gasFeeEth: string;        // Gas费（ETH单位）
  gasFeeUsd?: string;       // Gas费（USD单位，可选）
  gasUsed: string;          // 使用的Gas量
  effectiveGasPrice: string; // 有效的Gas价格
}

// 网络映射
export interface NetworkMapping {
  [key: number]: {
    alchemyNetwork: string;
    displayName: string;
    blockExplorer: string;
  };
}
