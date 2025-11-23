/**
 * IPFS 图片组件
 * 支持多网关自动故障转移和加载状态
 */

'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { useIPFSImage } from '@/hooks/useIPFSImage';
import { Skeleton } from './skeleton';

interface IPFSImageProps extends Omit<ImageProps, 'src'> {
  /** IPFS CID 或完整 URL */
  src: string | undefined;
  /** 降级图片 */
  fallbackSrc?: string;
  /** 是否显示加载骨架屏 */
  showSkeleton?: boolean;
  /** 是否启用调试日志 */
  enableLogging?: boolean;
}

/**
 * IPFS 图片组件
 * 自动处理多网关故障转移
 */
export function IPFSImage({
  src: cid,
  fallbackSrc = '/me/default.png',
  showSkeleton = true,
  enableLogging = false,
  alt,
  className,
  ...props
}: IPFSImageProps) {
  const { src, isLoading, error } = useIPFSImage(cid, {
    fallbackSrc,
    enableLogging
  });

  const [imageError, setImageError] = useState(false);

  // 如果正在加载且启用骨架屏
  if (isLoading && showSkeleton) {
    return <Skeleton className={className} />;
  }

  // 如果加载失败或图片加载错误，使用降级图片
  const finalSrc = error || imageError ? fallbackSrc : src || fallbackSrc;

  return (
    <Image
      {...props}
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => {
        setImageError(true);
      }}
    />
  );
}

/**
 * IPFS 背景图片组件
 * 使用 CSS background-image
 */
export function IPFSBackgroundImage({
  src: cid,
  fallbackSrc = '/me/default.png',
  enableLogging = false,
  className,
  children,
  ...props
}: {
  src: string | undefined;
  fallbackSrc?: string;
  enableLogging?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { src, isLoading } = useIPFSImage(cid, {
    fallbackSrc,
    enableLogging
  });

  const backgroundImage = isLoading
    ? `url(${fallbackSrc})`
    : `url(${src || fallbackSrc})`;

  return (
    <div
      {...props}
      className={className}
      style={{
        backgroundImage,
        ...props.style
      }}
    >
      {children}
    </div>
  );
}
