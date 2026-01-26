#!/bin/bash

echo "🚀 GitHub 仓库设置助手"
echo "================================"
echo ""

# 检查是否已有远程仓库
if git remote | grep -q "origin"; then
    echo "⚠️  检测到已存在的远程仓库:"
    git remote -v
    echo ""
    read -p "是否要删除并重新设置？(y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
        echo "✅ 已删除旧的远程仓库"
    else
        echo "❌ 取消操作"
        exit 1
    fi
fi

echo ""
echo "📝 请输入您的 GitHub 用户名:"
read -p "用户名: " github_username

if [ -z "$github_username" ]; then
    echo "❌ 用户名不能为空"
    exit 1
fi

repo_name="vscode-frontend-performance-analyzer"
repo_url="https://github.com/${github_username}/${repo_name}.git"

echo ""
echo "📦 将要设置的仓库:"
echo "   $repo_url"
echo ""
read -p "确认继续？(y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消操作"
    exit 1
fi

# 添加远程仓库
echo ""
echo "🔗 添加远程仓库..."
git remote add origin "$repo_url"

if [ $? -eq 0 ]; then
    echo "✅ 远程仓库添加成功"
else
    echo "❌ 添加远程仓库失败"
    exit 1
fi

# 设置主分支
echo ""
echo "🌿 设置主分支为 main..."
git branch -M main

# 推送到 GitHub
echo ""
echo "⬆️  推送到 GitHub..."
echo "   如果提示输入密码，请使用 Personal Access Token"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 成功推送到 GitHub!"
    echo ""
    echo "📍 您的仓库地址:"
    echo "   https://github.com/${github_username}/${repo_name}"
    echo ""
    echo "📝 下一步:"
    echo "   1. 更新 package.json 中的仓库 URL"
    echo "   2. 查看 PUBLISH_GUIDE.md 了解如何发布到 VSCode Marketplace"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "💡 常见问题:"
    echo "   1. 确保已在 GitHub 上创建仓库: https://github.com/new"
    echo "   2. 使用 Personal Access Token 而不是密码"
    echo "   3. 检查网络连接"
    echo ""
    echo "🔧 获取 Personal Access Token:"
    echo "   https://github.com/settings/tokens"
    exit 1
fi
