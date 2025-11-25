export type RedPacketType = 'LUCKY' | 'NORMAL';

export interface RedPacketConfig {
  type: RedPacketType;
  tokenSymbol: string;
  amount: string;
  count: number;
  message: string;
}
