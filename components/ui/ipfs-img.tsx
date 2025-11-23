/**
 * IPFS 图片组件（使用原生 img 标签）
 * 支持多网关自动故障转移
 */

'use client';

import { useState, useEffect } from 'react';
import { useIPFSImage } from '@/hooks/useIPFSImage';

interface IPFSImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** IPFS CID 或完整 URL */
  src: string | undefined;
  /** 降级图片 */
  fallbackSrc?: string;
  /** 是否启用调试日志 */
  enableLogging?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * IPFS 图片组件（原生 img 标签版本）
 * 自动处理多网关故障转移
 */
export function IPFSImg({
  src: cid,
  fallbackSrc = '/me/default.png',
  enableLogging = false,
  maxRetries = 5,
  alt,
  className,
  ...props
}: IPFSImgProps) {
  const { src, retry, currentGateway } = useIPFSImage(cid, {
    fallbackSrc,
    enableLogging
  });

  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);

  // 当 src 改变时更新 currentSrc
  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  // 重置状态当 CID 改变时
  useEffect(() => {
    setImageError(false);
    setRetryCount(0);
  }, [cid]);

  // 处理图片加载错误
  const handleError = () => {
    if (enableLogging) {
      console.log(`❌ 图片加载失败: ${currentGateway}`);
    }

    // 如果还有重试次数，切换到下一个网关
    if (retryCount < maxRetries) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      if (enableLogging) {
        console.log(`🔄 重试 ${newRetryCount}/${maxRetries}`);
      }

      // 调用 retry 切换网关
      retry();
    } else {
      // 达到最大重试次数，使用降级图片
      setImageError(true);

      if (enableLogging) {
        console.log(`⚠️ 达到最大重试次数，使用降级图片`);
      }
    }
  };

  // 处理图片加载成功
  const handleLoad = () => {
    setImageError(false);

    if (enableLogging) {
      console.log(`✅ 图片加载成功: ${currentGateway}`);
    }
  };

  // 如果加载失败，使用降级图片
  const finalSrc = imageError ? fallbackSrc : currentSrc || fallbackSrc;

  return (
    <img
      {...props}
      src={finalSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}
