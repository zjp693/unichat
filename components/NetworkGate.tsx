'use client';

/**
 * 网络守卫组件
 * 当用户连接到不支持的网络时，显示切换提示
 */
import React, { useMemo } from 'react';
import { useAppKitNetwork } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { isSupportedChainId, networks } from '@/lib/web3/networks';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wifi } from 'lucide-react';

/**
 * 将 chainId 转换为 number 类型
 */
function normalizeChainId(
  chainId: string | number | undefined
): number | undefined {
  if (chainId === undefined) return undefined;
  if (typeof chainId === 'string') return parseInt(chainId, 10);
  return chainId;
}

interface NetworkGateProps {
  children: React.ReactNode;
  /**
   * 不显示守卫内容，仅检查网络
   * 如果为 true，在网络不支持时返回 null 而不是提示 UI
   */
  silent?: boolean;
  /**
   * 自定义的不支持网络时的 UI
   */
  fallback?: React.ReactNode;
}

/**
 * 网络守卫组件
 * 包裹需要检查网络的页面或组件
 */
export function NetworkGate({
  children,
  silent = false,
  fallback
}: NetworkGateProps) {
  const { chainId, switchNetwork } = useAppKitNetwork();
  const { isConnected } = useAccount();

  // 获取 Arbitrum 和 opBNB 网络对象
  const arbitrumNetwork = useMemo(
    () => networks.find((n) => n.id === 42161),
    []
  );
  const opbnbNetwork = useMemo(() => networks.find((n) => n.id === 204), []);

  // 未连接钱包时，直接渲染子组件（让其他组件处理连接逻辑）
  if (!isConnected) {
    return <>{children}</>;
  }

  // 已连接但链 ID 未获取到时，显示加载状态
  if (!chainId) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wifi className="h-5 w-5 animate-pulse" />
          <span>正在检测网络...</span>
        </div>
      </div>
    );
  }

  // 转换 chainId 类型
  const normalizedChainId = normalizeChainId(chainId);

  // 网络支持，渲染子组件
  if (normalizedChainId && isSupportedChainId(normalizedChainId)) {
    return <>{children}</>;
  }

  // 网络不支持
  if (silent) {
    return null;
  }

  // 使用自定义 fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // 默认的网络不支持 UI
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
          <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
        </div>

        <h2 className="text-xl font-semibold">网络不支持</h2>

        <p className="text-muted-foreground">
          当前网络不受支持。请切换到 <strong>Arbitrum</strong> 或{' '}
          <strong>opBNB</strong> 网络继续使用。
        </p>

        <div className="flex gap-3 mt-4">
          {arbitrumNetwork && (
            <Button
              onClick={() => switchNetwork(arbitrumNetwork)}
              variant="default"
              className="gap-2"
            >
              <img
                src="https://cryptologos.cc/logos/arbitrum-arb-logo.svg"
                alt="Arbitrum"
                className="h-4 w-4"
              />
              切换到 Arbitrum
            </Button>
          )}

          {opbnbNetwork && (
            <Button
              onClick={() => switchNetwork(opbnbNetwork)}
              variant="outline"
              className="gap-2"
            >
              <img
                src="https://cryptologos.cc/logos/bnb-bnb-logo.svg"
                alt="opBNB"
                className="h-4 w-4"
              />
              切换到 opBNB
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          当前链 ID: {chainId}
        </p>
      </div>
    </div>
  );
}

/**
 * 网络守卫 Hook
 * 返回网络状态和切换函数
 */
export function useNetworkGuard() {
  const { chainId, switchNetwork } = useAppKitNetwork();
  const { isConnected } = useAccount();

  const normalizedChainId = normalizeChainId(chainId);
  const isSupported = isSupportedChainId(normalizedChainId);

  const switchToArbitrum = () => {
    const arb = networks.find((n) => n.id === 42161);
    if (arb) switchNetwork(arb);
  };

  const switchToOpBNB = () => {
    const opbnb = networks.find((n) => n.id === 204);
    if (opbnb) switchNetwork(opbnb);
  };

  return {
    chainId,
    isConnected,
    isSupported,
    switchNetwork,
    switchToArbitrum,
    switchToOpBNB
  };
}

export default NetworkGate;
