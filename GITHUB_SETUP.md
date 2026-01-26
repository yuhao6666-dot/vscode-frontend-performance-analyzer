# GitHub 仓库设置指南

## ✅ 已完成的步骤

1. ✅ 创建了 .gitignore 文件
2. ✅ 初始化了 Git 仓库
3. ✅ 添加了所有文件
4. ✅ 创建了初始提交

## 📋 接下来的步骤

### 步骤 1: 在 GitHub 上创建仓库

1. 打开浏览器，访问 [https://github.com/new](https://github.com/new)
2. 填写仓库信息：
   - **Repository name**: `vscode-frontend-performance-analyzer`
   - **Description**: `实时分析前端代码性能问题，集成 AI 智能深度分析，支持 Web Vitals 监控`
   - **Public** 或 **Private**: 选择 Public（如果要发布到 VSCode Marketplace 建议选 Public）
   - ⚠️ **不要**勾选 "Add a README file"
   - ⚠️ **不要**勾选 "Add .gitignore"
   - ⚠️ **不要**勾选 "Choose a license"（我们已经有了）
3. 点击 "Create repository" 按钮

### 步骤 2: 推送到 GitHub

创建仓库后，GitHub 会显示一个页面。请复制您的仓库 URL，然后在终端中运行：

```bash
cd /Users/yuhao/Desktop/vscode-frontend-performance-analyzer

# 添加远程仓库（替换 yourusername 为您的 GitHub 用户名）
git remote add origin https://github.com/yourusername/vscode-frontend-performance-analyzer.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步骤 3: 更新 package.json

推送成功后，更新 package.json 中的仓库地址：

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/vscode-frontend-performance-analyzer"
  },
  "bugs": {
    "url": "https://github.com/yourusername/vscode-frontend-performance-analyzer/issues"
  },
  "homepage": "https://github.com/yourusername/vscode-frontend-performance-analyzer#readme"
}
```

然后提交更新：

```bash
git add package.json
git commit -m "Update repository URLs"
git push
```

## 🎉 完成！

您的代码现在已经在 GitHub 上了！

**下一步**：
- 查看 [PUBLISH_GUIDE.md](PUBLISH_GUIDE.md) 了解如何发布到 VSCode Marketplace
- 添加 README 徽章展示插件状态
- 设置 GitHub Actions 进行自动化测试（可选）

## 💡 有用的 Git 命令

```bash
# 查看仓库状态
git status

# 查看提交历史
git log --oneline

# 查看远程仓库
git remote -v

# 拉取最新代码
git pull

# 推送更新
git push
```

## 🔧 如果出错

### 问题：远程仓库已存在
如果您之前添加过远程仓库，可以先删除：
```bash
git remote remove origin
git remote add origin https://github.com/yourusername/vscode-frontend-performance-analyzer.git
```

### 问题：推送被拒绝
如果推送被拒绝，可能是因为远程仓库有文件：
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### 问题：需要身份验证
GitHub 现在要求使用 Personal Access Token (PAT) 而不是密码：
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 选择权限：repo（完整权限）
4. 生成并复制 token
5. 推送时使用 token 作为密码
