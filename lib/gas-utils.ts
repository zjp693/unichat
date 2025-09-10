import { TransactionReceipt, GasFeeResult } from './types/alchemy';

/**
 * Gas费计算和格式化工具函数
 */

/**
 * 将Wei转换为ETH
 * @param wei Wei单位的数值（字符串或数字）
 * @returns ETH单位的数值（字符串）
 */
export function weiToEth(wei: string | number): string {
  const weiBigInt = BigInt(wei.toString());
  const ethBigInt = weiBigInt / BigInt('1000000000000000000'); // 10^18
  const remainder = weiBigInt % BigInt('1000000000000000000');

  // 计算小数部分（保留最多8位小数）
  const decimalPlaces = 8;
  const remainderStr = remainder.toString().padStart(18, '0');
  const decimalPart = remainderStr.substring(0, decimalPlaces);

  // 移除末尾的0
  const cleanedDecimal = decimalPart.replace(/0+$/, '');

  if (cleanedDecimal === '') {
    return ethBigInt.toString();
  }

  return `${ethBigInt.toString()}.${cleanedDecimal}`;
}

/**
 * 计算Gas费
 * @param gasUsed 使用的Gas量
 * @param effectiveGasPrice 有效的Gas价格
 * @returns Gas费结果对象
 */
export function calculateGasFee(gasUsed: string, effectiveGasPrice: string): GasFeeResult {
  try {
    const gasUsedBigInt = BigInt(gasUsed);
    const gasPriceBigInt = BigInt(effectiveGasPrice);
    const gasFeeWei = gasUsedBigInt * gasPriceBigInt;

    return {
      gasFeeWei: gasFeeWei.toString(),
      gasFeeEth: weiToEth(gasFeeWei.toString()),
      gasUsed: gasUsed,
      effectiveGasPrice: effectiveGasPrice
    };
  } catch (error) {
    throw new Error(`Gas费计算失败: ${error}`);
  }
}

/**
 * 从交易收据计算Gas费
 * @param receipt Alchemy交易收据
 * @returns Gas费结果对象
 */
export function calculateGasFeeFromReceipt(receipt: TransactionReceipt): GasFeeResult {
  if (!receipt.gasUsed || !receipt.effectiveGasPrice) {
    throw new Error('交易收据缺少必要的gas信息');
  }

  return calculateGasFee(receipt.gasUsed, receipt.effectiveGasPrice);
}

/**
 * 格式化Gas费显示
 * @param gasFeeEth ETH单位的Gas费
 * @param maxFractionDigits 最大小数位数，默认6
 * @returns 格式化后的字符串
 */
export function formatGasFeeDisplay(gasFeeEth: string, maxFractionDigits: number = 6): string {
  try {
    const ethValue = parseFloat(gasFeeEth);
    if (isNaN(ethValue)) {
      return '0.000000';
    }

    // 根据金额大小调整显示精度
    let fractionDigits = maxFractionDigits;
    if (ethValue >= 1) {
      fractionDigits = 4;
    } else if (ethValue >= 0.1) {
      fractionDigits = 5;
    } else if (ethValue >= 0.01) {
      fractionDigits = 6;
    } else if (ethValue >= 0.001) {
      fractionDigits = 7;
    } else {
      fractionDigits = 8;
    }

    return ethValue.toFixed(fractionDigits).replace(/\.?0+$/, '');
  } catch (error) {
    console.warn('格式化Gas费失败:', error);
    return gasFeeEth;
  }
}

/**
 * 估算Gas费的USD价值（基于ETH价格）
 * 注意：这是一个简化的估算，实际应用中应该使用实时价格API
 * @param gasFeeEth ETH单位的Gas费
 * @param ethPrice ETH价格（USD）
 * @returns USD估算值
 */
export function estimateGasFeeUsd(gasFeeEth: string, ethPrice: number = 2500): string {
  try {
    const ethValue = parseFloat(gasFeeEth);
    if (isNaN(ethValue)) {
      return '0.00';
    }

    const usdValue = ethValue * ethPrice;

    // 根据USD金额大小调整显示精度
    if (usdValue >= 1) {
      return usdValue.toFixed(2);
    } else if (usdValue >= 0.01) {
      return usdValue.toFixed(4);
    } else {
      return usdValue.toFixed(6);
    }
  } catch (error) {
    console.warn('估算Gas费USD价值失败:', error);
    return '0.00';
  }
}

/**
 * 生成完整的Gas费显示文本
 * @param gasFeeResult Gas费结果对象
 * @param ethPrice ETH价格（可选，用于USD估算）
 * @returns 格式化的显示文本，如 "0.00001234 ETH ≈ $0.023"
 */
export function formatGasFeeText(
  gasFeeResult: GasFeeResult,
  ethPrice?: number
): string {
  const ethDisplay = formatGasFeeDisplay(gasFeeResult.gasFeeEth);

  if (ethPrice && ethPrice > 0) {
    const usdEstimate = estimateGasFeeUsd(gasFeeResult.gasFeeEth, ethPrice);
    return `${ethDisplay} ETH ≈ $${usdEstimate}`;
  }

  return `${ethDisplay} ETH`;
}

/**
 * 检查交易哈希是否有效
 * @param hash 交易哈希
 * @returns 是否有效
 */
export function isValidTransactionHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * 获取网络的Alchemy网络名称
 * @param network 网络名称
 * @returns Alchemy网络名称
 */
export function getAlchemyNetworkName(network: string): string {
  const networkMapping: Record<string, string> = {
    'ethereum': 'eth-mainnet',
    'arbitrum': 'arb-mainnet',
    'polygon': 'polygon-mainnet',
    'bsc': 'bsc-mainnet',
    'optimism': 'opt-mainnet',
    'avalanche': 'avax-mainnet',
    'fantom': 'fantom-mainnet',
    'cronos': 'cronos-mainnet',
    'gnosis': 'gnosis-mainnet',
  };

  return networkMapping[network.toLowerCase()] || 'eth-mainnet';
}

/**
 * 检查网络是否受支持
 * @param network 网络名称
 * @returns 是否受支持
 */
export function isSupportedNetwork(network: string): boolean {
  const supportedNetworks = [
    'ethereum', 'arbitrum', 'polygon', 'bsc',
    'optimism', 'avalanche', 'fantom', 'cronos', 'gnosis'
  ];

  return supportedNetworks.includes(network.toLowerCase());
}
