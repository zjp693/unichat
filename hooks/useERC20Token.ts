import { useReadContract } from 'wagmi';
import type { Address } from 'viem';

const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * Hook to get ERC20 token symbol
 */
export function useTokenSymbol(tokenAddress: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!tokenAddress
    }
  });
}

/**
 * Hook to get ERC20 token decimals
 */
export function useTokenDecimals(tokenAddress: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: [
      {
        inputs: [],
        name: 'decimals',
        outputs: [{ type: 'uint8' }],
        stateMutability: 'view',
        type: 'function'
      }
    ] as const,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress
    }
  });
}
