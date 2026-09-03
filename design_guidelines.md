# 家族族谱修谱软件 - 设计指南

## 品牌定位

- **应用定位**：家族族谱修缮管理工具
- **设计风格**：传统庄重 + 温暖亲和，中式文化底蕴
- **目标用户**：需要修缮族谱的家庭用户，年龄覆盖 25-65 岁

## 配色方案

| 用途 | Tailwind 类名 | 说明 |
|------|--------------|------|
| 主色 | `bg-red-900` / `text-red-900` | 深朱红，家族印记 |
| 辅助色 | `bg-yellow-700` / `text-yellow-700` | 暗金色，古籍装帧 |
| 页面背景 | `bg-stone-50` | 暖米白，宣纸底色 |
| 卡片背景 | `bg-amber-50` | 象牙白 |
| 正文色 | `text-stone-800` | 墨色 |
| 辅助文字 | `text-stone-500` | 灰褐色 |
| 分隔线 | `border-stone-300` | 淡褐色 |

## 字体规范

- 标题使用 `font-serif`（衬线体），体现传统文化
- 正文使用默认无衬线体，保证可读性
- 页面标题：`text-2xl font-serif font-bold text-stone-800`
- 卡片标题：`text-lg font-serif font-semibold text-stone-800`
- 辅助文字：`text-sm text-stone-500`

## 间距系统

- 页面边距：`px-4`（左右）
- 卡片内边距：`p-4` 或 `p-5`
- 卡片间距：`gap-4` 或 `space-y-4`
- 组件间距：`gap-3`

## 组件使用原则

- 通用 UI 组件（按钮、输入框、弹窗、卡片、Tabs、Toast 等）优先使用 `@/components/ui/*`
- 新页面开发前先拆分 UI 单元，映射到组件库
- 禁止用 View/Text 手搓通用组件

## 导航结构

TabBar 导航（4 个页面）：
1. **族谱**（首页）- 族谱树形展示 + 家族概览
2. **成员** - 成员列表管理
3. **家族** - 家族信息编辑
4. **我的** - 设置与关于

## 容器样式

- 卡片：`bg-amber-50 rounded-xl border border-stone-200 shadow-sm`
- 页面容器：`bg-stone-50 min-h-screen`
- 分组标题：`text-lg font-serif font-semibold text-stone-800 mb-3`

## 状态展示

- **空状态**：使用图标 + 文字提示，引导用户添加内容
- **加载态**：使用 Skeleton 骨架屏
- **操作反馈**：使用 Sonner 轻提示
