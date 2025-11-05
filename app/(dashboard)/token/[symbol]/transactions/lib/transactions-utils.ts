// Cursor 类型定义（用于分页）
export interface Cursor {
  timestamp: number;
  tx_hash: string;
  log_index: number;
}

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
export function createContactSummary(
  name: string = 'James',
  address: string = '0x052cc4e91eaDC9a40BD66F4b6f63BE4f9c0559ab'
) {
  return {
    name,
    avatar: '/me/me2.png',
    totalTransactions: 23,
    totalBalance: '$ 340,020.0',
    walletAddress: address
  };
}

// 辅助函数：格式化时间戳
function formatTimestamp(timestamp: number): {
  date: string;
  timestamp: string;
} {
  const date = new Date(timestamp * 1000); // 假设是秒级时间戳
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    timestamp: `${year}-${month}-${day} ${hours}:${minutes}`
  };
}

// 辅助函数：格式化金额（需要知道 token 的 decimals，这里假设 18）
function formatAmount(rawAmount: string, decimals: number = 18): string {
  try {
    const amount = BigInt(rawAmount);
    const divisor = BigInt(10 ** decimals);
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    return trimmedFractional
      ? `${wholePart}.${trimmedFractional}`
      : wholePart.toString();
  } catch (error) {
    console.error('格式化金额失败:', error);
    return '0';
  }
}

// 获取交易记录 - 从数据库查询真实数据
export async function fetchTransactions(
  contactName: string,
  contactAddress: string,
  userAddress: string,
  directionFlag: 'all' | 'income' | 'expense' = 'all',
  cursor?: Cursor
): Promise<{
  transactions: TransactionRecord[];
  hasMore: boolean;
  nextCursor: Cursor | null;
}> {
  try {
    const params = new URLSearchParams({
      userAddress: userAddress.toLowerCase(),
      counterpartyAddress: contactAddress.toLowerCase(),
      directionFlag: directionFlag
    });

    if (cursor) {
      params.append('cursor', JSON.stringify(cursor));
    }

    const response = await fetch(
      `/api/contacts/transactions?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error('获取交易记录失败');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '获取交易记录失败');
    }

    // 转换数据格式
    const transactions: TransactionRecord[] = result.transactions.map(
      (row: any) => {
        const { date, timestamp } = formatTimestamp(row.timestamp);
        const isPositive = row.direction_flag === 0;

        // 格式化金额（这里假设是 ETH，decimals=18）
        const formattedAmount = formatAmount(row.raw_amount, 18);
        const amountStr = `${isPositive ? '+' : '-'}${formattedAmount} ETH`;

        // 格式化 USD 值
        const usdValue = parseFloat(row.signed_usd);
        const usdValueStr =
          usdValue >= 0
            ? `≈$${Math.abs(usdValue).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
            : `-$${Math.abs(usdValue).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

        return {
          id: `${row.tx_hash}-${row.log_index}`,
          contactName: contactName,
          contactAvatar: '/me/me2.png', // 默认头像
          amount: amountStr,
          usdValue: usdValueStr,
          isPositive: isPositive,
          fromAddress: row.from,
          toAddress: row.to,
          timestamp: timestamp,
          date: date,
          transactionHash: row.tx_hash,
          network: 'Arbitrum', // 需要根据实际情况判断
          networkIcon: '/discover/arbitrum.png'
        };
      }
    );

    return {
      transactions,
      hasMore: result.hasMore || false,
      nextCursor: result.nextCursor || null
    };
  } catch (error) {
    console.error('获取交易记录失败:', error);
    // 返回空结果
    return {
      transactions: [],
      hasMore: false,
      nextCursor: null
    };
  }
}

// 获取联系人摘要 - 从数据库查询真实数据
export async function fetchContactSummary(
  contactName: string,
  contactAddress: string,
  userAddress: string // 当前用户地址
): Promise<ContactSummary> {
  try {
    const params = new URLSearchParams({
      userAddress: userAddress.toLowerCase(),
      counterpartyAddress: contactAddress.toLowerCase()
    });

    const response = await fetch(`/api/contacts/summary?${params.toString()}`);

    if (!response.ok) {
      throw new Error('获取联系人摘要失败');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '获取联系人摘要失败');
    }

    const data = result.data;

    // 格式化金额：转换为美元格式
    const totalBalance = `$ ${parseFloat(data.total_usd || '0').toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }
    )}`;

    return {
      name: contactName,
      avatar: '/me/me2.png', // 默认头像，后续可以从其他地方获取
      totalTransactions: data.total_txs || 0,
      totalBalance: totalBalance,
      walletAddress: contactAddress
    };
  } catch (error) {
    console.error('获取联系人摘要失败:', error);
    // 返回默认值
    return {
      name: contactName,
      avatar: '/me/me2.png',
      totalTransactions: 0,
      totalBalance: '$ 0.0',
      walletAddress: contactAddress
    };
  }
}
