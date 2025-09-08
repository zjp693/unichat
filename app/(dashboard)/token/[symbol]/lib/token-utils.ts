// 从全局工具库导入
export { formatNumber, toDateYMD, toDateTime } from '@/lib/utils';

export interface FetchTransfersResult<T = any> {
  cursor: string | null;
  list: T[];
}

export async function fetchErc20Transfers(params: {
  address: string;
  chain: string;
  cursor?: string | null;
  limit?: number;
  order?: 'ASC' | 'DESC';
  tokenAddress?: string;
}): Promise<FetchTransfersResult> {
  const { address, chain, cursor, limit = 100, order = 'DESC', tokenAddress } = params;
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(`/api/moralis/transfers`, base);
  url.searchParams.set('address', address);
  url.searchParams.set('chain', chain);
  if (cursor) url.searchParams.set('cursor', cursor);
  if (limit) url.searchParams.set('limit', String(limit));
  if (order) url.searchParams.set('order', order);
  if (tokenAddress) url.searchParams.set('contract_addresses', tokenAddress);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) return { cursor: null, list: [] };
  const json = await res.json();
  const list = Array.isArray(json?.result) ? json.result : [];
  const nextCursor = json?.cursor ?? null;
  return { cursor: nextCursor, list };
}