// 智能合约ABI
import MerkleDistribute from '@/contract/abi/merkle_distribute.json';
import CelebrityRegistryV1 from '@/contract/abi/celebrity_registryV1.json';

export const MERKLE_DISTRIBUTE_ABI = MerkleDistribute.abi;
export const CELEBRITY_REGISTRY_V1_ABI = CelebrityRegistryV1.abi;

// 获取名人注册合约地址
export function getCelebrityRegistryAddress() {
  const address = process.env.NEXT_PUBLIC_CELEBRITY_REGISTRY_ADDRESS;
  if (!address) {
    console.warn('NEXT_PUBLIC_CELEBRITY_REGISTRY_ADDRESS 环境变量未设置');
    return '';
  }
  return address;
}

// 智能合约中的名人数据结构
export interface CelebrityFromContract {
  id: bigint;
  addr: string;
  nameKey: string;
  name: string;
  cid: string;
  active: boolean;
}

// 获取名人列表的参数接口
export interface GetCelebritiesParams {
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}

// 真实的智能合约调用参数准备函数
export function prepareCelebrityContractCall(params: GetCelebritiesParams = {}) {
  const { page = 0, pageSize = 10, activeOnly = true } = params;
  const contractAddress = getCelebrityRegistryAddress();
  
  
  const offset = BigInt(page * pageSize);
  const limit = BigInt(pageSize);
  
  return {
    address: contractAddress as `0x${string}`,
    abi: CELEBRITY_REGISTRY_V1_ABI,
    functionName: activeOnly ? 'getByPage' : 'getAllByPage',
    args: [offset, limit],
    query: {
      enabled: !!contractAddress && contractAddress.startsWith('0x') && contractAddress.length === 42,
      retry: 3,
      retryDelay: 1000,
    }
  };
}

// 获取总数的合约调用参数
export function prepareTotalCountCall(activeOnly: boolean = true) {
  const contractAddress = getCelebrityRegistryAddress();
  

  
  return {
    address: contractAddress as `0x${string}`,
    abi: CELEBRITY_REGISTRY_V1_ABI,
    functionName: activeOnly ? 'totalActive' : 'total',
    query: {
      enabled: !!contractAddress && contractAddress.startsWith('0x') && contractAddress.length === 42,
    }
  };
}

// 根据钱包地址搜索名人的合约调用参数
export function prepareGetByAddressCall(searchAddress: string) {
  const contractAddress = getCelebrityRegistryAddress();
  
  // console.log('=== 准备根据地址搜索名人 ===');
  // console.log('搜索地址:', searchAddress);
  // console.log('合约地址:', contractAddress);
  
  // 检查是否为有效的地址格式，如果不是则禁用查询
  const isValidAddress = searchAddress.startsWith('0x') && 
                        searchAddress.length === 42 && 
                        /^0x[a-fA-F0-9]{40}$/.test(searchAddress);
  
  return {
    address: contractAddress as `0x${string}`,
    abi: CELEBRITY_REGISTRY_V1_ABI,
    functionName: 'getByAddress',
    args: [searchAddress],  // 直接传用户输入，不做任何验证
    query: {
      enabled: !!contractAddress && 
               contractAddress.startsWith('0x') && 
               contractAddress.length === 42 &&
               !!searchAddress && 
               searchAddress.trim().length > 0,  // 只要有搜索内容就启用查询
      retry: 3,
      retryDelay: 1000,
    }
  };
}

// 将合约数据转换为前端使用的Contact格式
export function convertContractDataToContact(contractData: CelebrityFromContract, rank?: number): Contact {
  // 构建IPFS头像URL
  const avatarUrl = contractData.cid 
    ? `https://aqua-biological-spider-837.mypinata.cloud/ipfs/${contractData.cid}`
    : '/me/me1.png'; // 如果没有CID，使用默认头像
    
  return {
    id: `celebrity_${contractData.id}`,
    name: contractData.name,
    walletAddress: contractData.addr,
    avatar: avatarUrl,
    type: 'celebrity',
    rank: rank,
    bio: '观察', // 简化为统一的观察状态
    hasNotification: Math.random() > 0.5 // 随机通知状态
  };
}

// Hook 使用示例函数 - 在页面组件中这样使用真实的智能合约调用
export function createCelebrityContractHooks() {
  return {
    // 使用方式示例：
    // const { data: celebrities, isLoading, error } = useReadContract(prepareCelebrityContractCall({ page: 0, pageSize: 10 }));
    // const { data: totalCount } = useReadContract(prepareTotalCountCall(true));
    
    // 处理合约返回数据的示例：
    processContractData: (contractData: CelebrityFromContract[] | undefined) => {
      if (!contractData) return [];
      
      // console.log('=== 处理真实合约数据 ===');
      // console.log('原始合约数据:', contractData);
      
      const processedData = contractData.map((item, index) => {
        const contact = convertContractDataToContact(item, index + 1);
        // console.log(`处理第 ${index + 1} 个名人:`, {
        //   原始数据: item,
        //   转换后: contact
        // });
        return contact;
      });
      
      // console.log('=== 数据处理完成 ===');
      return processedData;
    },
    
    // 错误处理
    handleContractError: (error: any) => {
      console.error('=== 智能合约调用错误 ===');
      console.error('错误类型:', error?.name);
      console.error('错误信息:', error?.message);
      console.error('完整错误:', error);
      console.error('=== 错误处理完成 ===');
    }
  };
}


export interface Contact {
  id: string;
  name: string;
  walletAddress: string;
  avatar: string;
  type: 'traded' | 'mutual_friends' | 'friend' | 'celebrity';
  transactionAmount?: number;
  mutualFriendsCount?: number;
  isOnline?: boolean;
  lastSeen?: string;
  bio?: string;
  rank?: number; // 富豪排行榜排名
  netWorth?: number; // 净资产
  hasNotification?: boolean; // 是否显示红色小红点
}

// 与我交易过的地址
export const tradedContacts: Contact[] = [
  {
    id: 'traded_1',
    name: 'James',
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    avatar: '/me/me1.png',
    type: 'traded',
    transactionAmount: 349638.0,
    isOnline: true
  },
  {
    id: 'traded_2',
    name: 'Michael',
    walletAddress: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',
    avatar: '/me/me2.png',
    type: 'traded',
    transactionAmount: 168449.73,
    isOnline: false,
    lastSeen: '2小时前'
  },
  {
    id: 'traded_3',
    name: 'David',
    walletAddress: '0x742d35Cc6634C0532925a3b8D6C04D24F87b4e5F',
    avatar: '/me/me1.png',
    type: 'traded',
    transactionAmount: 178156.84,
    isOnline: true
  },
  {
    id: 'traded_4',
    name: 'William',
    walletAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    avatar: '/me/me2.png',
    type: 'traded',
    transactionAmount: 245463.34,
    isOnline: false
  },
  {
    id: 'traded_5',
    name: 'Ethan',
    walletAddress: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
    avatar: '/me/me1.png',
    type: 'traded',
    transactionAmount: 178509.16,
    isOnline: true
  }
];

// 共同好友的联系人
export const mutualFriendsContacts: Contact[] = [
  {
    id: 'mutual_1',
    name: 'Alexander',
    walletAddress: '0xdF3e18d64BC6A983f673Ab319CCaE4f1a5',
    avatar: '/me/me2.png',
    type: 'mutual_friends',
    mutualFriendsCount: 5,
    isOnline: false
  },
  {
    id: 'mutual_2',
    name: 'Benjamin',
    walletAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC42',
    avatar: '/me/me1.png',
    type: 'mutual_friends',
    mutualFriendsCount: 3,
    isOnline: true
  },
  {
    id: 'mutual_3',
    name: 'Daniel',
    walletAddress: '0x6B175474E89094C44Da98b954EedeAC495',
    avatar: '/me/me2.png',
    type: 'mutual_friends',
    mutualFriendsCount: 7,
    isOnline: false
  }
];

// 名人富豪榜
export const celebrityContacts: Contact[] = [
  {
    id: 'celebrity_1',
    name: 'Vitalik',
    walletAddress: '0x052cc4e91eaDC99ad0BF66F4b6f2BE4f9c0559ab',
    avatar: '/me/me1.png',
    type: 'celebrity',
    rank: 1,
    netWorth: 15806081818.1,
    bio: '观察',
    hasNotification: true
  },
  {
    id: 'celebrity_2',
    name: 'Trump',
    walletAddress: '0x052cc4e91eaDC99ad0BF66F4b6f2BE4f9c0559ab',
    avatar: '/me/me1.png',
    type: 'celebrity',
    rank: 2,
    netWorth: 15635443616,
    bio: '观察',
    hasNotification: false
  },
  {
    id: 'celebrity_3',
    name: 'Musk',
    walletAddress: '0x052cc4e91eaDC99ad0BF66F4b6f2BE4f9c0559ab',
    avatar: '/me/me1.png',
    type: 'celebrity',
    rank: 3,
    netWorth: 15606086348,
    bio: '观察',
    hasNotification: true
  },
  {
    id: 'celebrity_4',
    name: 'Jack Dorsey',
    walletAddress: '0x052cc4e91eaDC99ad0BF66F4b6f2BE4f9c0559ab',
    avatar: '/me/me1.png',
    type: 'celebrity',
    rank: 4,
    netWorth: 15344034359,
    bio: '观察',
    hasNotification: false
  },
  {
    id: 'celebrity_5',
    name: 'Changpeng Zhao (CZ)',
    walletAddress: '0x052cc4e91eaDC99ad0BF66F4b6f2BE4f9c0559ab',
    avatar: '/me/me1.png',
    type: 'celebrity',
    rank: 5,
    netWorth: 15320055354,
    bio: '观察',
    hasNotification: true
  },
  {
    id: 'celebrity_6',
    name: 'Jed McCaleb',
    walletAddress: '0x052cc4e91eaDC99ad0BF66F4b6f2BE4f9c0559ab',
    avatar: '/me/me1.png',
    type: 'celebrity',
    rank: 6,
    netWorth: 15280674366,
    bio: '观察',
    hasNotification: false
  },
  {
    id: 'celebrity_7',
    name: 'Alexei Samoilenko',
    walletAddress: '0x052cc4e91eaDC99ad0BF66F4b6f2BE4f9c0559ab',
    avatar: '/me/me1.png',
    type: 'celebrity',
    rank: 7,
    netWorth: 15227653654,
    bio: '观察',
    hasNotification: true
  }
];

// 工具函数
export function formatWalletAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatNetWorth(amount: number): string {
  // 格式化为精确的数字显示，带逗号分隔符
  return `$ ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })}`;
}
