# 设计文档

## 概述

聊天导航栏组件是一个可复用的 React 组件，用于在群聊和私聊界面顶部显示上下文信息。该组件采用双层结构设计，顶部显示区块链网络和钱包信息，底部显示聊天特定信息。组件支持根据聊天等级动态切换背景主题色。

## 架构

### 组件层次结构

```
ChatNavigationBar (主容器)
├── TopSection (顶部区域)
│   ├── ChainSelector (链选择器)
│   ├── WalletConnectButton (钱包连接按钮)
│   └── RegionSelector (地区选择器)
└── BottomSection (底部区域)
    ├── BackButton (返回按钮 + 成员数)
    ├── ChatInfo (聊天信息)
    │   ├── ChatAvatar (头像/图标)
    │   ├── ChatTitle (名称 + 等级徽章)
    │   └── WalletAddress (钱包地址)
    └── MenuButton (菜单按钮)
```

### 技术栈

- **框架**: Next.js 15 + React 19 + TypeScript 5.7
- **样式**: Tailwind CSS 3.4 + class-variance-authority (CVA)
- **UI 组件**: shadcn/ui + Radix UI（无障碍基础组件）
- **图标**: Lucide React
- **状态管理**: React hooks (useState, useCallback, useMemo)

## 组件和接口

### 1. ChatNavigationBar (主组件)

**文件位置**: `components/chat/chat-navigation-bar.tsx`

**Props 接口**:

```typescript
interface ChatNavigationBarProps {
  // 聊天类型
  mode: 'group' | 'private';

  // 聊天信息
  chatInfo: {
    name: string; // 可配置的名称（群组名或用户名）
    avatar?: string; // 头像图片路径
    level?: 1 | 2 | 3 | 4 | 5 | 6; // 等级（仅群聊）
    address: string; // 钱包地址
    memberCount?: number; // 成员数量（仅群聊）
  };

  // 顶部区域配置（完全可配置，可选）
  topSection?: {
    chainName?: string; // 链名称，如 "BNB Chain"
    regionCode?: string; // 地区代码，如 "USA"
    regionFlag?: string; // 地区国旗图片路径，如 "/top/usa.png"
    showWalletButton?: boolean; // 是否显示钱包连接按钮，默认 true
  };

  // 回调函数
  onBack?: () => void;
  onWalletConnect?: () => void;
  onMenuClick?: () => void;
  onAddressCopy?: (address: string) => void;

  // 可选样式
  className?: string;
}
```

**主要功能**:

- 根据 `mode` 渲染不同的布局（群聊显示等级，私聊不显示）
- 根据 `level` 应用对应的背景主题到底部区域
- 顶部区域始终保持白色背景（与 top-navbar.tsx 一致）
- 处理用户交互并触发回调
- 支持完全可配置的顶部和底部内容

### 2. TopSection (顶部区域子组件)

**Props 接口**:

```typescript
interface TopSectionProps {
  chainName: string;
  regionCode: string;
  regionFlag?: string;
  showWalletButton?: boolean;
  onWalletConnect?: () => void;
}
```

**布局**:

- 左侧: 链名称标签（白色背景，圆角，边框样式）
- 中间: 钱包连接按钮（使用 `<appkit-button />` 或自定义按钮）
- 右侧: 地区标签（白色背景，圆角，国旗图标 + 代码文本）

**样式参考** (基于 `top-navbar.tsx`):

```typescript
// 链名称标签样式
className =
  'px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl font-medium';

// 地区标签样式
className =
  'flex items-center px-2 py-0 text-xs border h-9 border-gray-200 rounded-xl';

// 国旗图标容器
className =
  'inline-block align-middle mr-3 w-4 h-4 rounded-full overflow-hidden';
```

### 3. BottomSection (底部区域子组件)

**Props 接口**:

```typescript
interface BottomSectionProps {
  mode: 'group' | 'private';
  chatInfo: {
    name: string;
    avatar?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    address: string;
    memberCount?: number;
  };
  levelTheme: LevelTheme;
  onBack?: () => void;
  onMenuClick?: () => void;
  onAddressCopy?: (address: string) => void;
}
```

**布局**:

- 左侧: 返回按钮（带成员数圆形徽章）
- 中间: 聊天信息（头像、**可配置的名称**、等级、地址）
  - 名称支持自定义文本，可以是群组名、用户名或任何标题
  - 名称过长时自动截断并显示省略号
- 右侧: 三点菜单按钮

## 数据模型

### 等级主题配置

```typescript
type LevelTheme = {
  background: string; // 背景渐变色
  textColor: string; // 文本颜色
  badgeColor: string; // 徽章颜色
  opacity: string; // 透明度
};

const LEVEL_THEMES: Record<number, LevelTheme> = {
  1: {
    background: 'from-blue-100 to-blue-200',
    textColor: 'text-blue-900',
    badgeColor: 'bg-blue-500',
    opacity: 'bg-opacity-90'
  },
  2: {
    background: 'from-blue-500 to-blue-600',
    textColor: 'text-white',
    badgeColor: 'bg-blue-700',
    opacity: 'bg-opacity-95'
  },
  3: {
    background: 'from-purple-500 to-purple-600',
    textColor: 'text-white',
    badgeColor: 'bg-purple-700',
    opacity: 'bg-opacity-95'
  },
  4: {
    background: 'from-yellow-400 to-yellow-500',
    textColor: 'text-yellow-900',
    badgeColor: 'bg-yellow-600',
    opacity: 'bg-opacity-95'
  },
  5: {
    background: 'from-red-600 to-red-700',
    textColor: 'text-white',
    badgeColor: 'bg-red-800',
    opacity: 'bg-opacity-95'
  },
  6: {
    background: 'from-gray-900 to-black',
    textColor: 'text-white',
    badgeColor: 'bg-gray-700',
    opacity: 'bg-opacity-100'
  }
};
```

### 地址格式化工具

```typescript
function formatAddress(
  address: string,
  startLength = 6,
  endLength = 4
): string {
  if (!address || address.length <= startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}
```

## 样式设计

### 响应式布局

- **移动端优先**: 默认适配移动端屏幕（375px - 428px）
- **固定高度**:
  - 顶部区域: 约 56px（py-4 + 内容高度）
  - 底部区域: 约 72px
  - 总高度: 约 128px
- **内边距**:
  - 顶部区域: `py-4 px-4`（与 top-navbar.tsx 保持一致）
  - 底部区域: `py-3 px-4`
- **安全区域**: 支持 iOS 刘海屏的 safe-area-inset
- **背景**: 顶部区域使用白色背景 `bg-white`，底部区域使用等级主题色

### 主题色系统

使用 Tailwind CSS 的渐变背景类实现不同等级的主题：

```css
/* LV1 - 浅蓝色 */
.level-1 {
  @apply bg-gradient-to-r from-blue-100 to-blue-200;
}

/* LV2 - 蓝色 */
.level-2 {
  @apply bg-gradient-to-r from-blue-500 to-blue-600;
}

/* LV3 - 紫色 */
.level-3 {
  @apply bg-gradient-to-r from-purple-500 to-purple-600;
}

/* LV4 - 黄色 */
.level-4 {
  @apply bg-gradient-to-r from-yellow-400 to-yellow-500;
}

/* LV5 - 红色 */
.level-5 {
  @apply bg-gradient-to-r from-red-600 to-red-700;
}

/* LV6 - 黑色 */
.level-6 {
  @apply bg-gradient-to-r from-gray-900 to-black;
}
```

### 交互状态

- **按钮悬停**: 轻微的透明度变化（hover:opacity-80）
- **按钮点击**: 缩放效果（active:scale-95）
- **触摸目标**: 最小 44x44px
- **过渡动画**: transition-all duration-200

## 错误处理

### 1. 缺失数据处理

```typescript
// 默认值配置
const DEFAULT_CHAIN = 'BNB Chain';
const DEFAULT_REGION = 'USA';
const DEFAULT_LEVEL = 1;
const DEFAULT_AVATAR = '/placeholder-user.jpg';

// 使用默认值
const chainName = topSection?.chainName || DEFAULT_CHAIN;
const level = chatInfo.level || DEFAULT_LEVEL;
```

### 2. 回调函数安全调用

```typescript
const handleBack = useCallback(() => {
  onBack?.();
}, [onBack]);

const handleAddressCopy = useCallback(async () => {
  try {
    await navigator.clipboard.writeText(chatInfo.address);
    onAddressCopy?.(chatInfo.address);
    // 显示成功提示
  } catch (error) {
    console.error('复制地址失败:', error);
    // 显示错误提示
  }
}, [chatInfo.address, onAddressCopy]);
```

### 3. 图片加载失败

```typescript
const [avatarError, setAvatarError] = useState(false);

<Image
  src={avatarError ? DEFAULT_AVATAR : chatInfo.avatar}
  alt={chatInfo.name}
  onError={() => setAvatarError(true)}
  width={40}
  height={40}
/>
```

## 测试策略

### 单元测试

使用 Jest + React Testing Library 测试：

1. **组件渲染测试**
   - 验证群聊模式正确渲染
   - 验证私聊模式正确渲染
   - 验证不同等级的主题应用

2. **交互测试**
   - 点击返回按钮触发回调
   - 点击钱包连接触发回调
   - 点击菜单按钮触发回调
   - 点击地址复制到剪贴板

3. **边界情况测试**
   - 缺失可选 props 时使用默认值
   - 超长地址正确截断
   - 图片加载失败显示占位符

### 集成测试

1. **与现有组件集成**
   - 在聊天页面中正确显示
   - 与 AppKitProvider 钱包连接集成
   - 与路由导航集成

2. **响应式测试**
   - 不同屏幕尺寸下的布局
   - 横屏和竖屏切换
   - iOS 安全区域适配

### 视觉回归测试

使用 Storybook 创建不同状态的故事：

```typescript
export const GroupChatLV1: Story = {
  args: {
    mode: 'group',
    chatInfo: {
      name: 'BNB 比特鱼鱼 LV1',
      level: 1,
      address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
      memberCount: 234
    }
  }
};

export const PrivateChat: Story = {
  args: {
    mode: 'private',
    chatInfo: {
      name: '长长的名字长长的名字长长的名字',
      address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab'
    }
  }
};
```

## 性能优化

### 1. 组件优化

```typescript
// 使用 React.memo 避免不必要的重渲染
export const ChatNavigationBar = React.memo<ChatNavigationBarProps>(
  ({ mode, chatInfo, ...props }) => {
    // 组件实现
  }
);

// 使用 useMemo 缓存计算结果
const levelTheme = useMemo(
  () => LEVEL_THEMES[chatInfo.level || 1],
  [chatInfo.level]
);

// 使用 useCallback 缓存回调函数
const handleBack = useCallback(() => {
  onBack?.();
}, [onBack]);
```

### 2. 图片优化

```typescript
// 使用 Next.js Image 组件自动优化
import Image from 'next/image';

<Image
  src={chatInfo.avatar}
  alt={chatInfo.name}
  width={40}
  height={40}
  priority={false}
  loading="lazy"
/>
```

### 3. CSS 优化

- 使用 Tailwind 的 JIT 模式减少 CSS 体积
- 避免内联样式，使用类名
- 使用 CSS 变量实现主题切换

## 可访问性

### ARIA 属性

```typescript
<button
  aria-label="返回聊天列表"
  onClick={handleBack}
>
  <ChevronLeft />
</button>

<button
  aria-label={`复制地址 ${chatInfo.address}`}
  onClick={handleAddressCopy}
>
  {formatAddress(chatInfo.address)}
</button>
```

### 键盘导航

- 所有交互元素支持 Tab 键导航
- 支持 Enter 和 Space 键触发按钮
- 焦点状态清晰可见

### 颜色对比度

- 确保文本与背景的对比度符合 WCAG AA 标准（至少 4.5:1）
- 深色背景使用白色文本
- 浅色背景使用深色文本

## 设计要点总结

### 顶部区域设计

- **背景**: 白色 `bg-white`
- **布局**: 水平排列，使用 `flex items-center justify-between`
- **内边距**: `py-4 px-4`（与现有 top-navbar.tsx 保持一致）
- **元素样式**:
  - 链名称标签: 白色背景、灰色边框、圆角 `rounded-xl`
  - 钱包按钮: 使用 `<appkit-button />` 组件
  - 地区标签: 白色背景、灰色边框、圆角 `rounded-xl`、包含国旗图标

### 底部区域设计

- **背景**: 根据等级应用渐变主题色
- **布局**: 水平排列，左中右三部分
- **内边距**: `py-3 px-4`
- **元素**:
  - 左侧: 返回按钮 + 成员数徽章
  - 中间: 头像 + 名称（可配置）+ 等级徽章 + 地址
  - 右侧: 三点菜单按钮

### 关键特性

1. **完全可配置**: 所有文本、图标、按钮都可通过 props 配置
2. **样式一致性**: 顶部区域样式与现有 top-navbar.tsx 保持一致
3. **响应式**: 适配移动端屏幕，支持安全区域
4. **主题系统**: 6 个等级对应 6 种渐变背景色
5. **交互友好**: 所有按钮有悬停和点击效果

## 依赖项

项目已有的依赖（无需额外安装）:

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "next": "^15.0.0",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "@radix-ui/react-slot": "latest"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

**注意**: 所有依赖项已在项目中存在，无需额外安装。

## 使用示例

### 群聊模式（完全可配置）

```typescript
<ChatNavigationBar
  mode="group"
  chatInfo={{
    name: 'BNB 比特鱼鱼 LV1',  // 可配置的群组名称
    level: 1,
    address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
    memberCount: 234,
    avatar: '/group-avatar.png'
  }}
  topSection={{
    chainName: 'BNB Chain',      // 可配置的链名称
    regionCode: 'USA',           // 可配置的地区代码
    regionFlag: '/top/usa.png',  // 可配置的国旗图片
    showWalletButton: true       // 可配置是否显示钱包按钮
  }}
  onBack={() => router.back()}
  onWalletConnect={() => openWalletModal()}
  onMenuClick={() => setShowMenu(true)}
  onAddressCopy={(addr) => toast.success('地址已复制')}
/>
```

### 私聊模式（可配置名称）

```typescript
<ChatNavigationBar
  mode="private"
  chatInfo={{
    name: '长长的名字长长的名字',  // 可配置的用户名称
    address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
    avatar: '/user-avatar.png'
  }}
  topSection={{
    chainName: 'Ethereum',       // 私聊也可以配置不同的链
    regionCode: 'CHN',
    regionFlag: '/top/china.png'
  }}
  onBack={() => router.back()}
  onMenuClick={() => setShowSettings(true)}
/>
```

### 自定义配置示例

```typescript
// 示例 1: 不显示钱包按钮
<ChatNavigationBar
  mode="group"
  chatInfo={{
    name: '自定义群组名称',  // 完全可配置
    level: 3,
    address: '0x...',
    memberCount: 100
  }}
  topSection={{
    chainName: 'Polygon',
    regionCode: 'JPN',
    showWalletButton: false  // 隐藏钱包按钮
  }}
/>

// 示例 2: 最小化配置
<ChatNavigationBar
  mode="private"
  chatInfo={{
    name: '张三',  // 简单的名称配置
    address: '0x...'
  }}
/>
```
