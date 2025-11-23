'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronRight, QrCode, Copy } from 'lucide-react';
import Image from 'next/image';
import { useAccount, useEnsName } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { useUserProfiles, useProfile } from '@/hooks/useProfileCheck';
import { IPFSImg } from '@/components/ui/ipfs-img';

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  description?: string;
  showBadge?: boolean;
  badgeText?: string;
  type?: string;
  action?: () => void;
}

export default function MePage() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { toast } = useToast();

  // 获取用户的 Profile
  const { tokenIds } = useUserProfiles();
  const firstTokenId =
    tokenIds && tokenIds.length > 0 ? tokenIds[0] : undefined;
  const { profile } = useProfile(firstTokenId);

  // 从 Profile 获取头像和昵称
  const profileData = profile as any;
  const userName =
    profileData?.name || ensName || (isConnected ? '钱包用户' : '未登录');
  const avatarCid = profileData?.avatarCid || '';

  // 动态生成菜单数据
  const menuSections = [
    {
      items: [
        {
          id: 'serve',
          title: 'Serve',
          icon: (
            <Image src="/me/serve.png" alt="serve" width={26} height={26} />
          ),
          type: 'group'
        },
        {
          id: 'detectionandDeauthorization',
          title: 'Detection and Deauthorization',
          icon: (
            <Image
              src="/me/detection.png"
              alt="Deauthorization"
              width={26}
              height={26}
            />
          )
        },
        {
          id: 'batchTransferCoins',
          title: 'Batch Transfer Coins',
          icon: (
            <Image
              src="/me/batch.png"
              alt="Batch Transfer Coins"
              width={26}
              height={26}
            />
          )
        },
        {
          id: 'muteGroupChatsList',
          title: 'Muted Group Chats List',
          icon: (
            <Image
              src="/me/muted.png"
              alt="Muted Group Chats List"
              width={26}
              height={26}
            />
          )
        },
        {
          id: 'keyStorage',
          title: 'Key Storage',
          icon: (
            <Image src="/me/key.png" alt="address" width={26} height={26} />
          ),
          type: 'group'
        },
        {
          id: 'settings',
          title: 'Set up',
          icon: (
            <Image src="/me/setup.png" alt="setting" width={26} height={26} />
          ),
          type: 'group'
        }
      ]
    }
  ];

  // 格式化钱包地址显示
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 复制地址到剪贴板
  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        toast({
          title: '复制成功',
          description: '钱包地址已复制到剪贴板',
          variant: 'success'
        });
      } catch (err) {
        console.error('复制失败:', err);
        toast({
          title: '复制失败',
          description: '无法复制地址，请手动复制',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full ">
      {/* 顶部导航栏 */}
      <div className="flex justify-evenly items-center p-4 bg-white">
        {/* <Button variant="outline" className="px-4 py-1 text-sm">
          <Image
            src="/top/bnb.png"
            alt="usa"
            className="object-cover mr-1"
            width={19}
            height={19}
          />
          BNB Chain
        </Button> */}
        <appkit-button />
        <Button variant="outline" className="flex items-center space-x-1">
          <div className="inline-block align-middle mr-1 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src="/top/usa.png"
              alt="usa"
              className="w-full h-full object-cover"
              width={20}
              height={20}
            />
          </div>
          <span className="text-sm">USA</span>
        </Button>
      </div>
      {/* <div className="p-4 border-b bg-white">
        <ChevronLeft className="h-5 w-5 text-xl" />
      </div> */}
      {/* 个人信息卡片 */}
      <div className="mb-4 p-5 bg-white">
        <div className="flex items-center space-x-4">
          <div
            className="relative cursor-pointer"
            onClick={() => router.push('/profile')}
          >
            <div className="h-16 w-16 rounded overflow-hidden hover:opacity-80 transition-opacity">
              <IPFSImg
                src={avatarCid}
                fallbackSrc="/me/me.png"
                alt="avatar"
                className="h-full w-full object-cover"
                enableLogging={false}
                maxRetries={5}
              />
            </div>
            {/* 连接状态指示器 */}
            {isConnected && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div
            className="flex-1 cursor-pointer"
            onClick={() => router.push('/profile')}
          >
            <h2 className="text-xl font-semibold hover:text-blue-600 transition-colors">
              {userName}
            </h2>
            <div className="text-sm text-muted-foreground mt-1 flex items-center">
              {isConnected ? (
                <>
                  <span>钱包 {formatAddress(address!)}</span>
                  <Copy
                    className="h-3 w-3 inline-block ml-1 cursor-pointer hover:text-foreground"
                    onClick={copyAddress}
                  />
                </>
              ) : (
                <span>未连接钱包</span>
              )}
            </div>
            {/* 显示当前网络 */}
            {isConnected && chain && (
              <div className="text-xs text-muted-foreground mt-1">
                网络: {chain.name}
              </div>
            )}
          </div>
          <div className="h-8 w-8 bg-background mt-[-10]">
            <QrCode className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* 功能菜单 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={`overflow-hidden`}>
            {section.items.map((item, itemIndex) => (
              <MenuListItem
                key={item.id}
                item={item}
                isLast={itemIndex === section.items.length - 1}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuListItem({ item, isLast }: { item: MenuItem; isLast: boolean }) {
  return (
    <div
      className={`flex items-center relative h-[50px] px-4 bg-white hover:bg-muted/50 cursor-pointer ${item.type && 'mb-2'}`}
      onClick={item.action}
    >
      <div className="flex items-center justify-center w-8 h-8 mr-3">
        {item.icon}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-base">{item.title}</h3>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>
      {/* 下边框 */}
      {!item.type && (
        <div className="border-t w-[calc(100%)] border-[#e9e9e9] absolute bottom-0 right-0"></div>
      )}
    </div>
  );
}
