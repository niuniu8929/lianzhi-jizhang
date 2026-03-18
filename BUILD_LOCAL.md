# 本地构建 APK 指南

## 前提条件

- Node.js 20+
- JDK 17
- Android Studio（安装 Android SDK）

## Windows 构建步骤

### 1. 安装依赖
```bash
cd client
npm install
```

### 2. 生成 Android 项目
```bash
npx expo prebuild --platform android --clean
```

### 3. 构建 APK
```bash
cd android
.\gradlew assembleRelease
```

### 4. 获取 APK
APK 位置：`android/app/build/outputs/apk/release/app-release.apk`

---

## Mac 构建步骤

### 1. 安装依赖
```bash
cd client
npm install
```

### 2. 生成 Android 项目
```bash
npx expo prebuild --platform android --clean
```

### 3. 构建 APK
```bash
cd android
chmod +x gradlew
./gradlew assembleRelease
```

### 4. 获取 APK
APK 位置：`android/app/build/outputs/apk/release/app-release.apk`

---

## 常见问题

### JDK 版本不对
```bash
# 检查版本
java -version

# 需要是 17.x
```

### Android SDK 未找到
设置环境变量：
```bash
# Windows (PowerShell)
$env:ANDROID_HOME = "C:\Users\你的用户名\AppData\Local\Android\Sdk"

# Mac/Linux
export ANDROID_HOME=$HOME/Library/Android/sdk
```

### 内存不足
编辑 `android/gradle.properties`：
```
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g
```
