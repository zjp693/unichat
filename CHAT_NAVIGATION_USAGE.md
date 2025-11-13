# 聊天导航栏组件使用说明

## 概述

`ChatNavigationBar` 是一个可复用的聊天导航栏组件，支持群聊和私聊两种模式，具有 6 个等级的渐变背景主题。

## 功能特性

- ✅ **双模式支持**：群聊和私聊
- ✅ **等级主题**：6 个等级对应 6 种渐变背景色
- ✅ **完全可配置**：所有文本、图标、按钮都可通过 props 配置
- ✅ **交互功能**：地址复制、返回、菜单等
- ✅ **响应式设计**：适配移动端，支持触摸交互
- ✅ **样式一致性**：顶部区域与现有 top-navbar.tsx 保持一致

## 安装

组件已创建在 `components/chat/chat-navigation-bar.tsx`，无需额外安装依赖。

## 基本用法

### 群聊模式

```tsx
import { ChatNavigationBar } from '@/components/chat/chat-navigation-bar';

<ChatNavigationBar
  mode="group"
  chatInfo={{
    name: 'BNB 比特鱼鱼 LV1',
    level: 1,
    address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
    memberCount: 234,
    avatar: '/group-avatar.png'
  }}
  topSection={{
    chainName: 'BNB Chain',
    regionCode: 'USA',
    regionFlag: '/top/usa.png',
    showWalletButton: true
  }}
  onBack={() => router.back()}
  onWalletConnect={() => openWalletModal()}
  onMenuClick={() => setShowMenu(true)}
  onAddressCopy={(addr) => console.log('地址已复制:', addr)}
/>;
```

### 私聊模式

```tsx
<ChatNavigationBar
  mode="private"
  chatInfo={{
    name: '张三',
    address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
    avatar: '/user-avatar.png'
  }}
  topSection={{
    chainName: 'BNB Chain',
    regionCode: 'USA',
    regionFlag: '/top/usa.png'
  }}
  onBack={() => router.back()}
  onMenuClick={() => setShowSettings(true)}
  onAddressCopy={(addr) => toast.success('地址已复制')}
/>
```

## Props 说明

### ChatNavigationBarProps

| 属性              | 类型                        | 必填 | 说明           |
| ----------------- | --------------------------- | ---- | -------------- |
| `mode`            | `'group' \| 'private'`      | ✅   | 聊天模式       |
| `chatInfo`        | `ChatInfo`                  | ✅   | 聊天信息对象   |
| `topSection`      | `TopSection`                | ❌   | 顶部区域配置   |
| `onBack`          | `() => void`                | ❌   | 返回按钮回调   |
| `onWalletConnect` | `() => void`                | ❌   | 钱包连接回调   |
| `onMenuClick`     | `() => void`                | ❌   | 菜单按钮回调   |
| `onAddressCopy`   | `(address: string) => void` | ❌   | 地址复制回调   |
| `className`       | `string`                    | ❌   | 自定义样式类名 |

### ChatInfo 对象

| 属性          | 类型                         | 必填 | 说明                       |
| ------------- | ---------------------------- | ---- | -------------------------- |
| `name`        | `string`                     | ✅   | 聊天名称（群组名或用户名） |
| `address`     | `string`                     | ✅   | 钱包地址                   |
| `avatar`      | `string`                     | ❌   | 头像图片路径               |
| `level`       | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | ❌   | 等级（仅群聊）             |
| `memberCount` | `number`                     | ❌   | 成员数量（仅群聊）         |

### TopSection 对象

| 属性               | 类型      | 必填 | 默认值        | 说明             |
| ------------------ | --------- | ---- | ------------- | ---------------- |
| `chainName`        | `string`  | ❌   | `'BNB Chain'` | 链名称           |
| `regionCode`       | `string`  | ❌   | `'USA'`       | 地区代码         |
| `regionFlag`       | `string`  | ❌   | -             | 国旗图片路径     |
| `showWalletButton` | `boolean` | ❌   | `true`        | 是否显示钱包按钮 |

## 等级主题

组件支持 6 个等级，每个等级对应不同的渐变背景色：

| 等级 | 背景色 | 文本颜色 | 适用场景 |
| ---- | ------ | -------- | -------- |
| LV1  | 浅蓝色 | 深蓝色   | 新手群组 |
| LV2  | 蓝色   | 白色     | 普通群组 |
| LV3  | 紫色   | 白色     | 活跃群组 |
| LV4  | 黄色   | 深黄色   | 高级群组 |
| LV5  | 红色   | 白色     | 精英群组 |
| LV6  | 黑色   | 白色     | 顶级群组 |

## 高级用法

### 隐藏钱包按钮

```tsx
<ChatNavigationBar
  mode="private"
  chatInfo={{
    name: '李四',
    address: '0x...'
  }}
  topSection={{
    showWalletButton: false // 隐藏钱包按钮
  }}
/>
```

### 自定义链和地区

```tsx
<ChatNavigationBar
  mode="group"
  chatInfo={{
    name: '以太坊社区',
    level: 3,
    address: '0x...',
    memberCount: 500
  }}
  topSection={{
    chainName: 'Ethereum',
    regionCode: 'CHN',
    regionFlag: '/flags/china.png'
  }}
/>
```

### 最小化配置

```tsx
<ChatNavigationBar
  mode="private"
  chatInfo={{
    name: '王五',
    address: '0x...'
  }}
/>
```

## 在聊天页面中使用

已集成到 `app/(dashboard)/chat/[id]/page.tsx`：

```tsx
<ChatNavigationBar
  mode={chatType} // 从 URL 参数获取
  chatInfo={{
    name:
      chatType === 'private'
        ? `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
        : '我的群聊',
    address: chatType === 'private' ? recipientAddress : conversationId,
    level: chatType === 'group' ? 1 : undefined,
    memberCount: chatType === 'group' ? memberCount : undefined,
    avatar: '/placeholder-user.jpg'
  }}
  topSection={{
    chainName: 'BNB Chain',
    regionCode: 'USA',
    regionFlag: '/top/usa.png',
    showWalletButton: true
  }}
  onBack={() => router.back()}
  onMenuClick={() => {
    if (chatType === 'group') {
      setShowGroupInfoPanel(true);
    } else {
      setShowPrivateChatSettingsPanel(true);
    }
  }}
  onAddressCopy={(address) => {
    console.log('地址已复制:', address);
  }}
/>
```

## 演示页面

访问 `/chat-demo` 查看所有等级和模式的演示效果。

## 注意事项

1. **地址格式**：组件会自动格式化长地址为 `0x052c...59ab` 格式
2. **头像加载**：如果头像加载失败，会自动显示占位符
3. **响应式**：组件已针对移动端优化，触摸目标至少 44x44px
4. **可访问性**：所有按钮都有 ARIA 标签，支持键盘导航
5. **性能**：使用 React.memo、useMemo、useCallback 优化性能

## 故障排除

### 问题：钱包按钮不显示

**解决方案**：确保 `topSection.showWalletButton` 设置为 `true`（默认值）

### 问题：地址复制不工作

**解决方案**：检查浏览器是否支持 `navigator.clipboard` API，需要 HTTPS 环境

### 问题：等级徽章不显示

**解决方案**：确保 `mode` 设置为 `'group'` 且 `chatInfo.level` 有值

## 更新日志

### v1.0.0 (2024-01-XX)

- ✅ 初始版本发布
- ✅ 支持群聊和私聊模式
- ✅ 6 个等级主题
- ✅ 完全可配置
- ✅ 集成到聊天页面

## 相关文件

- 组件源码：`components/chat/chat-navigation-bar.tsx`
- 演示页面：`app/chat-demo/page.tsx`
- 聊天页面：`app/(dashboard)/chat/[id]/page.tsx`
- 需求文档：`.kiro/specs/chat-navigation-bar/requirements.md`
- 设计文档：`.kiro/specs/chat-navigation-bar/design.md`
- 任务列表：`.kiro/specs/chat-navigation-bar/tasks.md`
