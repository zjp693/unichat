'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import dayjs from 'dayjs';
import { RedPacketMessage } from './RedPacketMessage';
import { useHasClaimed, useGetPacket, PacketStatus } from '@/lib/RedPacketAbi';
import type { RedPacketConfig } from './types';

interface RedPacketMessageWrapperProps {
  config: RedPacketConfig;
  onClick?: () => void;
}

/**
 * 红包消息包装器 - 自动查询红包状态
 * 使用 getPacket 获取红包完整信息，判断是否已领取/已领完/已过期
 */
export function RedPacketMessageWrapper({
  config,
  onClick
}: RedPacketMessageWrapperProps) {
  const { address: currentAddress } = useAccount();

  // 查询红包完整信息
  const { data: packet } = useGetPacket(
    config.packetId ? BigInt(config.packetId) : undefined
  );

  // 查询当前用户是否已领取此红包
  const { data: hasClaimed } = useHasClaimed(
    config.packetId ? BigInt(config.packetId) : undefined,
    currentAddress
  );

  // 确定红包状态
  const status = useMemo(() => {
    // 优先使用 config 中的 status（如果已明确设置）
    if (config.status === 'expired') return 'expired';

    // 如果当前用户已领取，显示为 claimed
    if (hasClaimed) return 'claimed';

    // 如果有红包数据，根据合约状态判断
    if (packet) {
      const packetData = packet as any;

      // 检查合约中的状态
      const contractStatus = Number(packetData.status);
      if (contractStatus === PacketStatus.Exhausted) return 'empty';
      if (contractStatus === PacketStatus.Expired) return 'expired';
      if (contractStatus === PacketStatus.Refunded) return 'expired';

      // 检查是否已领完（remainingCount 或通过 claimedShares == totalShares 判断）
      const claimedShares = Number(packetData.claimedShares || 0);
      const totalShares = Number(packetData.totalShares || 1);
      if (claimedShares >= totalShares) return 'empty';

      // 检查是否过期（当前时间 > 创建时间 + 过期时长）
      const creationTime = Number(
        packetData.creationTime || packetData.createdAt || 0
      );
      const expiryDuration = Number(packetData.expiryDuration || 0);
      const expiryTime = Number(packetData.expiryTime || 0);

      const now = dayjs();

      if (expiryTime > 0 && now.isAfter(dayjs.unix(expiryTime)))
        return 'expired';
      if (
        creationTime > 0 &&
        expiryDuration > 0 &&
        now.isAfter(dayjs.unix(creationTime + expiryDuration))
      )
        return 'expired';

      // 私聊红包：如果已经有人领取了（claimedShares > 0），显示为 claimed
      const packetType = Number(packetData.packetType);
      if (packetType === 0 && claimedShares > 0) return 'claimed';
    }

    // 默认为 active
    return 'active';
  }, [config.status, hasClaimed, packet]);

  return <RedPacketMessage config={config} status={status} onClick={onClick} />;
}
