'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useReadContract,
  useAccount,
  useWaitForTransactionReceipt,
  useChainId
} from 'wagmi';
import {
  RedPacketAbi,
  useRedPacketAddress,
  useRefundExpiredPacket
} from '@/lib/RedPacketAbi';
import { formatUnits, erc20Abi, getAddress, Abi } from 'viem';
import { FormattedAmount } from './utils';
import { ClaimerAvatar, ClaimerName } from './ClaimerInfo';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';
import RedPacketGroupViewABI from '@/contract/abi/RedPacketGroupView.json';
import { usePeerProfile } from '@/hooks/usePeerProfile';
import { IPFSImg } from '@/components/ui/ipfs-img';
import { getContractAddress } from '@/lib/web3/contracts';

interface Claimer {
  name: string;
  avatar?: string;
  address: string;
  amount: string;
  isBest?: boolean;
}

interface RedPacketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderName: string;
  senderAvatar?: string;
  senderAddress?: string;
  message: string;
  packetId?: string;
  type?: 'LUCKY' | 'NORMAL';
  tokenSymbol?: string;
  groupType?: 'community' | 'redpacket'; // 群类型
  groupAddress?: string; // 群合约地址（红包群需要）
  // Make other props optional as they will be fetched
  myAmount?: string;
  totalCount?: number;
  claimedCount?: number;
  totalAmount?: string;
  claimedAmount?: string;
  claimedList?: Claimer[];
}

export function RedPacketDetailsModal({
  isOpen,
  onClose,
  senderName,
  senderAvatar,
  senderAddress, // Add this
  message,
  packetId,
  type = 'LUCKY',
  myAmount: initialMyAmount,
  tokenSymbol: initialTokenSymbol,
  groupType = 'community',
  groupAddress
}: RedPacketDetailsModalProps) {
  const { toast } = useToast();
  const { address: currentAddress } = useAccount();
  const chainId = useChainId();
  const RED_PACKET_GROUP_VIEW_ADDRESS = getContractAddress(
    chainId,
    'redPacketGroupView'
  );
  const redPacketAddress = useRedPacketAddress();

  // 判断是否是红包群
  const isRedPacketGroup = groupType === 'redpacket';
  const queryAddress =
    isRedPacketGroup && groupAddress
      ? (groupAddress as `0x${string}`)
      : redPacketAddress;

  console.log('🎁 [RedPacketDetailsModal] 红包详情配置:', {
    packetId,
    groupType,
    groupAddress,
    isRedPacketGroup,
    queryAddress
  });

  // 退款相关
  const { writeContractAsync: refundPacket } = useRefundExpiredPacket();
  const [txHash, setTxHash] = React.useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash
    });
  const [isRefunding, setIsRefunding] = React.useState(false);

  // 1. 获取红包基本信息
  const { data: packet, refetch: refetchPacket } = useReadContract({
    address: isRedPacketGroup
      ? RED_PACKET_GROUP_VIEW_ADDRESS || undefined
      : queryAddress || undefined,
    abi: (isRedPacketGroup ? RedPacketGroupViewABI.abi : RedPacketAbi) as Abi,
    functionName: 'getPacket',
    args: packetId
      ? isRedPacketGroup
        ? [queryAddress as `0x${string}`, BigInt(packetId)]
        : [BigInt(packetId)]
      : undefined,
    query: {
      enabled:
        !!packetId &&
        isOpen &&
        (!isRedPacketGroup || !!RED_PACKET_GROUP_VIEW_ADDRESS)
    }
  });

  // 适配不同的数据结构
  const packetData = React.useMemo(() => {
    if (!packet) return null;

    if (isRedPacketGroup) {
      // 红包群返回数组：[kind, token, createdAt, targetSubgroupId, sharesTotal, totalAmount, remainingAmount, remainingShares]
      const [
        kind,
        token,
        createdAt,
        targetSubgroupId,
        sharesTotal,
        totalAmount,
        remainingAmount,
        remainingShares
      ] = packet as any;
      return {
        token,
        totalShares: sharesTotal,
        claimedShares: Number(sharesTotal) - Number(remainingShares),
        totalAmount,
        claimedAmount: BigInt(totalAmount) - BigInt(remainingAmount),
        remainingAmount,
        remainingShares
      };
    } else {
      // 官方群返回对象
      return packet as any;
    }
  }, [packet, isRedPacketGroup]);

  const tokenAddress = packetData?.token;

  // 2. 获取代币信息
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress && isOpen }
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress && isOpen }
  });

  // 3. 获取领取记录（官方群）
  const { data: officialRecordsData, refetch: refetchOfficialRecords } =
    useReadContract({
      address: redPacketAddress || undefined,
      abi: RedPacketAbi,
      functionName: 'getClaimRecordsPaged',
      args: packetId ? [BigInt(packetId), BigInt(0), BigInt(100)] : undefined,
      query: {
        enabled: !!packetId && isOpen && !isRedPacketGroup
      }
    });

  // 4. 获取领取记录（红包群）
  const { data: redPacketRecordsData, refetch: refetchRedPacketRecords } =
    useReadContract({
      address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
      abi: RedPacketGroupViewABI.abi as Abi,
      functionName: 'getPacketClaimDetails',
      args:
        packetId && queryAddress
          ? [
              queryAddress as `0x${string}`,
              BigInt(packetId),
              BigInt(0),
              BigInt(100)
            ]
          : undefined,
      query: {
        enabled:
          !!packetId &&
          isOpen &&
          isRedPacketGroup &&
          !!RED_PACKET_GROUP_VIEW_ADDRESS
      }
    });

  // 统一领取记录数据
  const recordsData = isRedPacketGroup
    ? redPacketRecordsData
    : officialRecordsData;

  // 强制刷新数据
  React.useEffect(() => {
    if (isOpen) {
      refetchPacket();
      if (isRedPacketGroup) {
        refetchRedPacketRecords();
      } else {
        refetchOfficialRecords();
      }
    }
  }, [
    isOpen,
    refetchPacket,
    refetchRedPacketRecords,
    refetchOfficialRecords,
    isRedPacketGroup
  ]);

  // 处理数据
  const displaySymbol = symbol || initialTokenSymbol || '';
  const tokenDecimals = decimals || 18;

  const claimRecords = React.useMemo(() => {
    if (!recordsData) return [];

    // 安全解析 recordsData
    let records: any[] = [];
    if (Array.isArray(recordsData)) {
      // 官方群和红包群都返回 [records, total] 格式
      if (Array.isArray(recordsData[0])) {
        records = recordsData[0];
      } else {
        // 兜底：假设 recordsData 本身就是记录数组
        records = recordsData as any[];
      }
    }

    if (!records || !Array.isArray(records)) return [];

    // console.log('📊 [领取记录] 解析数据:', {
    //   isRedPacketGroup,
    //   recordsCount: records.length,
    //   sampleRecord: records[0]
    // });

    // 判断红包是否已全部领取完毕
    const isFullyClaimed = packetData
      ? Number(packetData.claimedShares) === Number(packetData.totalShares)
      : false;

    // 找出最佳手气（只有拼手气红包且已全部领取才计算）
    let maxAmount = BigInt(0);
    let firstMaxIndex = -1; // 记录第一个最大金额的索引

    if (packetData?.isRandom && isFullyClaimed) {
      records.forEach((r: any, index: number) => {
        if (r.amount > maxAmount) {
          maxAmount = r.amount;
          firstMaxIndex = index; // 更新第一个最大金额的索引
        }
      });
    }

    return records.map((r: any, index: number) => {
      const isCurrentUser =
        r.claimer.toLowerCase() === currentAddress?.toLowerCase();

      return {
        address: r.claimer,
        amount: formatUnits(r.amount, tokenDecimals),
        // 只有拼手气红包 + 已全部领取 + 是第一个最大金额 才显示皇冠
        isBest:
          packetData?.isRandom &&
          isFullyClaimed &&
          index === firstMaxIndex &&
          r.amount > 0,
        isCurrentUser
      };
    });
  }, [
    recordsData,
    tokenDecimals,
    currentAddress,
    packetData,
    isRedPacketGroup
  ]);

  // 计算我的领取金额
  const myRecord = claimRecords.find(
    (r) => getAddress(r.address) === getAddress(currentAddress || '')
  );
  const displayAmount = myRecord?.amount || initialMyAmount || '0.00';

  // 统计数据
  const formatMoney = (amount: bigint, decimals: number) => {
    const val = parseFloat(formatUnits(amount, decimals));
    if (val === 0) return '0';
    if (Number.isInteger(val)) return val.toFixed(2);
    return Number(val.toFixed(4)).toString();
  };

  const totalAmountStr = packetData
    ? formatMoney(packetData.totalAmount, tokenDecimals)
    : '0';
  const claimedAmountStr = packetData
    ? formatMoney(packetData.claimedAmount, tokenDecimals)
    : '0';
  const totalCount = packetData ? Number(packetData.totalShares) : 0;
  const claimedCount = packetData ? Number(packetData.claimedShares) : 0;
  const isRandom = packetData?.isRandom;

  // 获取 Profile
  const packetCreator = packet ? (packet as any).creator : undefined;
  const effectiveCreator = senderAddress || packetCreator;
  const { profile } = usePeerProfile(effectiveCreator as `0x${string}`);

  const isMe =
    effectiveCreator &&
    currentAddress &&
    effectiveCreator.toLowerCase() === currentAddress.toLowerCase();

  const finalSenderName = isMe ? '我' : profile?.name || senderName;
  const finalSenderAvatarCid = profile?.avatarCid;

  const getSafeAvatarUrl = (url?: string) => {
    if (!url) return null;
    try {
      new URL(url);
      return url;
    } catch {
      if (url.startsWith('/')) return url;
      return null;
    }
  };

  const safeSenderAvatar = getSafeAvatarUrl(senderAvatar);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '复制成功',
      description: '地址已复制',
      variant: 'success'
    });
  };

  // 处理退款
  const handleRefund = async () => {
    if (!packetId || isRefunding || isConfirming || !redPacketAddress) return;

    try {
      setIsRefunding(true);

      const hash = await refundPacket({
        address: redPacketAddress,
        abi: RedPacketAbi,
        functionName: 'refundExpiredPacket',
        args: [BigInt(packetId)]
      });

      setTxHash(hash);

      toast({
        title: '交易已提交',
        description: '等待区块链确认...',
        variant: 'default'
      });
    } catch (error: any) {
      console.warn('退款失败:', error);

      const errorMsg = error.message?.toLowerCase() || '';
      if (
        errorMsg.includes('user rejected') ||
        errorMsg.includes('user denied') ||
        errorMsg.includes('cancelled')
      ) {
        console.log('👤 用户取消了退款');
        toast({
          title: '已取消',
          description: '您已取消退款操作',
          variant: 'default'
        });
        setIsRefunding(false);
        return;
      }

      toast({
        title: '退款失败',
        description: error.shortMessage || '请稍后重试',
        variant: 'destructive'
      });
      setIsRefunding(false);
    }
  };

  // 交易确认后刷新数据
  React.useEffect(() => {
    if (isConfirmed && txHash) {
      toast({
        title: '退款成功',
        description: '红包已退款给创建者',
        variant: 'success'
      });
      refetchPacket();
      if (isRedPacketGroup) {
        refetchRedPacketRecords();
      } else {
        refetchOfficialRecords();
      }
      setTxHash(undefined);
      setIsRefunding(false);
    }
  }, [
    isConfirmed,
    txHash,
    refetchPacket,
    refetchRedPacketRecords,
    refetchOfficialRecords,
    isRedPacketGroup,
    toast
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#f7f7f7] border-none shadow-none p-0 w-full h-full max-w-none max-h-none rounded-none flex flex-col overflow-hidden gap-0 [&>button]:hidden focus:outline-none">
        <DialogTitle className="sr-only">Red Packet Details</DialogTitle>
        <DialogDescription className="sr-only">
          Red Packet Details
        </DialogDescription>

        {/* 头部区域 */}
        <div
          className="relative h-[100px] shrink-0"
          style={{
            backgroundImage: "url('/chats/Red_envelope_head_bg.png')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="flex items-center px-4 py-3 text-white relative z-20">
            <button
              onClick={onClose}
              className="p-1 -ml-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex-1" />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex flex-col items-center mt-10 relative z-10 pb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-sm overflow-hidden bg-gray-200 shrink-0">
              <IPFSImg
                src={finalSenderAvatarCid}
                fallbackSrc={safeSenderAvatar || undefined}
                alt={finalSenderName}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-gray-900 font-medium text-[15px]">
              {finalSenderName}的红包
            </span>
            {isRandom && (
              <span className="text-[#e8c37e] border border-[#e8c37e] text-[10px] px-1 rounded-[2px] leading-tight">
                拼
              </span>
            )}
          </div>

          <div className="text-gray-400 text-[12px] mb-6">{message}</div>

          {!!myRecord && (
            <div className="flex flex-col items-center text-[#CDAC72]">
              <FormattedAmount
                amount={displayAmount}
                symbol={displaySymbol}
                integerClassName="text-[48px] font-bold leading-none"
                decimalClassName="text-[32px] font-bold leading-none"
                symbolClassName="text-[32px] font-medium mt-2 opacity-90"
              />
            </div>
          )}
        </div>

        {/* 汇总栏 */}
        <div className="bg-[#f7f7f7] px-4 py-2 text-[13px] text-gray-500 shrink-0 border-b border-gray-200">
          {!isRedPacketGroup && packetData?.packetType === 0 ? (
            // 官方红包的私聊红包：packetType === PacketType.Personal (0)
            // 私聊红包只有 1 份，给特定收件人
            claimedCount > 0 ? (
              <>
                1个红包共{claimedAmountStr}
                {displaySymbol}
              </>
            ) : (
              <>
                红包金额{totalAmountStr}
                {displaySymbol}，等待对方领取
              </>
            )
          ) : (
            // 群红包：包括官方群红包（packetType=1）和红包群的所有红包
            <>
              已领取{claimedCount}/{totalCount}个红包，共{claimedAmountStr}/
              {totalAmountStr} {displaySymbol}
            </>
          )}
        </div>

        {/* 列表区域 */}
        <div className="flex-1 overflow-y-auto">
          {claimRecords.map((item, index) => (
            <div
              key={index}
              className="flex items-center px-4 py-3 border-b border-gray-200"
            >
              <div className="relative mr-3">
                <ClaimerAvatar
                  address={item.address}
                  isCurrentUser={item.isCurrentUser}
                  className="w-10 h-10"
                />
                {item.isBest && (
                  <div className="absolute -top-2 -right-2 w-4 h-4">
                    <Image
                      src="/chats/Crown.png"
                      alt="Best Luck"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[15px] font-medium text-gray-900">
                    <ClaimerName
                      address={item.address}
                      isCurrentUser={item.isCurrentUser}
                    />
                  </span>
                  <FormattedAmount
                    amount={item.amount}
                    symbol={displaySymbol}
                    integerClassName={cn(
                      'text-[15px] font-medium',
                      item.isBest ? 'text-[#fa9d3b]' : 'text-gray-900'
                    )}
                    decimalClassName={cn(
                      'text-[15px] font-medium',
                      item.isBest ? 'text-[#fa9d3b]' : 'text-gray-900'
                    )}
                    symbolClassName={cn(
                      'text-[15px] font-medium',
                      item.isBest ? 'text-[#fa9d3b]' : 'text-gray-900'
                    )}
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-[11px] text-gray-400 break-all mr-1 font-mono">
                    {item.address}
                  </span>
                  <button
                    onClick={() => handleCopy(item.address)}
                    className="w-3 h-3 relative opacity-60 hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Image
                      src="/contacts/copy.svg"
                      alt="Copy"
                      fill
                      className="object-contain"
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {claimRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300 text-sm">
              暂无领取记录
            </div>
          )}
        </div>

        <div className="bg-[#f7f7f7] py-4 text-center text-[12px] text-gray-400 shrink-0">
          {(() => {
            // 检查红包是否已领完
            if (claimedCount >= totalCount && totalCount > 0) {
              return '红包已领完';
            }

            // 检查红包是否已过期
            const now = Math.floor(Date.now() / 1000);
            const creationTime = Number(
              packetData?.creationTime || packetData?.createdAt || 0
            );
            const expiryDuration = Number(packetData?.expiryDuration || 0);
            const expiryTime = Number(packetData?.expiryTime || 0);

            const isExpired =
              (expiryTime > 0 && now > expiryTime) ||
              (creationTime > 0 &&
                expiryDuration > 0 &&
                now > creationTime + expiryDuration);

            if (isExpired) {
              const isRefunded = packetData?.status === 3;
              const isCreator =
                currentAddress &&
                packetData?.creator &&
                currentAddress.toLowerCase() ===
                  packetData.creator.toLowerCase();

              return (
                <>
                  {isRefunded ? '红包已退款' : '红包已过期'}
                  {!isRefunded && claimedCount < totalCount && (
                    <>
                      {' '}
                      <button
                        onClick={handleRefund}
                        disabled={isRefunding || isConfirming}
                        className={`text-[#576b95] ${isRefunding || isConfirming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:underline'}`}
                      >
                        {isRefunding || isConfirming
                          ? isConfirming
                            ? '确认中'
                            : '提交中'
                          : isCreator
                            ? '点击退款'
                            : '帮TA退款'}
                      </button>
                    </>
                  )}
                </>
              );
            }

            // 计算剩余天数
            let remainingSeconds = 0;
            if (expiryTime > 0) {
              remainingSeconds = expiryTime - now;
            } else if (creationTime > 0 && expiryDuration > 0) {
              remainingSeconds = creationTime + expiryDuration - now;
            }

            if (remainingSeconds > 0) {
              const remainingDays = Math.ceil(
                remainingSeconds / (24 * 60 * 60)
              );
              return `未领取的红包，将于${remainingDays}天后发起退款`;
            }

            return '未领取的红包，将于5天后发起退款';
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
