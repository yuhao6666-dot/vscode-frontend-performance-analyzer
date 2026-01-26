# 更新日志

## [最新更新] - 2024

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
