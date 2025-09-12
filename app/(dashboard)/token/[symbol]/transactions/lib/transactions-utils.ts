// 接口类型定义
export interface TransactionRecord {
  id: string;
  contactName: string;
  contactAvatar: string;
  amount: string;
  usdValue: string;
  isPositive: boolean;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  date: string;
  transactionHash: string;
  network: string;
  networkIcon: string;
}

export interface ContactSummary {
  name: string;
  avatar: string;
  totalTransactions: number;
  totalBalance: string;
  walletAddress: string;
}

// 从全局工具库导入
export { formatAddress } from '@/lib/utils';

// 创建动态的联系人摘要数据
export function createContactSummary(name: string = 'James', address: string = '0x052cc4e91eaDC9a40BD66F4b6f63BE4f9c0559ab') {
  return {
    name,
    avatar: '/me/me2.png',
    totalTransactions: 23,
    totalBalance: '$ 340,020.0',
    walletAddress: address
  };
}

// 模拟API函数 - 获取交易记录
export async function fetchTransactions(contactName?: string, contactAddress?: string) {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // 模拟数据 - 与James的交易记录（完全按照图片数据）
  const mockTransactions = [
    {
      id: '1',
      contactName: 'James',
      contactAvatar: '/placeholder-user.jpg',
      amount: '-0.45 ETH',
      usdValue: '≈$2004.3',
      isPositive: false,
      fromAddress: '0x052cc4e91eaDC9a40BF66F4b6f62BE4f9c0559ab',
      toAddress: '0x052cc4e91eaDC9a40BF66F4b6f62BE4f9c0559ab',
      timestamp: '2023-08-14 09:47',
      date: '2023-08-14',
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'Arbitrum',
      networkIcon: '/discover/arbitrum.png'
    },
    {
      id: '2',
      contactName: 'James',
      contactAvatar: '/placeholder-user.jpg',
      amount: '+0.75 ETH',
      usdValue: '≈$2004.3',
      isPositive: true,
      fromAddress: '0x052cc4e91eaDC9a40BF66F4b6f62BE4f9c0559ab',
      toAddress: '0x052cc4e91eaDC9a40BF66F4b6f62BE4f9c0559ab',
      timestamp: '2023-08-12 18:12',
      date: '2023-08-12',
      transactionHash: '0x1234567890abcdef1234567890abcdef12345679',
      network: 'Arbitrum',
      networkIcon: '/discover/arbitrum.png'
    },
    {
      id: '3',
      contactName: 'James',
      contactAvatar: '/placeholder-user.jpg',
      amount: '-2.5 ETH',
      usdValue: '≈$2004.3',
      isPositive: false,
      fromAddress: '0x052cc4e91eaDC9a40BF66F4b6f62BE4f9c0559ab',
      toAddress: '0x052cc4e91eaDC9a40BF66F4b6f62BE4f9c0559ab',
      timestamp: '2023-08-10 11:05',
      date: '2023-08-10',
      transactionHash: '0x1234567890abcdef1234567890abcdef12345680',
      network: 'Arbitrum',
      networkIcon: '/discover/arbitrum.png'
    },
    {
      id: '4',
      contactName: 'James',
      contactAvatar: '/placeholder-user.jpg',
      amount: '+1.8 ETH',
      usdValue: '≈$2004.3',
      isPositive: true,
      fromAddress: '0x052cc4e91eaDC9a40BF66F4b6f62BE4f9c0559ab',
      toAddress: '0x052cc4e91eaDC9a40BF66F4b6f62BE4f9c0559ab',
      timestamp: '2023-08-08 14:30',
      date: '2023-08-08',
      transactionHash: '0x1234567890abcdef1234567890abcdef12345681',
      network: 'Arbitrum',
      networkIcon: '/discover/arbitrum.png'
    }
  ];
  
  // 直接返回写死的数据
  return mockTransactions;
}

// 模拟API函数 - 获取联系人摘要
export async function fetchContactSummary(contactName?: string, contactAddress?: string) {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  return createContactSummary('James', '0x052cc4e91eaDC9a40BD66F4b6f63BE4f9c0559ab');
}
