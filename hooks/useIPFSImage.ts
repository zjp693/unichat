/**
 * IPFS 图片加载 Hook
 * 支持多网关自动故障转移
 */

import { useState, useEffect, useMemo } from 'react';
import { buildIPFSUrl, getSortedGateways } from '@/lib/ipfs-gateways';

interface UseIPFSImageOptions {
  fallbackSrc?: string; // 降级图片
  onError?: (error: Error) => void; // 错误回调
  enableLogging?: boolean; // 是否启用日志
}

interface UseIPFSImageResult {
  src: string; // 当前使用的图片 URL
  isLoading: boolean; // 是否正在加载
  error: Error | null; // 错误信息
  retry: () => void; // 重试函数
  currentGateway: string; // 当前使用的网关
}

/**
 * 使用 IPFS 图片，支持自动故障转移
 * 策略：直接返回 URL，让浏览器的 Image 组件处理加载和错误
 * @param cid IPFS CID 或完整 URL
 * @param options 配置选项
 */
export function useIPFSImage(
  cid: string | undefined,
  options: UseIPFSImageOptions = {}
): UseIPFSImageResult {
  const { fallbackSrc = '', enableLogging = false } = options;

  const [gatewayIndex, setGatewayIndex] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  // 获取排序后的网关列表
  const gateways = useMemo(() => getSortedGateways(), []);
  const currentGateway = gateways[gatewayIndex] || gateways[0];

  // 构建当前网关的 URL
  const src = useMemo(() => {
    if (!cid) return fallbackSrc;
    return buildIPFSUrl(cid, currentGateway);
  }, [cid, currentGateway, fallbackSrc]);

  // 当 CID 改变时重置状态
  useEffect(() => {
    setGatewayIndex(0);
    setError(null);
  }, [cid]);

  const retry = () => {
    const nextIndex = (gatewayIndex + 1) % gateways.length;
    setGatewayIndex(nextIndex);
    setError(null);

    if (enableLogging) {
      console.log(
        `🔄 切换到下一个网关 [${nextIndex + 1}/${gateways.length}]: ${gateways[nextIndex]}`
      );
    }
  };

  return {
    src,
    isLoading: false,
    error,
    retry,
    currentGateway
  };
}

/**
 * 简化版：直接返回 IPFS URL（不进行网关测试）
 * 适用于不需要自动故障转移的场景
 */
export function useIPFSUrl(cid: string | undefined): string {
  return cid ? buildIPFSUrl(cid) : '';
}
