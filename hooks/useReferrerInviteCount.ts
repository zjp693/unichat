'use client';

/**
 * 查询邀请人数 Hook
 *
 * 使用 getReferralCount 合约方法查询某个地址在某个群中邀请了多少人
 */

import { useReadContract } from 'wagmi';
import { parseAbi } from 'viem';

export function useReferrerInviteCount(
  groupAddress: `0x${string}` | undefined,
  referrerAddress: `0x${string}` | undefined
) {
  const { data, isLoading, error } = useReadContract({
    address: groupAddress,
    abi: parseAbi([
      'function getReferralCount(address) view returns (uint256)'
    ]),
    functionName: 'getReferralCount',
    args: referrerAddress ? [referrerAddress] : undefined,
    query: {
      enabled: !!groupAddress && !!referrerAddress
    }
  });

  return {
    inviteCount: data ? Number(data) : 0,
    isLoading,
    error
  };
}
