export type RedPacketType = 'LUCKY' | 'NORMAL';

export interface RedPacketConfig {
  type: RedPacketType;
  tokenSymbol: string;
  tokenAddress: string; // 代币合约地址
  amount: string;
  count: number;
  message: string;
}
