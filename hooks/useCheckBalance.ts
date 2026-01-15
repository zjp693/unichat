import { useChainId, usePublicClient, useAccount } from 'wagmi';
import { Address, formatEther, Abi } from 'viem';
import { getNetworkById } from '@/lib/web3/networks';

/**
 * 余额检查结果
 */
interface BalanceCheckResult {
  success: boolean;
  message?: string;
  estimatedCost?: bigint;
}

/**
 * 余额检查 Hook
 * 提供原生代币(Gas费)和ERC20代币余额检查
 */
export function useCheckBalance() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();

  /**
   * 获取当前链的原生代币符号 (ETH/BNB)
   */
  const getNativeSymbol = (): string => {
    const network = getNetworkById(chainId as 42161 | 204);
    return network?.nativeCurrency?.symbol || 'ETH';
  };

  /**
   * 智能格式化金额显示
   * 自动选择合适的精度,避免显示 0.000000
   */
  const formatAmount = (wei: bigint): string => {
    const eth = formatEther(wei);
    const num = Number(eth);

    // 如果大于等于 0.0001,显示 4 位小数
    if (num >= 0.0001) {
      return num.toFixed(4);
    }
    // 如果大于等于 0.00000001,显示 8 位小数
    else if (num >= 0.00000001) {
      return num.toFixed(8);
    }
    // 如果更小,使用科学计数法
    else {
      return num.toExponential(2);
    }
  };

  /**
   * 检查原生代币余额是否足够支付 Gas 费用
   * @param contractAddress 合约地址
   * @param abi 合约 ABI
   * @param functionName 函数名
   * @param args 函数参数
   * @returns 检查结果
   */
  const checkNativeBalance = async (
    contractAddress: Address,
    abi: Abi,
    functionName: string,
    args: any[]
  ): Promise<BalanceCheckResult> => {
    try {
      if (!userAddress || !publicClient || !contractAddress) {
        return {
          success: false,
          message: '请先连接钱包'
        };
      }

      // 1. 获取用户余额
      const balance = await publicClient.getBalance({
        address: userAddress
      });

      const symbol = getNativeSymbol();

      // 2. 估算 Gas 费用
      try {
        const gasEstimate = await publicClient.estimateContractGas({
          address: contractAddress,
          abi,
          functionName,
          args,
          account: userAddress
        });

        const gasPrice = await publicClient.getGasPrice();
        const estimatedCost = gasEstimate * gasPrice;

        // 3. 检查余额是否足够 (不留余量,按用户要求)
        if (balance < estimatedCost) {
          const formattedCost = formatAmount(estimatedCost);

          return {
            success: false,
            message: `需要约 ${formattedCost} ${symbol}`,
            estimatedCost
          };
        }

        console.log('✅ 余额检查通过:', {
          balance: formatEther(balance),
          estimatedCost: formatEther(estimatedCost),
          gasEstimate: gasEstimate.toString(),
          symbol
        });

        return { success: true, estimatedCost };
      } catch (estimateError: any) {
        // Gas 估算失败,使用固定值检查
        console.warn('⚠️ Gas 估算失败,使用固定值:', estimateError);

        const gasPrice = await publicClient.getGasPrice();
        const estimatedGas = 500000n; // 预估 50 万 gas
        const estimatedCost = estimatedGas * gasPrice;

        if (balance < estimatedCost) {
          const formattedCost = formatAmount(estimatedCost);

          return {
            success: false,
            message: `需要约 ${formattedCost} ${symbol}`,
            estimatedCost
          };
        }

        return { success: true, estimatedCost };
      }
    } catch (error: any) {
      console.error('❌ 余额检查失败:', error);
      return {
        success: false,
        message: '检查余额失败,请重试'
      };
    }
  };

  return {
    checkNativeBalance,
    getNativeSymbol
  };
}
