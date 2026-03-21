# 本地存储版本使用指南

## 📦 文件信息

- 文件名：`workhours-local-storage.tar.gz`
- 大小：3.6 MB
- 包含：完整的客户端代码（使用本地存储）

---

## ✅ 特点

### 优点
- ✅ **不需要后端服务器**
- ✅ **不需要数据库**
- ✅ **所有功能都可以使用**
- ✅ **数据保存在手机本地**
- ✅ **离线也能使用**

### 限制
- ❌ 只能在单台手机使用
- ❌ 换手机数据不共享
- ❌ 卸载 App 数据会丢失

---

## 🚀 使用步骤

### 步骤 1：上传到 GitHub

1. 解压 `workhours-local-storage.tar.gz`
2. 打开您的 GitHub 仓库
3. 点击 **"Add file"** → **"Upload files"**
4. 上传 `client` 文件夹

### 步骤 2：更新 GitHub Actions 配置

如果之前已经配置过，不需要修改。

如果还没配置，创建 `.github/workflows/build.yml` 文件：

```yaml
name: Build Expo APK
on:
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Install root dependencies
        run: pnpm install
      - name: Install server dependencies
        run: |
          cd server
          pnpm install
      - name: Install client dependencies
        run: |
          cd client
          npm install --legacy-peer-deps
      - name: Build Expo APK
        run: |
          cd client
          npx expo prebuild --platform android --clean
          cd android
          chmod +x gradlew
          ./gradlew assembleRelease
      - name: Find APK
        run: find client/android/app/build/outputs/apk/release -name "*.apk" -type f
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: workhours-app-release
          path: client/android/app/build/outputs/apk/release/*.apk
          if-no-files-found: error
          retention-days: 30
```

### 步骤 3：触发构建

1. 访问：`https://github.com/您的用户名/workhours-app/actions`
2. 点击 **"Build Expo APK"**
3. 点击 **"Run workflow"**
4. 等待 5-10 分钟

### 步骤 4：下载 APK

1. 构建完成后，点击最新的构建记录
2. 滚动到底部的 **"Artifacts"**
3. 点击 **"workhours-app-release"**
4. 下载 APK 文件

### 步骤 5：安装使用

1. 在手机上安装 APK
2. 打开应用
3. 开始使用！

---

## 📱 功能说明

### 首页（工时记录）
- 选择项目
- 选择日期
- 选择人员（支持多选）
- 设置工时（0.5天或1天）
- 填写工作内容
- 提交记录

### 项目管理
- 添加项目
- 编辑项目
- 删除项目
- 复制项目名称

### 人员管理
- 添加人员
- 编辑人员
- 删除人员
- 复制人员姓名

### 统计报表
- 按人员统计
- 按项目统计
- 切换月份
- 复制统计数据

---

## 🔧 技术说明

### 存储方式
使用 `@react-native-async-storage/async-storage` 存储数据：

- 项目数据：`workhours_projects`
- 人员数据：`workhours_workers`
- 工时记录：`workhours_worklogs`

### 代码修改
主要修改的文件：

1. **新增** `client/services/LocalStorage.ts`
   - 本地存储服务
   - 提供项目、人员、工时记录的 CRUD 操作

2. **修改** `client/screens/home/index.tsx`
   - 使用本地存储替代 API 调用

3. **修改** `client/screens/projects/index.tsx`
   - 使用本地存储替代 API 调用

4. **修改** `client/screens/workers/index.tsx`
   - 使用本地存储替代 API 调用

5. **修改** `client/screens/stats/index.tsx`
   - 使用本地存储计算统计数据

---

## 📊 数据结构

### Project（项目）
```typescript
{
  id: string;
  name: string;
  createdAt: string;
}
```

### Worker（人员）
```typescript
{
  id: string;
  name: string;
  createdAt: string;
}
```

### WorkLog（工时记录）
```typescript
{
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  description: string;
  workers: Array<{ id: string; hours: number }>;
  createdAt: string;
}
```

---

## ❓ 常见问题

### Q1: 数据会丢失吗？
A: 卸载 App 后数据会丢失，建议定期备份。

### Q2: 可以在多台手机使用吗？
A: 不可以，数据保存在手机本地。

### Q3: 如何备份数据？
A: 目前版本暂不支持自动备份，可以截图保存数据。

### Q4: 可以恢复数据吗？
A: 卸载重装后数据无法恢复。

---

## 💡 后续优化建议

如果您需要更完整的功能，可以考虑：

1. **添加数据导出功能**
   - 导出为 JSON 文件
   - 导出为 Excel 文件

2. **添加数据导入功能**
   - 从 JSON 文件恢复
   - 从 Excel 文件恢复

3. **添加云同步**
   - 集成 Firebase
   - 集成 Supabase

---

## 🎉 完成

现在您有一个**无需后端**的完整工时统计应用了！

所有功能都可以正常使用，数据保存在手机本地。

---

**最后更新：2026-03-03**
