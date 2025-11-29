'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { RedPacketMessage } from './RedPacketMessage';
import { useHasClaimed } from '@/lib/RedPacketAbi';
import type { RedPacketConfig } from './types';

interface RedPacketMessageWrapperProps {
  config: RedPacketConfig;
  onClick?: () => void;
}

/**
 * 红包消息包装器 - 自动查询已领取状态
 * 使用 hasClaimed 合约函数判断当前用户是否已领取
 */
export function RedPacketMessageWrapper({
  config,
  onClick
}: RedPacketMessageWrapperProps) {
  const { address: currentAddress } = useAccount();

  // 查询当前用户是否已领取此红包
  const { data: hasClaimed } = useHasClaimed(
    config.packetId ? BigInt(config.packetId) : undefined,
    currentAddress
  );

  // 确定红包状态
  const status = useMemo(() => {
    // 优先使用 config 中的 status（如果已过期或已领完）
    if (config.status === 'expired') return 'expired';

    // 如果当前用户已领取，显示为 claimed
    if (hasClaimed) return 'claimed';

    // 默认为 active
    return 'active';
  }, [config.status, hasClaimed]);

  return <RedPacketMessage config={config} status={status} onClick={onClick} />;
}
