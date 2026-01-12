'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  useChainId,
  useChains,
  useReadContract,
  useWriteContract,
  useAccount,
  usePublicClient
} from 'wagmi';
import { parseAbi } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { useCommunityMembers } from '@/hooks/useCommunityMembers';
import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { IPFSImg } from '@/components/ui/ipfs-img';
import { ChainSelectorDropdown } from '@/components/chat/chain-selector-dropdown';
import { useUpdateGroupSettings } from '@/hooks/useUpdateGroupSettings';
import type { Address } from 'viem';

// 定义布局常量，可以从公共文件导入或在此定义
const TOP_BAR_HEIGHT = 56;
const NAV_BAR_HEIGHT = 56;
const TOTAL_HEADER_HEIGHT = TOP_BAR_HEIGHT + NAV_BAR_HEIGHT;

// 单个成员项组件 - 显示头像和昵称
function MemberItem({ address }: { address: Address }) {
  const { avatarCid, name, isLoading } = usePeerAvatar(address);

  // 显示名称：优先使用昵称，否则显示地址缩写
  const displayName = name || `${address.slice(0, 4)}...${address.slice(-3)}`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200">
        {isLoading ? (
          <div className="w-full h-full animate-pulse bg-gray-300" />
        ) : avatarCid ? (
          <IPFSImg
            src={avatarCid}
            alt={displayName}
            fallbackSrc="/me/me2.png"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm font-medium">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <span className="text-xs mt-1 truncate w-12 text-center text-gray-700">
        {displayName}
      </span>
    </div>
  );
}

interface GroupChatInfoPanelProps {
  conversationId: string;
  chatType: 'group' | 'private';
  memberCount: number;
  groupName?: string;
  groupType?: 'community' | 'redpacket';
  onClose: () => void;
}

export default function GroupChatInfoPanel({
  conversationId,
  chatType,
  memberCount,
  groupName: initialGroupName,
  groupType = 'community',
  onClose
}: GroupChatInfoPanelProps) {
  // 路由
  const router = useRouter();

  // 获取当前链信息
  const chainId = useChainId();
  const chains = useChains();
  const publicClient = usePublicClient();
  const currentChain = chains.find((c) => c.id === chainId);
  const chainName = currentChain?.name || 'Unknown';
  const chainShortName = chainName.charAt(0).toUpperCase();

  // 链图标映射（根据链 ID 或链名称）
  const getChainIcon = (name: string, id: number): string => {
    // 按链 ID 精确匹配
    const iconByChainId: Record<number, string> = {
      1: '/chain/Ethereum.png', // Ethereum Mainnet
      10: '/chain/OP Mainnet.png', // Optimism
      56: '/chain/BNB Chain.png', // BNB Smart Chain
      137: '/chain/Polygon.png', // Polygon
      204: '/chain/BNB Chain.png', // opBNB (BNB 系)
      8453: '/chain/Base.png', // Base
      42161: '/chain/Arbitrum.png', // Arbitrum One
      43114: '/chain/Avalanche.png', // Avalanche
      81457: '/chain/Blast.png' // Blast
    };

    if (iconByChainId[id]) {
      return iconByChainId[id];
    }

    // 按名称模糊匹配
    const nameLower = name.toLowerCase();
    if (nameLower.includes('arbitrum')) return '/chain/Arbitrum.png';
    if (nameLower.includes('optimism') || nameLower.includes('op'))
      return '/chain/OP Mainnet.png';
    if (nameLower.includes('polygon')) return '/chain/Polygon.png';
    if (nameLower.includes('bnb') || nameLower.includes('bsc'))
      return '/chain/BNB Chain.png';
    if (nameLower.includes('base')) return '/chain/Base.png';
    if (nameLower.includes('ethereum') || nameLower.includes('eth'))
      return '/chain/Ethereum.png';

    // 默认返回空，使用首字母
    return '';
  };

  const chainIcon = getChainIcon(chainName, chainId);

  // 红包群分配比例 ABI
  const BpsABI = parseAbi([
    'function BPS_OWNER() view returns (uint16)',
    'function BPS_REF() view returns (uint16)',
    'function BPS_POOL() view returns (uint16)'
  ]);

  // 获取分配比例（只在红包群时查询）
  const isRedPacket = groupType === 'redpacket';

  const { data: bpsOwner } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: BpsABI,
    functionName: 'BPS_OWNER',
    query: { enabled: isRedPacket }
  });

  const { data: bpsRef } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: BpsABI,
    functionName: 'BPS_REF',
    query: { enabled: isRedPacket }
  });

  const { data: bpsPool } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: BpsABI,
    functionName: 'BPS_POOL',
    query: { enabled: isRedPacket }
  });

  // 转换为百分比（bps / 100 = %）
  const ownerPercent = bpsOwner ? Number(bpsOwner) / 100 : 9;
  const refPercent = bpsRef ? Number(bpsRef) / 100 : 31;
  const poolPercent = bpsPool ? Number(bpsPool) / 100 : 60;

  // 群信息读取 ABI
  const GroupInfoABI = parseAbi([
    'function mainOwner() view returns (address)',
    'function groupName() view returns (string)',
    'function announcement() view returns (string)',
    'function economicModel() view returns (string)',
    'function groupRules() view returns (string)'
  ]);

  // 获取群主地址
  const { data: mainOwnerAddress } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: GroupInfoABI,
    functionName: 'mainOwner',
    query: { enabled: isRedPacket }
  });

  // 获取群名称
  const { data: contractGroupName } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: GroupInfoABI,
    functionName: 'groupName',
    query: { enabled: isRedPacket }
  });

  // 获取群公告
  const { data: contractAnnouncement } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: GroupInfoABI,
    functionName: 'announcement',
    query: { enabled: isRedPacket }
  });

  // 获取经济模型
  const { data: contractEconomicModel } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: GroupInfoABI,
    functionName: 'economicModel',
    query: { enabled: isRedPacket }
  });

  // 获取群制度
  const { data: contractGroupRules } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: GroupInfoABI,
    functionName: 'groupRules',
    query: { enabled: isRedPacket }
  });

  // 当前用户账户
  const { address: currentUserAddress } = useAccount();

  // 是否是群主
  const isMainOwner =
    currentUserAddress && mainOwnerAddress
      ? currentUserAddress.toLowerCase() === mainOwnerAddress.toLowerCase()
      : false;

  // 检查是否是群成员
  // 红包群使用 getMember，Community 群使用 isActiveMember
  const RedPacketMemberABI = parseAbi([
    'function getMember(address) view returns (bool exists, uint64 joinAt, uint32 subgroupId)'
  ]);

  const CommunityMemberABI = parseAbi([
    'function isActiveMember(address account) view returns (bool)'
  ]);

  // 红包群成员查询
  const { data: redPacketMemberData, refetch: refetchRedPacketMember } =
    useReadContract({
      address: conversationId as `0x${string}`,
      abi: RedPacketMemberABI,
      functionName: 'getMember',
      args: currentUserAddress ? [currentUserAddress] : undefined,
      query: { enabled: isRedPacket && !!currentUserAddress }
    });

  // Community 群成员查询
  const { data: communityMemberData, refetch: refetchCommunityMember } =
    useReadContract({
      address: conversationId as `0x${string}`,
      abi: CommunityMemberABI,
      functionName: 'isActiveMember',
      args: currentUserAddress ? [currentUserAddress] : undefined,
      query: { enabled: !isRedPacket && !!currentUserAddress }
    });

  // 解析成员状态 - 根据群类型
  const isMember = isRedPacket
    ? redPacketMemberData
      ? (redPacketMemberData as [boolean, bigint, number])[0]
      : false
    : communityMemberData
      ? (communityMemberData as boolean)
      : false;

  // 刷新成员状态
  const refetchMember = isRedPacket
    ? refetchRedPacketMember
    : refetchCommunityMember;

  // 加入群组状态
  const [isJoining, setIsJoining] = useState(false);

  // 加入群组 ABI
  const JoinABI = parseAbi([
    'function join(uint32, bytes32)',
    'function approve(address, uint256) returns (bool)'
  ]);

  // 加入群组处理函数
  const handleJoinGroup = async () => {
    if (!currentUserAddress || !groupTokenAddress) {
      toast({
        title: '错误',
        description: '请先连接钱包',
        variant: 'destructive'
      });
      return;
    }

    setIsJoining(true);
    try {
      console.log('🚪 [加入群组] 开始加入', {
        groupAddress: conversationId,
        tokenAddress: groupTokenAddress,
        entryFee: entryFeeAmount?.toString(),
        tokenSymbol: displayTokenSymbol
      });

      const ERC20ABI = parseAbi([
        'function balanceOf(address) view returns (uint256)',
        'function approve(address, uint256) returns (bool)'
      ]);

      // 1. 检查代币余额
      if (entryFeeAmount && BigInt(entryFeeAmount as bigint) > BigInt(0)) {
        const balance = (await publicClient?.readContract({
          address: groupTokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [currentUserAddress]
        })) as bigint;

        console.log('💰 [加入群组] 代币余额:', {
          balance: balance?.toString(),
          required: entryFeeAmount.toString(),
          sufficient: balance >= BigInt(entryFeeAmount as bigint)
        });

        if (!balance || balance < BigInt(entryFeeAmount as bigint)) {
          toast({
            title: '余额不足',
            description: `需要 ${displayEntryFee} ${displayTokenSymbol}`,
            variant: 'destructive'
          });
          return;
        }

        // 2. 授权进群费用（使用无限授权，避免精度问题）
        toast({ title: '授权中...', description: '请在钱包中确认授权' });

        const approveTx = await writeContractAsync({
          address: groupTokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [
            conversationId as `0x${string}`,
            BigInt(
              '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
            )
          ] // maxUint256
        });

        console.log('✅ [加入群组] 授权成功:', approveTx);
      }

      // 3. 加入群组
      toast({ title: '加入中...', description: '请在钱包中确认交易' });

      const joinTx = await writeContractAsync({
        address: conversationId as `0x${string}`,
        abi: JoinABI,
        functionName: 'join',
        args: [
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
        ]
      });

      console.log('✅ [加入群组] 加入成功:', joinTx);

      toast({ title: '加入成功', description: '你已成功加入群组' });

      // 刷新成员状态
      refetchMember();
    } catch (error: any) {
      console.error('❌ [加入群组] 失败:', error);

      const errorMessage = error?.message || error?.toString() || '';
      const errorLower = errorMessage.toLowerCase();

      if (
        errorLower.includes('user rejected') ||
        errorLower.includes('user denied')
      ) {
        console.log('👤 用户取消了交易');
      } else {
        toast({
          title: '加入失败',
          description: errorMessage.slice(0, 100) || '请稍后重试',
          variant: 'destructive'
        });
      }
    } finally {
      setIsJoining(false);
    }
  };

  // toast
  const { toast } = useToast();

  // 本地编辑状态
  const [editGroupName, setEditGroupName] = useState('');
  const [editAnnouncement, setEditAnnouncement] = useState('');
  const [editEconomicModel, setEditEconomicModel] = useState('');
  const [editGroupRules, setEditGroupRules] = useState('');
  const [editEntryFee, setEditEntryFee] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 初始化本地状态（从链上数据）
  useEffect(() => {
    if (contractAnnouncement !== undefined) {
      setEditAnnouncement((contractAnnouncement as string) || '');
    }
  }, [contractAnnouncement]);

  useEffect(() => {
    if (contractEconomicModel !== undefined) {
      setEditEconomicModel((contractEconomicModel as string) || '');
    }
  }, [contractEconomicModel]);

  useEffect(() => {
    if (contractGroupRules !== undefined) {
      setEditGroupRules((contractGroupRules as string) || '');
    }
  }, [contractGroupRules]);

  // 初始化群名称（优先从合约，其次从 props）
  useEffect(() => {
    if (contractGroupName) {
      setEditGroupName(contractGroupName as string);
    } else if (initialGroupName) {
      setEditGroupName(initialGroupName);
    }
  }, [contractGroupName, initialGroupName]);

  // 写合约
  const { writeContractAsync } = useWriteContract();

  // 保存修改 ABI
  const SetterABI = parseAbi([
    'function setGroupSettings(string newGroupName, string newEconomicModel, string newGroupRules, string newAnnouncement, uint256 newEntryFee)'
  ]);

  // 保存处理函数
  const handleSave = async () => {
    if (!isMainOwner) {
      toast({
        title: '无权限',
        description: '只有群主才能修改群信息',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // 检查是否有任何变化
      const hasGroupNameChanged = editGroupName !== (initialGroupName || '');
      const hasEconomicModelChanged =
        editEconomicModel !== (contractEconomicModel || '');
      const hasGroupRulesChanged =
        editGroupRules !== (contractGroupRules || '');
      const hasAnnouncementChanged =
        editAnnouncement !== (contractAnnouncement || '');

      // 计算新的进群费用
      let newFeeWei = entryFeeAmount || BigInt(0);
      let hasEntryFeeChanged = false;
      if (editEntryFee && tokenDecimals) {
        newFeeWei = BigInt(
          Math.floor(Number(editEntryFee) * Math.pow(10, Number(tokenDecimals)))
        );
        hasEntryFeeChanged = newFeeWei !== entryFeeAmount;
      }

      // 如果没有任何变化
      if (
        !hasGroupNameChanged &&
        !hasEconomicModelChanged &&
        !hasGroupRulesChanged &&
        !hasAnnouncementChanged &&
        !hasEntryFeeChanged
      ) {
        toast({ title: '无修改', description: '没有需要保存的内容' });
        setIsSaving(false);
        return;
      }

      // 使用 setGroupSettings 一次性保存所有设置
      await writeContractAsync({
        address: conversationId as `0x${string}`,
        abi: SetterABI,
        functionName: 'setGroupSettings',
        args: [
          editGroupName || (initialGroupName as string) || '', // newGroupName
          editEconomicModel || '', // newEconomicModel
          editGroupRules || '', // newGroupRules
          editAnnouncement || '', // newAnnouncement
          newFeeWei // newEntryFee
        ]
      });

      toast({
        title: '保存成功',
        description: `已提交合约更新申请`
      });
    } catch (error: any) {
      console.error('保存失败:', error);
      toast({
        title: '保存失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 群代币和进群费 ABI
  const GroupTokenABI = parseAbi([
    'function groupToken() view returns (address)',
    'function entryFeeAmount() view returns (uint256)'
  ]);

  // Community 群代币 ABI
  const CommunityTokenABI = parseAbi([
    'function topicToken() view returns (address)'
  ]);

  // ERC20 代币 ABI
  const ERC20ABI = parseAbi([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
  ]);

  // 获取红包群代币地址
  const { data: redPacketTokenAddress } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: GroupTokenABI,
    functionName: 'groupToken',
    query: { enabled: isRedPacket }
  });

  // 获取 Community 群代币地址
  const { data: communityTokenAddress } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: CommunityTokenABI,
    functionName: 'topicToken',
    query: { enabled: !isRedPacket }
  });

  // 统一代币地址
  const groupTokenAddress = isRedPacket
    ? redPacketTokenAddress
    : communityTokenAddress;

  // 获取进群费用（只有红包群有）
  const { data: entryFeeAmount } = useReadContract({
    address: conversationId as `0x${string}`,
    abi: GroupTokenABI,
    functionName: 'entryFeeAmount',
    query: { enabled: isRedPacket }
  });

  // 获取代币符号
  const { data: tokenSymbol } = useReadContract({
    address: groupTokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'symbol',
    query: { enabled: !!groupTokenAddress }
  });

  // 获取代币小数位
  const { data: tokenDecimals } = useReadContract({
    address: groupTokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: { enabled: !!groupTokenAddress }
  });

  // 格式化进群费用
  const formatEntryFee = () => {
    if (!entryFeeAmount || !tokenDecimals) return '0';
    const decimals = Number(tokenDecimals);
    const fee = Number(entryFeeAmount) / Math.pow(10, decimals);
    // 如果是整数就不显示小数
    return fee % 1 === 0 ? fee.toString() : fee.toFixed(2);
  };

  const displayTokenSymbol = tokenSymbol || 'TOKEN';
  const displayEntryFee = formatEntryFee();

  // Trust Wallet 代币图标 URL
  const getTokenLogoUrl = (cId: number, address: string | undefined) => {
    if (!address) return null;

    const chainMap: Record<number, string> = {
      1: 'ethereum',
      56: 'smartchain',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      8453: 'base',
      204: 'opbnb',
      43114: 'avalanche'
    };

    const chain = chainMap[cId];
    if (!chain) return null;

    // Trust Wallet 资产库 URL
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;
  };

  const tokenLogoUrl = getTokenLogoUrl(chainId, groupTokenAddress as string);

  // 图标加载失败状态
  const [tokenLogoError, setTokenLogoError] = useState(false);

  // 获取群成员地址列表（最多获取100个）
  const { members: memberAddresses, isLoading: isMembersLoading } =
    useCommunityMembers(conversationId, 0, 100, groupType);

  // 控制成员列表展开/收起状态
  const [showAllMembers, setShowAllMembers] = useState(false);

  // 置顶公告聊天开关状态
  const [isPinAnnouncementEnabled, setIsPinAnnouncementEnabled] =
    useState(false);

  // 默认显示14个成员（加邀请按钮共15格，即5列x3行），展开后显示全部
  const displayedMembers = showAllMembers
    ? memberAddresses
    : memberAddresses.slice(0, 14);

  // 群名称
  const groupName = initialGroupName || '未知群聊';

  // 新增：模拟 "我的群聊" 数据
  const myGroupsData = [
    {
      id: 'g1',
      name: '闲聊吹水群',
      avatars: [
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg'
      ]
    },
    {
      id: 'g2',
      name: '张总XX业务群',
      avatars: ['/placeholder-user.jpg', '/placeholder-user.jpg']
    },
    { id: 'g3', name: '刘总XX业务群', avatars: ['/placeholder-user.jpg'] },
    {
      id: 'g4',
      name: '何光XX业务群',
      avatars: [
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg'
      ]
    },
    { id: 'g5', name: '项目讨论群', avatars: ['/placeholder-user.jpg'] },
    {
      id: 'g6',
      name: '家人群',
      avatars: ['/placeholder-user.jpg', '/placeholder-user.jpg']
    }
  ];

  const [showAllMyGroups, setShowAllMyGroups] = useState(false); // 控制 "我的群聊" 列表展开/收起状态
  const displayedMyGroups = showAllMyGroups ? myGroupsData : []; // 修正：收起时一个也不展示

  return (
    <div className="bg-gray-100 w-full h-full relative z-20">
      {/* Header - 使用统一的 PageHeader 组件 */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm">
        {/* 顶部钱包栏 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ height: `${TOP_BAR_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2">
            <ChainSelectorDropdown />
          </div>
        </div>

        {/* 页面标题栏 - 使用 PageHeader 组件 */}
        <PageHeader title="聊天信息" onBack={onClose} bordered={false} />
      </div>

      {/* 内容区域 */}
      <div
        className="absolute w-full overflow-y-auto bg-[#ededed]"
        style={{
          top: `${TOTAL_HEADER_HEIGHT}px`,
          bottom: 0
        }}
      >
        <div className="space-y-3">
          {/* 群成员 */}
          <div className="bg-white p-4">
            <h2 className="text-lg font-semibold mb-3">
              群成员 ({memberAddresses.length || memberCount})
            </h2>

            {isMembersLoading ? (
              // 加载中的骨架屏
              <div className="grid grid-cols-5 gap-4 text-center">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-md bg-gray-200 animate-pulse" />
                    <div className="w-10 h-3 mt-1 bg-gray-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : memberAddresses.length === 0 ? (
              // 没有成员
              <div className="text-center text-gray-400 py-4">暂无成员</div>
            ) : (
              // 成员列表
              <div className="grid grid-cols-5 gap-4 text-center">
                {displayedMembers.map((address) => (
                  <MemberItem key={address} address={address as Address} />
                ))}

                {/* 邀请按钮 */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-md  flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                    <span className="text-xl">+</span>
                  </div>
                </div>
              </div>
            )}

            {/* 更多群成员按钮 */}
            {memberAddresses.length > 14 && (
              <div className="flex justify-center mt-4">
                <button
                  className="text-blue-500 text-sm flex items-center gap-1"
                  onClick={() => setShowAllMembers(!showAllMembers)}
                >
                  {showAllMembers ? (
                    <>
                      收起 <span className="text-xs">▲</span>
                    </>
                  ) : (
                    <>
                      更多群成员 <span className="text-xs">▼</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 群信息 */}
          <div className="bg-white px-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群名称</span>
              {isMainOwner ? (
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="text-right text-gray-500 bg-transparent border-0 p-0 text-sm focus:outline-none focus:ring-0 max-w-[180px]"
                  placeholder="请输入群名称"
                />
              ) : (
                <span className="text-gray-500">{groupName}</span>
              )}
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群二维码</span>
              <Image
                src="/chats/qrcode.png"
                alt="QR Code"
                width={24}
                height={24}
              />
            </div>

            {/* 群合约 */}
            <div className="py-2">
              <div className="text-gray-700 mb-1">群合约</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 break-all">
                  {conversationId}
                </span>
                <button className="ml-2 p-1 rounded">
                  <Image
                    src="/contacts/copy.svg"
                    alt="Copy"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            </div>

            {/* 我的群聊 */}
            {/* <div className="py-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">
                  我的群聊 ({myGroupsData.length})
                </span>
                <button
                  className="text-blue-500"
                  onClick={() => setShowAllMyGroups(!showAllMyGroups)}
                >
                  {showAllMyGroups ? '收起' : '展开所有群聊'}
                </button>
              </div>
              <div className="space-y-3">
                {displayedMyGroups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-3">
                    <div className="relative flex -space-x-2">
                      {group.avatars.map((avatar, index) => (
                        <Image
                          key={index}
                          src={avatar}
                          alt="Group Avatar"
                          width={24}
                          height={24}
                          className="rounded-full border border-white"
                        />
                      ))}
                    </div>
                    <span className="text-gray-700">{group.name}</span>
                  </div>
                ))}
              </div>
            </div> */}
          </div>

          {/* 经济模型 - 只有红包群显示 */}
          {isRedPacket && (
            <div className="bg-white p-4">
              <div className="text-gray-700 mb-2">经济模型</div>
              <textarea
                placeholder="请输入..."
                rows={3}
                value={editEconomicModel}
                onChange={(e) => setEditEconomicModel(e.target.value)}
                readOnly={!isMainOwner}
                className={cn(
                  'w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none',
                  !isMainOwner && 'text-gray-500 cursor-default'
                )}
              />
            </div>
          )}

          {/* 群制度 - 只有红包群显示 */}
          {isRedPacket && (
            <div className="bg-white p-4">
              <div className="text-gray-700 mb-2">群制度</div>
              <textarea
                placeholder="请输入..."
                rows={3}
                value={editGroupRules}
                onChange={(e) => setEditGroupRules(e.target.value)}
                readOnly={!isMainOwner}
                className={cn(
                  'w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none',
                  !isMainOwner && 'text-gray-500 cursor-default'
                )}
              />
            </div>
          )}

          {/* 群公告 - 只有红包群显示 */}
          {isRedPacket && (
            <div className="bg-white p-4">
              <div className="text-gray-700 mb-2">群公告</div>
              <textarea
                placeholder="请输入..."
                rows={3}
                value={editAnnouncement}
                onChange={(e) => setEditAnnouncement(e.target.value)}
                readOnly={!isMainOwner}
                className={cn(
                  'w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none',
                  !isMainOwner && 'text-gray-500 cursor-default'
                )}
              />
            </div>
          )}

          {/* 邀请新人排行榜 - 只有红包群显示 */}
          {isRedPacket && (
            <div
              className="bg-white p-4 cursor-pointer active:bg-gray-50 transition-colors"
              onClick={() =>
                router.push(`/invite/rank?group=${conversationId}`)
              }
            >
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">邀请新人排行榜</span>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-green-500"
                >
                  <rect
                    x="4"
                    y="14"
                    width="4"
                    height="6"
                    fill="currentColor"
                    rx="1"
                  />
                  <rect
                    x="10"
                    y="8"
                    width="4"
                    height="12"
                    fill="currentColor"
                    rx="1"
                  />
                  <rect
                    x="16"
                    y="4"
                    width="4"
                    height="16"
                    fill="currentColor"
                    rx="1"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* 置顶公告聊天 */}
          <div className="bg-white p-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">置顶公告聊天</span>
              <Switch
                checked={isPinAnnouncementEnabled}
                onCheckedChange={setIsPinAnnouncementEnabled}
                uncheckedColorClass="bg-gray-200"
                checkedColorClass="bg-blue-500"
              />
            </div>
          </div>

          {/* 群代币信息分组 */}
          <div className="bg-white p-4 space-y-3">
            {/* 群代币合约地址 */}
            <div className="pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700">群代币合约地址</span>
                <div className="flex items-center gap-1.5">
                  {chainIcon ? (
                    <img
                      src={chainIcon}
                      alt={chainName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {chainShortName}
                    </div>
                  )}
                  <span className="text-sm text-gray-700">{chainName}</span>
                </div>
              </div>
              <input
                type="text"
                value={groupTokenAddress || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm text-gray-500 focus:outline-none focus:ring-0 cursor-default"
              />
            </div>

            {/* 代币名称 */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">代币名称</span>
              <div className="flex items-center gap-1.5">
                {tokenLogoUrl && !tokenLogoError ? (
                  <img
                    src={tokenLogoUrl}
                    alt={displayTokenSymbol}
                    className="w-5 h-5 rounded-full object-cover"
                    onError={() => setTokenLogoError(true)}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">
                    {displayTokenSymbol.charAt(0)}
                  </div>
                )}
                <span className="text-sm text-gray-700">
                  {displayTokenSymbol}
                </span>
              </div>
            </div>

            {/* 进群费用 - 只有红包群显示 */}
            {isRedPacket && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">进群费用</span>
                <div className="flex items-center gap-1.5">
                  {isMainOwner ? (
                    <input
                      type="number"
                      value={editEntryFee || displayEntryFee}
                      onChange={(e) => setEditEntryFee(e.target.value)}
                      className="w-20 text-right text-sm text-gray-700 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                      placeholder="0"
                    />
                  ) : (
                    <span className="text-sm text-gray-700">
                      {displayEntryFee}
                    </span>
                  )}
                  {tokenLogoUrl && !tokenLogoError ? (
                    <img
                      src={tokenLogoUrl}
                      alt={displayTokenSymbol}
                      className="w-5 h-5 rounded-full object-cover"
                      onError={() => setTokenLogoError(true)}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {displayTokenSymbol.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-gray-700">
                    {displayTokenSymbol}
                  </span>
                </div>
              </div>
            )}

            {/* 群聊建群分配比例 - 只有红包群群主可见 */}
            {isRedPacket && isMainOwner && (
              <div className="pt-2">
                <div className="flex justify-between items-center py-2 mb-4">
                  <span className="text-gray-700">群聊建群分配比例</span>
                  <span className="text-sm text-gray-700">
                    {ownerPercent + refPercent + poolPercent}%/100%
                  </span>
                </div>

                <div className="space-y-3 pl-4 bg-[#fbfbfb] py-3 px-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      群主可获得群收益
                    </span>
                    <span className="text-sm text-gray-700">
                      {ownerPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      邀请人可获得群收益
                    </span>
                    <span className="text-sm text-gray-700">{refPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      群成员可获得群收益
                    </span>
                    <span className="text-sm text-gray-700">
                      {poolPercent}%
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* 修改并保存按钮 - 只有红包群群主可见 */}
            {isRedPacket && isMainOwner && (
              <div className="px-4 pb-4 pt-4">
                <button
                  className={cn(
                    'w-full h-12 bg-green-500 text-white rounded-full text-base font-medium shadow-lg',
                    isSaving && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '修改并保存'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
