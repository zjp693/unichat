'use client';

import { useState } from 'react';

interface AvatarWithSkeletonProps {
  src: string;
  alt: string;
  className?: string;
}

export function AvatarWithSkeleton({ 
  src, 
  alt, 
  className 
}: AvatarWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* 骨架屏 - 在图片加载时显示 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-lg"></div>
      )}
      
      {/* 实际图片 */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          setIsLoading(false);
          setHasError(true);
          // 如果IPFS图片加载失败，回退到默认头像
          const target = e.target as HTMLImageElement;
          if (!hasError) {
            target.src = '/me/default.png';
          }
        }}
      />
    </div>
  );
}
