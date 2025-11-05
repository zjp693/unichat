import 'server-only';
import { neon } from '@neondatabase/serverless';

// 检查环境变量
const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('⚠️ 警告: POSTGRES_URL 环境变量未设置');
  console.error('请确保在 .env.local 文件中设置了 POSTGRES_URL');
}

// Neon 数据库客户端
// 如果没有设置环境变量，使用空字符串（会在执行查询时失败并给出明确的错误信息）
const sql = neon(databaseUrl || '');

export { sql };

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
