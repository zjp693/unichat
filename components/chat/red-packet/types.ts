export type RedPacketType = 'LUCKY' | 'NORMAL';

export interface RedPacketConfig {
  type: RedPacketType;
  tokenSymbol: string;
  tokenAddress: string; // 代币合约地址
  amount: string;
  count: number;
  message: string;
  packetId?: string; // 红包ID（用于查询已领取状态）
  status?: 'active' | 'claimed' | 'expired'; // 红包状态
}
