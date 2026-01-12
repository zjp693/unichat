'use client';

import { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseAbi } from 'viem';
import dayjs from 'dayjs';
import { RedPacketMessage } from './RedPacketMessage';
import {
  useHasClaimed,
  useGetPacket,
  PacketStatus,
  useRedPacketAddress
} from '@/lib/RedPacketAbi';
import type { RedPacketConfig } from './types';

interface RedPacketMessageWrapperProps {
  config: RedPacketConfig;
  onOpenPacket?: () => void;
  onViewDetails?: () => void;
  // 兜底参数：如果 config 中没有 groupType，使用当前聊天的类型
  fallbackGroupType?: 'community' | 'redpacket';
  fallbackGroupAddress?: string;
}

/**
 * 红包消息包装器 - 自动查询红包状态
 * 使用 getPacket 获取红包完整信息，判断是否已领取/已领完/已过期
 *
 * 支持两种红包类型：
 * 1. 官方群红包：查询 redPacketAddress
 * 2. 红包群红包：查询群合约地址
 */
export function RedPacketMessageWrapper({
  config,
  onOpenPacket,
  onViewDetails,
  fallbackGroupType,
  fallbackGroupAddress
}: RedPacketMessageWrapperProps) {
  const { address: currentAddress } = useAccount();
  const redPacketAddress = useRedPacketAddress();

  // 判断是否是红包群的红包（优先使用 config 中的，否则使用兜底值）
  const groupType = config.groupType || fallbackGroupType || 'community';
  const groupAddress = config.groupAddress || fallbackGroupAddress;
  const isRedPacketGroup = groupType === 'redpacket';
  const queryAddress =
    isRedPacketGroup && groupAddress
      ? (groupAddress as `0x${string}`)
      : redPacketAddress;

  // console.log('🎁 [RedPacketMessageWrapper] 红包配置:', {
  //   packetId: config.packetId,
  //   configGroupType: config.groupType,
  //   fallbackGroupType,
  //   finalGroupType: groupType,
  //   groupAddress,
  //   isRedPacketGroup,
  //   queryAddress
  // });

  // 官方群红包查询（使用原有的 hooks）
  const { data: officialPacket } = useGetPacket(
    !isRedPacketGroup && config.packetId ? BigInt(config.packetId) : undefined
  );

  const { data: officialHasClaimed } = useHasClaimed(
    !isRedPacketGroup && config.packetId ? BigInt(config.packetId) : undefined,
    currentAddress
  );

  // 红包群红包查询（直接查询群合约）
  const RedPacketGroupABI = parseAbi([
    'function getPacket(uint256) view returns (uint8 kind, address token, uint64 createdAt, uint32 targetSubgroupId, uint32 sharesTotal, uint256 totalAmount, uint256 remainingAmount, uint32 remainingShares)',
    'function claimed(uint256, address) view returns (bool)'
  ]);

  const { data: redPacketGroupPacket } = useReadContract({
    address: queryAddress || undefined,
    abi: RedPacketGroupABI,
    functionName: 'getPacket',
    args:
      isRedPacketGroup && config.packetId
        ? [BigInt(config.packetId)]
        : undefined,
    query: { enabled: isRedPacketGroup && !!config.packetId }
  });

  const { data: redPacketGroupClaimed } = useReadContract({
    address: queryAddress || undefined,
    abi: RedPacketGroupABI,
    functionName: 'claimed',
    args:
      isRedPacketGroup && config.packetId && currentAddress
        ? [BigInt(config.packetId), currentAddress]
        : undefined,
    query: {
      enabled: isRedPacketGroup && !!config.packetId && !!currentAddress
    }
  });

  // 统一的红包数据和领取状态
  const packet = isRedPacketGroup ? redPacketGroupPacket : officialPacket;
  const hasClaimed = isRedPacketGroup
    ? redPacketGroupClaimed
    : officialHasClaimed;

  // 确定红包状态
  const status = useMemo(() => {
    // 优先使用 config 中的 status（如果已明确设置）
    if (config.status === 'expired') return 'expired';

    // 如果当前用户已领取，显示为 claimed
    if (hasClaimed) return 'claimed';

    // 如果有红包数据，根据合约状态判断
    if (packet) {
      if (isRedPacketGroup) {
        // 红包群的数据结构
        // 安全检查：确保 packet 是数组才解构
        if (!Array.isArray(packet)) {
          return 'active'; // 数据加载中或出错，默认为 active
        }

        const [
          kind,
          token,
          createdAt,
          targetSubgroupId,
          sharesTotal,
          totalAmount,
          remainingAmount,
          remainingShares
        ] = packet;

        // 检查是否已领完
        if (Number(remainingShares) === 0) return 'empty';

        // 检查是否过期
        // TODO: 红包群的过期时间需要从合约常量获取，目前暂定 5 天
        const REDPACKET_GROUP_EXPIRY_DURATION = 5 * 24 * 60 * 60; // 5 天（秒）
        const now = dayjs();
        const creationTime = Number(createdAt);
        if (
          creationTime > 0 &&
          now.isAfter(
            dayjs.unix(creationTime + REDPACKET_GROUP_EXPIRY_DURATION)
          )
        ) {
          return 'expired';
        }
      } else {
        // 官方群的数据结构
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
    }

    // 默认为 active
    return 'active';
  }, [config.status, hasClaimed, packet, isRedPacketGroup]);

  // 根据状态决定点击行为
  const handleClick = () => {
    if (status === 'active') {
      // 未领取 → 打开领取弹框
      onOpenPacket?.();
    } else {
      // 已领取/已过期/已领完 → 打开详情页
      onViewDetails?.();
    }
  };

  return (
    <RedPacketMessage config={config} status={status} onClick={handleClick} />
  );
}
