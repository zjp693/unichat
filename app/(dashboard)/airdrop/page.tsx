'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useChainId,
  useDisconnect
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Gift,
  Wallet,
  Copy,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  AirdropData,
  getUserAirdropData,
  formatTokenAmount,
  formatAddress,
  isValidAirdropData
} from '@/lib/airdrop';
import {
  getMerkleDistributorAddress,
  MERKLE_DISTRIBUTOR_ABI,
  isValidContractAddress
} from '@/lib/contracts';

export default function AirdropPage() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const { disconnect } = useDisconnect();

  // 状态管理
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [airdropData, setAirdropData] = useState<AirdropData | null>(null);
  const [checkStatus, setCheckStatus] = useState<string>('');
  const [checkProgress, setCheckProgress] = useState<number>(0);

  // 获取合约地址
  const contractAddress = getMerkleDistributorAddress() as `0x${string}`;

  // 智能合约交互
  const {
    writeContract,
    isPending: isClaimPending,
    isSuccess: isClaimSuccess
  } = useWriteContract();

  // 检查是否已被领取
  const {
    data: isClaimedData,
    refetch: refetchIsClaimed,
    isLoading: isCheckingClaimed
  } = useReadContract({
    address: contractAddress,
    abi: MERKLE_DISTRIBUTOR_ABI,
    functionName: 'isClaimed',
    args: airdropData ? [BigInt(airdropData.index)] : undefined,
    query: {
      enabled:
        !!contractAddress &&
        !!airdropData &&
        isConnected &&
        isValidContractAddress(contractAddress)
    }
  });

  const alreadyClaimed = !!isClaimedData;

  // 进度模拟函数
  const simulateProgress = useCallback(
    async (targetProgress: number, status: string) => {
      setCheckStatus(status);
      const startProgress = checkProgress;
      const increment = targetProgress - startProgress;
      const steps = 10;

      for (let i = 1; i <= steps; i++) {
        const nextProgress = startProgress + (increment * i) / steps;
        setCheckProgress(nextProgress);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    },
    [checkProgress]
  );

  // 检查空投资格
  const checkEligibility = useCallback(async () => {
    if (!address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setCheckingEligibility(true);
      setError(null);
      setCheckProgress(0);
      setCheckStatus('开始检查您的资格...');

      await simulateProgress(20, '准备查询您的地址信息...');
      await simulateProgress(50, '正在从空投列表中查找您的地址...');

      const data = await getUserAirdropData(address);

      await simulateProgress(80, '正在验证您的Merkle证明...');

      if (data && isValidAirdropData(data)) {
        await simulateProgress(100, '验证成功！');
        setAirdropData(data);

        setTimeout(() => {
          refetchIsClaimed();
          setCheckingEligibility(false);
        }, 500);
      } else {
        setCheckStatus('验证失败');
        setError('抱歉，您的地址不在本次空投列表中');
        setCheckingEligibility(false);
      }
    } catch (err: Error | unknown) {
      console.error('获取空投数据失败:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(`获取空投数据失败: ${errorMessage}`);
      setCheckStatus('检查出错');
      setCheckingEligibility(false);
    }
  }, [address, simulateProgress, refetchIsClaimed]);

  // 监听认领成功事件
  useEffect(() => {
    if (isClaimSuccess && airdropData) {
      refetchIsClaimed();
      toast({
        title: '认领成功！',
        description: '代币已成功转入您的钱包',
        variant: 'success'
      });
    }
  }, [isClaimSuccess, airdropData, refetchIsClaimed, toast]);

  // 连接钱包后自动检查资格
  useEffect(() => {
    if (isConnected && address && !airdropData && !checkingEligibility) {
      checkEligibility();
    }
  }, [
    isConnected,
    address,
    airdropData,
    checkingEligibility,
    checkEligibility
  ]);

  // 认领代币
  const claimAirdrop = async () => {
    if (!address || !airdropData || !contractAddress) {
      setError('缺少必要信息，无法进行认领');
      return;
    }

    if (!isValidContractAddress(contractAddress)) {
      setError('合约地址无效，请检查配置');
      return;
    }

    try {
      setError(null);

      writeContract({
        address: contractAddress,
        abi: MERKLE_DISTRIBUTOR_ABI,
        functionName: 'claimFromBatch',
        args: [
          BigInt(airdropData.index),
          BigInt(airdropData.batchIndex || 0),
          address,
          BigInt(airdropData.amount),
          airdropData.proof as `0x${string}`[]
        ]
      });
    } catch (err: Error | unknown) {
      console.error('认领失败:', err);
      const errorMessage = err instanceof Error ? err.message : '认领失败';
      setError(errorMessage);
      toast({
        title: '认领失败',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // 复制地址
  const copyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      toast({
        title: '复制成功',
        description: '地址已复制到剪贴板',
        variant: 'success'
      });
    } catch (err) {
      toast({
        title: '复制失败',
        description: '无法复制地址',
        variant: 'destructive'
      });
    }
  };

  // 断开钱包连接
  const handleDisconnect = () => {
    disconnect();
    // 重置所有状态
    setAirdropData(null);
    setError(null);
    setCheckingEligibility(false);
    setCheckProgress(0);
    setCheckStatus('');
    toast({
      title: '钱包已断开',
      description: '您已成功断开钱包连接',
      variant: 'success'
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部导航 */}
      <div className="flex justify-evenly items-center p-4 bg-white border-b">
        <appkit-button />
        <Button variant="outline" className="flex items-center space-x-1">
          <div className="inline-block align-middle mr-1 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src="/top/usa.png"
              alt="region"
              className="w-full h-full object-cover"
              width={20}
              height={20}
            />
          </div>
          <span className="text-sm">USA</span>
        </Button>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 钱包连接状态 */}
        {!isConnected ? (
          <Card>
            <CardContent className="text-center py-8">
              <Wallet className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">连接钱包开始</h3>
              <p className="text-muted-foreground mb-4">
                请先连接您的钱包以检查空投资格
              </p>
            </CardContent>
          </Card>
        ) : !airdropData ? (
          /* 检查资格界面 */
          <Card>
            <CardContent className="py-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">检查空投资格</h3>
                <div className="mb-4">
                  <p className="text-muted-foreground mb-3">
                    钱包已连接: {formatAddress(address!)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyAddress(address!)}
                      className="ml-2 h-auto p-1"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive"
                  >
                    断开钱包连接
                  </Button>
                </div>

                <Button
                  onClick={checkEligibility}
                  disabled={checkingEligibility}
                  className="w-full max-w-xs"
                >
                  {checkingEligibility ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      检查中...
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      检查我的空投资格
                    </>
                  )}
                </Button>

                {/* 进度显示 */}
                {checkingEligibility && (
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{checkStatus}</span>
                      <span>{Math.round(checkProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${checkProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          // 空投信息和认领界面
          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50/30">
            <CardContent className="p-0">
              {/* 顶部状态标签 */}
              <div className="absolute top-6 right-6 z-10">
                {alreadyClaimed ? (
                  <Badge className="bg-green-500/10 text-green-700 border-green-200 backdrop-blur-sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已领取
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 backdrop-blur-sm">
                    可领取
                  </Badge>
                )}
              </div>

              {/* 主要内容区域 */}
              <div className="px-6 pt-16 pb-6">
                {/* 圆形进度区域 */}
                <div className="flex flex-col items-center text-center mb-8">
                  {/* 外圆环 - 适中尺寸 */}
                  <div className="relative w-48 h-48 mb-6">
                    {/* 背景圆环 */}
                    <svg
                      className="w-48 h-48 transform -rotate-90"
                      viewBox="0 0 160 160"
                    >
                      <circle
                        cx="80"
                        cy="80"
                        r="65"
                        fill="transparent"
                        stroke="#f3f4f6"
                        strokeWidth="6"
                      />
                      {/* 进度圆环 */}
                      <circle
                        cx="80"
                        cy="80"
                        r="65"
                        fill="transparent"
                        stroke="url(#gradient)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${alreadyClaimed ? 408 : 306} 408`}
                        className="transition-all duration-1500 ease-out"
                        style={{
                          filter:
                            'drop-shadow(0 0 10px rgba(139, 92, 246, 0.3))'
                        }}
                      />
                      {/* 渐变定义 */}
                      <defs>
                        <linearGradient
                          id="gradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="50%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* 中心内容 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 mb-3 text-purple-600">
                        <Gift className="w-full h-full" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {airdropData?.amountInEther ||
                          formatTokenAmount(airdropData?.amount || '0')}
                      </div>
                    </div>
                  </div>
                  {/* UnichatV4.com 标签移到圆形外面 */}
                  <div className="text-lg text-gray-700 font-bold tracking-wide bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    UnichatV4.com
                  </div>
                </div>

                {/* 统计信息 - 轻量化设计 */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="relative overflow-hidden">
                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-3xl p-6 shadow-lg border border-cyan-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-cyan-600 font-semibold uppercase tracking-wider">
                          已领取
                        </div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      </div>
                      <div className="text-2xl font-bold text-cyan-800 mb-1">
                        {alreadyClaimed
                          ? airdropData?.amountInEther ||
                            formatTokenAmount(airdropData?.amount || '0')
                          : '0.00'}
                      </div>
                      <div className="text-xs text-cyan-600">UNICHAT</div>
                    </div>
                  </div>
                  <div className="relative overflow-hidden">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 shadow-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                          待领
                        </div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="text-2xl font-bold text-blue-800 mb-1">
                        {alreadyClaimed
                          ? '0.00'
                          : airdropData?.amountInEther ||
                            formatTokenAmount(airdropData?.amount || '0')}
                      </div>
                      <div className="text-xs text-blue-600">UNICHAT</div>
                    </div>
                  </div>
                </div>

                {/* 认领按钮区域 */}
                <div className="space-y-4">
                  {/* 主认领按钮 */}
                  <Button
                    onClick={claimAirdrop}
                    disabled={
                      alreadyClaimed || isClaimPending || isCheckingClaimed
                    }
                    className={`w-full h-14 text-lg font-semibold rounded-2xl transition-all duration-300 ${
                      alreadyClaimed
                        ? '!bg-black hover:!bg-gray-900 !text-white shadow-lg border-0'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                    }`}
                    size="lg"
                  >
                    {isClaimPending ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        认领中...
                      </>
                    ) : alreadyClaimed ? (
                      <>
                        <CheckCircle className="mr-3 h-6 w-6" />
                        已领取完成
                      </>
                    ) : (
                      <>
                        <Gift className="mr-3 h-6 w-6" />
                        立即领取
                      </>
                    )}
                  </Button>

                  {/* 错误提示 */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                        <p className="text-red-700 text-sm font-medium">
                          {error}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 帮助信息 */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-2 flex items-center">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        重要提示
                      </p>
                      <ul className="space-y-2 text-xs text-blue-700">
                        <li className="flex items-start">
                          <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          每个地址只能领取一次空投
                        </li>
                        <li className="flex items-start">
                          <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          认领过程需要支付网络手续费
                        </li>
                        <li className="flex items-start">
                          <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          代币将直接转入您的钱包
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
