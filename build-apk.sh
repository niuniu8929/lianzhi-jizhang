#!/bin/bash

# 项目记账应用 - 快速构建脚本
# 用于构建Android APK

set -e

echo "======================================"
echo "  项目记账应用 - APK 构建工具"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Node.js版本
echo -e "${BLUE}检查环境...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}错误: Node.js版本需要18或更高，当前版本: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js版本: $(node -v)${NC}"

# 检查npm版本
echo -e "${GREEN}✓ npm版本: $(npm -v)${NC}"

# 进入项目目录
cd "$(dirname "$0")/client" || exit 1

# 检查依赖
echo ""
echo -e "${BLUE}检查项目依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}未检测到node_modules，正在安装依赖...${NC}"
    npm install
fi

# 检查eas-cli
echo ""
echo -e "${BLUE}检查EAS CLI...${NC}"
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}未安装EAS CLI，正在安装...${NC}"
    npm install -g eas-cli
fi

# 检查登录状态
echo ""
echo -e "${BLUE}检查Expo登录状态...${NC}"
if ! eas whoami &> /dev/null; then
    echo -e "${RED}未登录Expo账户${NC}"
    echo ""
    echo "请先登录Expo账户："
    echo "  eas login"
    echo ""
    echo "如果没有账号，请访问 https://expo.dev 注册"
    exit 1
fi

echo -e "${GREEN}✓ 已登录: $(eas whoami)${NC}"

# 显示构建选项
echo ""
echo "======================================"
echo "  选择构建模式"
echo "======================================"
echo "1) Preview（预览版，速度快，适合测试）"
echo "2) Production（生产版，完整优化，适合发布）"
echo ""
read -p "请选择 (1/2): " BUILD_MODE

if [ "$BUILD_MODE" = "1" ]; then
    PROFILE="preview"
    echo -e "${GREEN}选择: Preview 模式${NC}"
elif [ "$BUILD_MODE" = "2" ]; then
    PROFILE="production"
    echo -e "${GREEN}选择: Production 模式${NC}"
else
    echo -e "${RED}无效的选择${NC}"
    exit 1
fi

# 开始构建
echo ""
echo "======================================"
echo "  开始构建 APK"
echo "======================================"
echo -e "${YELLOW}构建模式: $PROFILE${NC}"
echo -e "${YELLOW}平台: Android${NC}"
echo -e "${YELLOW}构建类型: APK${NC}"
echo ""
echo "构建过程通常需要10-20分钟，请耐心等待..."
echo ""

eas build --platform android --profile "$PROFILE" --non-interactive

BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
    echo ""
    echo "======================================"
    echo -e "${GREEN}  构建成功！${NC}"
    echo "======================================"
    echo ""
    echo "请访问以下链接下载APK："
    echo "  https://expo.dev/accounts/[your-username]/projects/[project-id]/builds"
    echo ""
    echo "安装说明："
    echo "  1. 下载APK文件到手机"
    echo "  2. 在手机上点击APK文件"
    echo "  3. 允许安装未知来源应用"
    echo "  4. 点击安装"
    echo ""
else
    echo ""
    echo "======================================"
    echo -e "${RED}  构建失败${NC}"
    echo "======================================"
    echo ""
    echo "请检查错误信息并重试"
    echo ""
    echo "常见问题："
    echo "  - 确保已登录Expo账户（eas login）"
    echo "  - 确保网络连接正常"
    echo "  - 检查构建日志中的错误信息"
    echo ""
fi

exit $BUILD_RESULT
