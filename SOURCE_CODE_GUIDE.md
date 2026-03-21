# 工时统计应用 - 完整源码获取指南

## 方案一：获取完整源码包（推荐）

### 1. 源码包信息
- 文件名：`workhours-full-source.tar.gz`
- 大小：4.0 MB
- 位置：`/workspace/projects/workhours-full-source.tar.gz`

### 2. 包含的内容
- ✅ `client/` - Expo 前端项目（React Native）
- ✅ `server/` - Express 后端项目
- ✅ Supabase 数据库配置
- ✅ 所有必要的依赖和配置文件

### 3. 如何获取

#### 如果您可以访问 Coze 环境：
通过 Coze 平台的文件管理功能，下载 `workhours-full-source.tar.gz` 文件

#### 如果您无法直接访问：
请联系 Coze 平台客服，请求下载工作空间中的文件

---

## 方案二：手动创建项目结构

如果您无法获取压缩包，可以按照以下结构手动创建项目：

```
workhours-app/
├── client/                          # Expo 前端
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx          # Tab 导航配置
│   │   │   ├── index.tsx            # 首页
│   │   │   ├── projects.tsx         # 项目管理
│   │   │   ├── workers.tsx          # 人员管理
│   │   │   └── stats.tsx            # 统计页面
│   │   ├── _layout.tsx              # 根布局
│   │   └── +not-found.tsx           # 404 页面
│   ├── assets/                      # 静态资源
│   ├── components/                  # 公共组件
│   │   ├── Screen.tsx
│   │   ├── ThemedText.tsx
│   │   └── ThemedView.tsx
│   ├── constants/                   # 常量定义
│   │   └── theme.ts                 # 主题配置
│   ├── contexts/                    # React Context
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── useTheme.ts
│   │   └── useSafeRouter.ts
│   ├── screens/                     # 页面组件
│   │   ├── home/
│   │   ├── projects/
│   │   ├── workers/
│   │   └── stats/
│   ├── services/                    # API 服务
│   ├── app.config.ts                # Expo 配置
│   ├── app.json                     # App 配置
│   ├── eas.json                     # EAS Build 配置
│   ├── package.json
│   └── tsconfig.json
├── server/                          # Express 后端
│   ├── src/
│   │   ├── routes/                  # 路由
│   │   │   ├── projects.ts
│   │   │   ├── workers.ts
│   │   │   ├── work-logs.ts
│   │   │   └── stats.ts
│   │   └── index.ts                 # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── assets/                          # 项目资源
├── .npmrc
├── package.json
└── pnpm-workspace.yaml
```

---

## 方案三：从 GitHub 下载（推荐用于开发）

如果我们可以成功推送到 GitHub，您可以通过以下步骤获取源码：

### 1. 访问仓库
```
https://github.com/yazi8929/workhours-app
```

### 2. 下载 ZIP
点击页面右上角的 "Code" 按钮，选择 "Download ZIP"

### 3. 解压并使用

---

## 本地运行项目

### 前提条件
- Node.js 18+
- pnpm 或 npm
- Expo Go App（用于测试）

### 前端运行（Expo）
```bash
cd client
npx expo install
npx expo start
```

### 后端运行（Express）
```bash
cd server
pnpm install
pnpm run dev
```

### 使用 Expo Go 测试
1. 在手机上安装 "Expo Go" App
2. 扫描终端显示的二维码
3. 即可在手机上查看完整功能

---

## 构建 APK（完整功能版）

### 方案一：使用 EAS Build
```bash
cd client
npx expo install --fix
npx eas build --platform android
```

### 方案二：使用 Expo Prebuild
```bash
cd client
npx expo prebuild
cd android
./gradlew assembleRelease
```

### 注意事项
- 需要 Expo 账号
- 需要配置 Supabase 环境变量
- 首次构建可能需要 10-15 分钟

---

## 环境变量配置

### 前端（client/app.config.ts）
```typescript
export default {
  expo: {
    extra: {
      EXPO_PUBLIC_BACKEND_BASE_URL: 'YOUR_BACKEND_URL',
      EXPO_PUBLIC_SUPABASE_URL: 'YOUR_SUPABASE_URL',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    },
  },
};
```

### 后端（.env）
```bash
EXPO_PUBLIC_BACKEND_BASE_URL=http://localhost:9091
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

---

## 核心功能说明

### 1. 项目管理
- 创建、编辑、删除项目
- 查看项目详情

### 2. 人员管理
- 添加、编辑、删除人员
- 管理人员信息

### 3. 工时记录
- 选择项目、日期
- 多选人员
- 支持半天工时（0.5天）

### 4. 统计报表
- 月度统计
- 项目人员明细
- 一键复制数据

### 5. 数据存储
- 使用 Supabase PostgreSQL
- 主从表结构设计
- 支持多人员工时记录

---

## 技术栈

### 前端
- Expo 54
- React Native
- Expo Router (文件路由)
- React Navigation
- Supabase SDK

### 后端
- Express.js
- TypeScript
- Supabase SDK
- CORS

### 数据库
- Supabase (PostgreSQL)

---

## 常见问题

### Q: 如何获取 Supabase 凭证？
A: 注册 Supabase 账号，创建项目后获取 URL 和 Anon Key

### Q: 构建 APK 需要多久？
A: 首次构建 10-15 分钟，后续 5-10 分钟

### Q: 可以在没有后端的情况下使用吗？
A: 不可以，应用需要后端 API 和数据库支持

### Q: 如何修改应用名称和图标？
A: 编辑 `client/app.config.ts` 中的 `name` 和 `icon` 字段

---

## 联系支持

如果您在获取源码或构建过程中遇到问题，请联系技术支持。

---

**最后更新：2026-03-02**
