# 更新日志

## [0.1.3] - 2026-01-27

### ✨ 新增功能

#### 🤖 Claude CLI 集成
- **简化 AI 分析配置**：无需配置 API Key，直接使用终端的 `claude` 命令
- **自动 AI 深度分析**：保存文件时自动调用 Claude AI 进行性能分析
- **智能降级**：如果 Claude CLI 不可用，自动使用基础规则分析
- **详细分析报告**：提供性能评分（0-100）、问题列表和优化建议

#### 📊 AI 分析报告视图
- **可视化报告面板**：AI 分析完成后自动在右侧显示详细报告
- **性能评分展示**：大型圆形评分显示，带颜色指示（绿色/橙色/红色）
- **问题列表**：按严重程度分类显示所有发现的性能问题
- **优化建议**：提供具体的、可操作的优化建议列表
- **实时更新**：每次分析完成后自动更新报告内容

#### ⚡ 性能优化
- **即时反馈**：基础分析结果立即显示（黄色波浪线）
- **后台 AI 分析**：AI 分析在后台异步运行，不阻塞编辑器
- **状态提示**：状态栏显示 AI 分析进度

#### 📋 改进功能
- 移除了复杂的 MCP 协议和 API Key 配置
- 简化了 AI 分析的使用流程
- 优化了错误提示信息
- 改进了 AI 分析结果的展示

### 🔧 技术变更
- 新增 `claude-cli-integration.ts` 模块
- 新增 `report-view.ts` 模块（AI 报告 WebView）
- 移除 `claude-code-integration.ts` 和 `claude-api-integration.ts`
- 更新配置项：移除 `claudeApiKey`，保留 `autoClaudeAnalysis`
- 优化异步处理：基础分析和 AI 分析分离执行

### 📚 使用说明
1. 在终端运行 `claude` 命令登录
2. 重新加载 VSCode 窗口
3. 扩展会自动使用 Claude AI 进行智能分析

---

## [0.1.2] - 2024

### ✨ 新增功能

#### 1. AI 分析结果明确标识
- **AI 分析结果带有 "🤖 AI 分析:" 前缀**，让用户轻松区分基础规则和 AI 深度分析
- 基础规则直接显示问题描述
- AI 分析结果带有明显的视觉标识
- 详见 AI_OUTPUT_GUIDE.md

**示例**:
```
基础规则: 检测到嵌套循环，可能影响性能
AI 分析:  🤖 AI 分析: 建议使用 Map 数据结构优化查找性能
```

#### 2. Web Vitals 核心指标监控
新增专门的 Web Vitals 规则，检测影响关键性能指标的代码模式：

##### INP (Interaction to Next Paint)
- ✅ 检测高频事件未使用防抖/节流
- ✅ 识别重量级事件处理器
- ✅ 发现强制同步布局（layout thrashing）
- ✅ 检测长任务阻塞主线程

##### FCP (First Contentful Paint)
- ✅ 检测顶层大量同步代码
- ✅ 识别 document.write 阻塞渲染
- ✅ 发现 alert/confirm/prompt 阻塞

##### LCP (Largest Contentful Paint)
- ✅ 检测延迟加载主要内容
- ✅ 识别懒加载首屏组件

##### CLS (Cumulative Layout Shift)
- ✅ 检测动态插入内容导致的布局偏移
- ✅ 识别未设置尺寸的图片
- ✅ 发现 Web 字体加载导致的闪烁

##### TTI (Time to Interactive)
- ✅ 检测函数体过大的长任务

### 🔧 修复
- 移除了误加的 TCL 语言支持

### 📚 文档更新
- 新增 AI_OUTPUT_GUIDE.md
- 更新 MCP_INTEGRATION.md
- 更新 README.md
- 新增 test-web-vitals.jsx 测试文件

### 📊 统计
**总计**: 40+ 检测场景，覆盖 9 大类性能问题
