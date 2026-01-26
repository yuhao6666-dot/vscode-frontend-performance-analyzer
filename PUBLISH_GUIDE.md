# VSCode 插件发布指南

## 📋 发布前准备清单

### 1. 完善 package.json（✅ 已完成大部分）

需要您手动更新以下字段：

```json
{
  "publisher": "YOUR_PUBLISHER_ID",  // ⚠️ 需要替换为您的发布者 ID
  "repository": {
    "url": "https://github.com/yourusername/vscode-frontend-performance-analyzer"  // ⚠️ 替换为您的 GitHub 仓库地址
  }
}
```

### 2. 创建插件图标（⚠️ 需要完成）

创建一个 128x128 像素的 PNG 图标，命名为 `icon.png`，放在项目根目录。

**推荐工具**：
- [Figma](https://www.figma.com/) - 在线设计工具
- [Canva](https://www.canva.com/) - 简单易用
- [GIMP](https://www.gimp.org/) - 免费图像编辑软件

**图标建议**：
- 尺寸：128x128 像素
- 格式：PNG
- 背景：透明或纯色
- 主题：可以包含性能相关的图标（如火箭🚀、图表📊、闪电⚡等）

**临时解决方案**（如果暂时没有图标）：
可以暂时移除 package.json 中的 `"icon": "icon.png",` 这一行。

### 3. 上传到 GitHub（⚠️ 需要完成）

```bash
# 初始化 git 仓库（如果还没有）
git init

# 添加 .gitignore
cat > .gitignore << 'GITIGNORE'
node_modules/
out/
*.vsix
.vscode-test/
.DS_Store
GITIGNORE

# 提交所有文件
git add .
git commit -m "Initial commit: Frontend Performance Analyzer v0.1.0"

# 在 GitHub 上创建仓库，然后推送
git remote add origin https://github.com/yourusername/vscode-frontend-performance-analyzer.git
git branch -M main
git push -u origin main
```

## 🚀 发布步骤

### 步骤 1: 注册成为 VSCode 发布者

1. 访问 [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. 使用 Microsoft 账号登录
3. 点击 "Create Publisher"
4. 填写发布者信息：
   - Publisher ID（唯一标识符，建议用小写字母和连字符）
   - Display Name
   - Description
5. 记住您的 Publisher ID，更新到 package.json 中

### 步骤 2: 创建 Personal Access Token (PAT)

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 点击右上角的用户设置 → Personal access tokens
3. 点击 "New Token"
4. 设置：
   - Name: vscode-marketplace（或任意名称）
   - Organization: All accessible organizations
   - Expiration: 自定义（建议 90 天或更长）
   - Scopes: 
     - ✅ Marketplace: **Manage**（最重要）
5. 点击 Create，**立即复制并保存 Token**（只显示一次！）

### 步骤 3: 安装 vsce 工具

```bash
# 全局安装 vsce（Visual Studio Code Extensions 工具）
npm install -g @vscode/vsce
```

### 步骤 4: 打包插件

```bash
# 编译 TypeScript
npm run compile

# 打包为 .vsix 文件
vsce package

# 成功后会生成：frontend-performance-analyzer-0.1.0.vsix
```

### 步骤 5: 发布到市场

**方式 1: 使用命令行发布（推荐）**

```bash
# 登录（使用之前创建的 PAT）
vsce login YOUR_PUBLISHER_ID
# 输入 Personal Access Token

# 发布
vsce publish

# 或者指定版本号发布
vsce publish patch  # 0.1.0 -> 0.1.1
vsce publish minor  # 0.1.0 -> 0.2.0
vsce publish major  # 0.1.0 -> 1.0.0
```

**方式 2: 通过网页上传（备选）**

1. 访问 [Marketplace Manage](https://marketplace.visualstudio.com/manage)
2. 点击您的发布者
3. 点击 "New Extension" → "Visual Studio Code"
4. 上传 `.vsix` 文件
5. 填写必要信息并提交

## 📝 发布后

### 验证发布

1. 等待几分钟（通常 5-10 分钟）
2. 访问 `https://marketplace.visualstudio.com/items?itemName=YOUR_PUBLISHER_ID.frontend-performance-analyzer`
3. 在 VSCode 中搜索 "Frontend Performance Analyzer"

### 更新插件

```bash
# 修改代码后
npm run compile

# 更新版本并发布
vsce publish patch  # 小更新
vsce publish minor  # 功能更新
vsce publish major  # 重大更新
```

## 🔍 常见问题

### Q1: 发布失败：未找到 Publisher
**A:** 确保 package.json 中的 `publisher` 字段与您在 Marketplace 创建的 Publisher ID 完全一致。

### Q2: 发布失败：认证错误
**A:** 
- 确认 PAT 是否正确
- 确认 PAT 的 Scope 是否包含 Marketplace: Manage
- PAT 可能已过期，需要重新创建

### Q3: 图标不显示
**A:**
- 确保 icon.png 存在且尺寸正确（128x128）
- 检查 .vscodeignore 没有忽略图标文件

### Q4: 插件在市场上不可见
**A:**
- 等待 5-10 分钟
- 检查发布者页面是否显示 "Published"
- 查看是否有错误消息

### Q5: 如何撤销发布
**A:**
```bash
vsce unpublish YOUR_PUBLISHER_ID.frontend-performance-analyzer
```

## 📚 相关资源

- [VSCode 插件发布文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace 管理页面](https://marketplace.visualstudio.com/manage)
- [vsce CLI 文档](https://github.com/microsoft/vscode-vsce)

## ✅ 快速检查清单

在发布前，确保：

- [ ] package.json 中的 `publisher` 已更新
- [ ] package.json 中的 `repository` URL 已更新
- [ ] 创建了 icon.png（或移除 icon 字段）
- [ ] 代码已编译（npm run compile）
- [ ] 已创建 GitHub 仓库并推送代码
- [ ] 已注册 VSCode 发布者账号
- [ ] 已创建 Azure DevOps PAT
- [ ] 已安装 vsce（npm install -g @vscode/vsce）
- [ ] 测试打包（vsce package）
- [ ] 准备好发布（vsce publish）

## 🎉 发布成功后

恭喜！您的插件现在可以被全球开发者使用了！

**推广建议**：
- 在 GitHub README 中添加 VSCode Marketplace 徽章
- 分享到社交媒体
- 在相关技术社区发布
- 收集用户反馈并持续改进
