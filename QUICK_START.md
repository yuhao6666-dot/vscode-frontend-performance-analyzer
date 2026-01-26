# 快速开始指南

## 📦 安装步骤

### 1. 安装依赖

进入项目目录并安装依赖：

```bash
cd ~/Desktop/vscode-frontend-performance-analyzer
npm install
```

### 2. 编译项目

```bash
npm run compile
```

### 3. 在 VSCode 中调试

1. 在 VSCode 中打开项目目录
2. 按 `F5` 或点击"运行和调试"
3. 选择"Extension"配置
4. 新的 VSCode 窗口会打开，插件已加载

## 🧪 测试插件

### 基础测试

1. 在新窗口中打开 `examples/bad-performance.js`
2. 你会看到代码中出现波浪线标记
3. 将鼠标悬停在标记上查看问题描述和建议

### Claude AI 深度分析测试

#### 配置 Claude API Key

1. 在新窗口中打开设置（`Cmd/Ctrl + ,`）
2. 搜索 `performanceAnalyzer.claudeApiKey`
3. 输入你的 Claude API Key

如果还没有 API Key：
- 访问 https://console.anthropic.com/
- 注册账号并获取 API Key

#### 运行 Claude 分析

1. 打开 `examples/bad-performance.js`
2. 按 `Cmd/Ctrl + Shift + P` 打开命令面板
3. 输入并选择：`Performance: Deep Analysis with Claude`
4. 等待分析完成
5. 查看侧边栏打开的详细分析报告

## 🎯 测试不同场景

### JavaScript 测试
打开 `examples/bad-performance.js` 和 `examples/good-performance.js`，对比优化前后的差异。

### React 测试
打开 `examples/react-example.tsx`，查看 React 特定的性能问题检测。

### Vue 测试
打开 `examples/vue-example.vue`，查看 Vue 特定的性能问题检测。

## ⚙️ 配置选项测试

### 禁用特定规则

1. 打开设置
2. 搜索 `performanceAnalyzer.rules`
3. 尝试禁用某个规则，如设置 `"nestedLoop": false`
4. 重新分析文件，验证该规则的问题不再显示

### 更改严重级别

1. 搜索 `performanceAnalyzer.severity`
2. 尝试不同的级别：Error、Warning、Information、Hint
3. 查看诊断标记颜色的变化

### 禁用自动分析

1. 搜索 `performanceAnalyzer.autoAnalyze`
2. 设置为 `false`
3. 保存文件时不会自动分析
4. 使用命令手动触发分析

## 🔧 开发模式

### 监听模式

如果你要修改代码：

```bash
npm run watch
```

这会自动编译你的更改。修改代码后：
1. 在调试窗口按 `Cmd/Ctrl + R` 重新加载插件
2. 或者停止调试并重新按 `F5`

### 调试技巧

1. **查看输出**
   - 在调试窗口打开"输出"面板
   - 选择"Frontend Performance Analyzer"
   - 查看插件的日志输出

2. **设置断点**
   - 在源代码中设置断点
   - 触发相应功能
   - 调试器会在断点处暂停

3. **查看 AST**
   - 在 `analyzer.ts` 中添加 `console.log(ast)` 查看解析结果

## 📝 常用命令

在命令面板（`Cmd/Ctrl + Shift + P`）中：

- `Performance: Analyze Current File` - 分析当前文件
- `Performance: Deep Analysis with Claude` - Claude 深度分析
- `Performance: Clear Diagnostics` - 清除所有诊断

## 🐛 常见问题

### 插件没有启动

1. 检查 VSCode 版本是否 >= 1.80.0
2. 确保项目已编译：`npm run compile`
3. 查看"输出"面板的错误信息

### 没有检测到问题

1. 确保文件类型正确（.js, .ts, .vue, .jsx, .tsx）
2. 检查 `performanceAnalyzer.enabled` 是否为 `true`
3. 查看是否有相关规则被禁用

### Claude 分析失败

1. 检查 API Key 是否正确配置
2. 检查网络连接
3. 查看"输出"面板的错误信息
4. 确认 API Key 有足够的配额

### 性能问题

如果分析大文件时很慢：
1. 考虑禁用某些规则
2. 禁用自动分析，改用手动分析
3. 减小文件大小或拆分文件

## 🚀 下一步

1. **阅读完整文档**：查看 [README.md](README.md)
2. **查看示例代码**：深入研究 `examples/` 目录
3. **自定义规则**：尝试添加自己的检测规则
4. **反馈问题**：发现 bug 或有建议？欢迎提 Issue

## 💡 实用技巧

1. **快捷键**
   - 设置自定义快捷键来快速触发分析
   - File > Preferences > Keyboard Shortcuts
   - 搜索 "Performance: Analyze"

2. **工作区配置**
   - 为不同项目配置不同的规则
   - 在项目根目录创建 `.vscode/settings.json`

3. **团队协作**
   - 将配置提交到版本控制
   - 确保团队成员使用相同的规则

4. **持续优化**
   - 定期运行 Claude 深度分析
   - 关注性能评分的变化趋势
   - 优先处理高严重级别的问题

---

祝你使用愉快！如有问题，欢迎反馈。
