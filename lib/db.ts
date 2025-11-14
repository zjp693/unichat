import 'server-only';
import { neon } from '@neondatabase/serverless';

// 检查环境变量
const databaseUrl = process.env.POSTGRES_URL;
const merkleDatabaseUrl = process.env.MERKLE_POSTGRES_URL;

if (!databaseUrl) {
  console.error('⚠️ 警告: POSTGRES_URL 环境变量未设置');
  console.error('请确保在 .env.local 文件中设置了 POSTGRES_URL');
}

if (!merkleDatabaseUrl) {
  console.error('⚠️ 警告: MERKLE_POSTGRES_URL 环境变量未设置');
  console.error('请确保在 .env.local 文件中设置了 MERKLE_POSTGRES_URL');
}

// Neon 数据库客户端
// 如果没有设置环境变量，使用空字符串（会在执行查询时失败并给出明确的错误信息）
const sql = neon(databaseUrl || '');
const merkleSql = neon(merkleDatabaseUrl || '');

export { sql, merkleSql };

// 模拟产品数据类型
export const statusEnum = {
  active: 'active',
  inactive: 'inactive',
  archived: 'archived'
} as const;

export type StatusType = keyof typeof statusEnum;

export type Product = {
  id: number;
  imageUrl: string;
  name: string;
  status: StatusType;
  price: number;
  stock: number;
  availableAt: Date;
};

// 模拟产品数据
export const mockProducts: Product[] = [
  {
    id: 1,
    imageUrl: '/placeholder.svg',
    name: '智能手机',
    status: 'active',
    price: 999.99,
    stock: 50,
    availableAt: new Date('2023-01-01')
  },
  {
    id: 2,
    imageUrl: '/placeholder.svg',
    name: '平板电脑',
    status: 'active',
    price: 499.99,
    stock: 30,
    availableAt: new Date('2023-02-15')
  },
  {
    id: 3,
    imageUrl: '/placeholder.svg',
    name: '智能手表',
    status: 'active',
    price: 299.99,
    stock: 100,
    availableAt: new Date('2023-03-10')
  },
  {
    id: 4,
    imageUrl: '/placeholder.svg',
    name: '无线耳机',
    status: 'inactive',
    price: 159.99,
    stock: 75,
    availableAt: new Date('2023-04-20')
  },
  {
    id: 5,
    imageUrl: '/placeholder.svg',
    name: '便携充电器',
    status: 'archived',
    price: 49.99,
    stock: 200,
    availableAt: new Date('2023-05-05')
  },
  {
    id: 6,
    imageUrl: '/placeholder.svg',
    name: '蓝牙音箱',
    status: 'active',
    price: 129.99,
    stock: 60,
    availableAt: new Date('2023-06-15')
  }
];

export type SelectProduct = Product;

// 模拟获取产品列表的函数
export async function getProducts(
  search: string,
  offset: number
): Promise<{
  products: SelectProduct[];
  newOffset: number | null;
  totalProducts: number;
}> {
  // 模拟搜索功能
  let filteredProducts = mockProducts;
  if (search) {
    filteredProducts = mockProducts.filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    );
    return {
      products: filteredProducts,
      newOffset: null,
      totalProducts: filteredProducts.length
    };
  }

  if (offset === null) {
    return { products: [], newOffset: null, totalProducts: 0 };
  }

  const totalProducts = filteredProducts.length;
  const productsPerPage = 5;
  const moreProducts = filteredProducts.slice(offset, offset + productsPerPage);
  const newOffset =
    moreProducts.length >= productsPerPage &&
    offset + productsPerPage < totalProducts
      ? offset + productsPerPage
      : null;

  return {
    products: moreProducts,
    newOffset,
    totalProducts
  };
}

// 模拟删除产品的函数
export async function deleteProductById(id: number) {
  // 在实际应用中，这里会从数据库中删除产品
  // 在这个模拟版本中，我们只是打印一条消息
  console.log(`删除产品 ID: ${id}`);
}

// ==================== Merkle Proof 相关类型和函数 ====================

export type UserProof = {
  account: string;
  community: string;
  epoch: string;
  max_tier: number;
  valid_until: string;
  nonce: string;
  proof: string; // JSON 字符串
  leaf_hash: string;
  source_table: string;
};

/**
 * 查询用户可以加入的所有群聊及其 Merkle Proof 数据
 * @param account 用户钱包地址
 * @returns 用户的所有 proof 数据
 */
export async function getUserProofs(account: string): Promise<UserProof[]> {
  if (!merkleDatabaseUrl) {
    throw new Error('MERKLE_POSTGRES_URL 未配置');
  }

  try {
    const result = await merkleSql`
      SELECT * FROM all_snapshots 
      WHERE account = ${account.toLowerCase()}
    `;
    return result as UserProof[];
  } catch (error) {
    console.error('查询用户 Merkle Proof 失败:', error);
    throw error;
  }
}

/**
 * 查询用户对特定群聊的 Merkle Proof 数据
 * @param account 用户钱包地址
 * @param community 群聊合约地址
 * @returns 用户对该群聊的 proof 数据
 */
export async function getUserProofForCommunity(
  account: string,
  community: string
): Promise<UserProof | null> {
  if (!merkleDatabaseUrl) {
    throw new Error('MERKLE_POSTGRES_URL 未配置');
  }

  try {
    const result = await merkleSql`
      SELECT * FROM all_snapshots 
      WHERE account = ${account.toLowerCase()} 
      AND community = ${community.toLowerCase()}
      LIMIT 1
    `;
    return result.length > 0 ? (result[0] as UserProof) : null;
  } catch (error) {
    console.error('查询用户群聊 Proof 失败:', error);
    throw error;
  }
}
