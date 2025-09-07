import { useQuery } from '@tanstack/react-query';
import { TransactionReceipt, GasFeeResult } from '@/lib/types/alchemy';
import {
  calculateGasFeeFromReceipt,
  formatGasFeeText,
  isValidTransactionHash,
  isSupportedNetwork,
  formatGasFeeDisplay,
  estimateGasFeeUsd
} from '@/lib/gas-utils';

/**
 * Gas费查询参数
 */
export interface GasFeeParams {
  transactionHash: string;
  network?: string;
  ethPrice?: number; // ETH价格，用于USD估算
  enabled?: boolean; // 是否启用查询
}

/**
 * Gas费查询结果
 */
export interface GasFeeQueryResult {
  // 核心数据
  gasFeeResult?: GasFeeResult;
  gasFeeText?: string; // 格式化的显示文本，如 "0.00001234 ETH ≈ $0.023"

  // 原始数据
  receipt?: TransactionReceipt;

  // 状态
  loading: boolean;
  error: string | null;
  isError: boolean;
  isSuccess: boolean;

  // 工具方法
  refetch: () => void;
}

/**
 * 获取交易的Gas费信息
 *
 * @param params 查询参数
 * @returns Gas费查询结果
 *
 * @example
 * ```typescript
 * const { gasFeeText, loading, error } = useGasFee({
 *   transactionHash: '0x1234...',
 *   network: 'ethereum',
 *   ethPrice: 2500
 * });
 *
 * // 显示: "0.00001234 ETH ≈ $0.031"
 * ```
 */
export function useGasFee(params: GasFeeParams): GasFeeQueryResult {
  const {
    transactionHash,
    network = 'ethereum',
    ethPrice,
    enabled = true
  } = params;

  // 验证输入参数
  const isValidParams = isValidTransactionHash(transactionHash) &&
                       isSupportedNetwork(network) &&
                       enabled;

  // 使用React Query进行数据获取
  const {
    data,
    isLoading,
    error,
    isError,
    isSuccess,
    refetch
  } = useQuery({
    queryKey: ['gas-fee', transactionHash, network],
    queryFn: async (): Promise<{
      receipt: TransactionReceipt;
      gasFeeResult: GasFeeResult;
      gasFeeText: string;
    }> => {
      // 调用我们的API路由
      const response = await fetch(
        `/api/gas-fee?transactionHash=${encodeURIComponent(transactionHash)}&network=${encodeURIComponent(network)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const apiData = await response.json();

      if (!apiData.success || !apiData.receipt) {
        throw new Error(apiData.error || '获取交易收据失败');
      }

      const receipt: TransactionReceipt = apiData.receipt;

      // 计算Gas费
      const gasFeeResult = calculateGasFeeFromReceipt(receipt);

      // 生成显示文本
      const gasFeeText = formatGasFeeText(gasFeeResult, ethPrice);

      return {
        receipt,
        gasFeeResult,
        gasFeeText
      };
    },
    enabled: isValidParams,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 10 * 60 * 1000,   // 10分钟垃圾回收
    retry: (failureCount, error) => {
      // 对于404错误（交易不存在）不重试
      if (error?.message?.includes('404') || error?.message?.includes('未找到')) {
        return false;
      }
      // 其他错误最多重试2次
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // 处理错误信息
  let errorMessage: string | null = null;
  if (isError && error) {
    if (error.message.includes('404') || error.message.includes('未找到')) {
      errorMessage = '交易不存在或正在确认中';
    } else if (error.message.includes('不支持的网络')) {
      errorMessage = `不支持的网络: ${network}`;
    } else if (error.message.includes('无效的交易哈希')) {
      errorMessage = '无效的交易哈希格式';
    } else if (error.message.includes('服务配置错误')) {
      errorMessage = '服务暂时不可用';
    } else {
      errorMessage = '获取Gas费信息失败，请稍后重试';
    }
  }

  // 如果参数无效，提供友好的错误信息
  if (!isValidParams && enabled) {
    if (!isValidTransactionHash(transactionHash)) {
      errorMessage = '无效的交易哈希格式';
    } else if (!isSupportedNetwork(network)) {
      errorMessage = `不支持的网络: ${network}`;
    }
  }

  return {
    // 核心数据
    gasFeeResult: data?.gasFeeResult,
    gasFeeText: data?.gasFeeText,

    // 原始数据
    receipt: data?.receipt,

    // 状态
    loading: isLoading,
    error: errorMessage,
    isError: isError || (!isValidParams && enabled),
    isSuccess: isSuccess && isValidParams,

    // 工具方法
    refetch
  };
}

/**
 * 获取简化版本的Gas费信息（仅返回格式化文本）
 *
 * @param transactionHash 交易哈希
 * @param network 网络名称（默认：ethereum）
 * @param ethPrice ETH价格（用于USD估算）
 * @returns 格式化的Gas费文本或null
 */
export function useGasFeeText(
  transactionHash: string,
  network: string = 'ethereum',
  ethPrice?: number
): string | null {
  const { gasFeeText, loading, error } = useGasFee({
    transactionHash,
    network,
    ethPrice
  });

  if (loading || error) {
    return null;
  }

  return gasFeeText || null;
}

/**
 * 获取Gas费的ETH值
 *
 * @param transactionHash 交易哈希
 * @param network 网络名称
 * @returns ETH单位的Gas费或null
 */
export function useGasFeeEth(transactionHash: string, network: string = 'ethereum'): string | null {
  const { gasFeeResult, loading, error } = useGasFee({
    transactionHash,
    network
  });

  if (loading || error || !gasFeeResult) {
    return null;
  }

  return formatGasFeeDisplay(gasFeeResult.gasFeeEth);
}

/**
 * 获取Gas费的USD估算值
 *
 * @param transactionHash 交易哈希
 * @param network 网络名称
 * @param ethPrice ETH价格
 * @returns USD单位的Gas费估算值或null
 */
export function useGasFeeUsd(
  transactionHash: string,
  network: string = 'ethereum',
  ethPrice: number = 2500
): string | null {
  const { gasFeeResult, loading, error } = useGasFee({
    transactionHash,
    network,
    ethPrice
  });

  if (loading || error || !gasFeeResult) {
    return null;
  }

  return estimateGasFeeUsd(gasFeeResult.gasFeeEth, ethPrice);
}
