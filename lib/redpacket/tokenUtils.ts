import { Address } from 'viem';
import { erc20Abi, formatUnits, maxUint256 } from 'viem';

/**
 * 获取代币精度
 * @param tokenAddress 代币合约地址，原生代币使用 0x0000000000000000000000000000000000000000
 * @param publicClient Wagmi 的 publicClient
 * @returns 代币精度（decimals）
 */
export async function getTokenDecimals(
  tokenAddress: Address,
  publicClient: any
): Promise<number> {
  // 原生代币 ETH
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    return 18;
  }

  try {
    const decimals = (await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'decimals'
    })) as number;
    return decimals;
  } catch (e) {
    console.warn('获取 Token 精度失败，使用默认值 18', e);
    return 18;
  }
}

/**
 * 检查代币余额是否充足
 * @param tokenAddress 代币合约地址
 * @param userAddress 用户地址
 * @param requiredAmount 需要的金额（wei）
 * @param decimals 代币精度
 * @param publicClient Wagmi 的 publicClient
 * @returns 余额是否足够
 */
export async function checkTokenBalance(
  tokenAddress: Address,
  userAddress: Address,
  requiredAmount: bigint,
  decimals: number,
  publicClient: any
): Promise<boolean> {
  // 原生代币 ETH 可以跳过（由钱包自动检查）
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    return true;
  }

  const balance = (await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress]
  })) as bigint;

  if (balance < requiredAmount) {
    alert(`余额不足，当前余额: ${formatUnits(balance, decimals)}`);
    return false;
  }

  return true;
}

/**
 * 检查并执行 ERC20 Token 授权
 * @param tokenAddress 代币合约地址
 * @param spenderAddress 被授权的合约地址（通常是红包合约）
 * @param amount 需要授权的金额（wei）- 用于检查当前授权是否足够
 * @param userAddress 用户地址
 * @param publicClient Wagmi 的 publicClient
 * @param approveFunc Wagmi 的 writeContractAsync 函数
 * @param chainId 可选，当前链 ID（用于解决某些钱包连接器的兼容性问题）
 * @returns 授权是否成功
 */
export async function approveTokenIfNeeded(
  tokenAddress: Address,
  spenderAddress: Address,
  amount: bigint,
  userAddress: Address,
  publicClient: any,
  approveFunc: any,
  chainId?: number
): Promise<boolean> {
  // 原生代币 ETH 不需要授权
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    return true;
  }

  // 检查当前授权额度
  const allowance = (await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress, spenderAddress]
  })) as bigint;

  if (allowance >= amount) {
    console.log('✅ [approveTokenIfNeeded] 授权额度足够，无需再次授权');
    return true;
  }

  console.log('⚠️ [approveTokenIfNeeded] 授权额度不足，需要重新授权');

  // 请求无限授权（MaxUint256）
  // 行业惯例：Uniswap、Aave 等主流 DeFi 都使用无限授权
  // 优点：用户只需首次授权一次，后续操作无需再授权，节省 gas
  const approveTxHash = await approveFunc({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, maxUint256],
    // 显式传入 chainId，解决 Reown AppKit 连接器兼容性问题
    ...(chainId ? { chainId } : {})
  });

  await publicClient.waitForTransactionReceipt({ hash: approveTxHash });

  return true;
}
