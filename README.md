# Frontend Performance Analyzer

一个强大的 VSCode 插件，可以在编写代码时实时分析前端性能问题，集成 Claude Code 提供智能深度分析。

## ✨ 特性

- 🚀 **实时性能分析**：编写代码时即时发现性能问题
- 🤖 **AI 智能分析**：自动使用 MCP 进行深度智能分析，AI 分析结果带有 "🤖 AI 分析:" 标识（无需配置 API Key）
- 📊 **多维度检测**：涵盖循环、DOM、渲染、内存、Web Vitals 等多个方面
- 🎯 **精准定位**：在编辑器中直接标注问题代码
- 💡 **优化建议**：针对每个问题提供具体的优化方案
- 🔧 **高度可配置**：支持自定义规则和严重级别
- 📈 **Web Vitals 监控**：专门检测影响 INP、FCP、LCP、CLS 等核心指标的代码

## 📦 支持的语言

- JavaScript (.js)
- TypeScript (.ts)
- Vue (.vue)
- React JSX (.jsx)
- React TSX (.tsx)
- TypeScript React (.typescriptreact)

## 🔍 检测的性能问题

### 1. 循环性能问题
- ❌ 嵌套循环
- ❌ 循环中的 DOM 操作
- ❌ 循环中的异步操作
- ❌ 过长的数组方法链式调用

### 2. DOM 操作问题
- ❌ 循环中频繁查询 DOM
- ❌ 频繁修改样式导致重排重绘
- ❌ 使用 innerHTML 的安全和性能问题

### 3. 渲染性能问题
- ❌ React render 中创建新对象/函数作为 prop
- ❌ Vue data 中的复杂响应式对象
- ❌ 列表渲染缺少 key 属性
- ❌ React Hooks 依赖问题（useEffect/useCallback/useMemo）
- ❌ 在循环或条件中调用 Hooks

### 4. 内存泄漏风险
- ❌ 未移除的事件监听器
- ❌ 未清除的定时器
- ❌ useEffect 缺少清理函数
- ❌ Vue onMounted 缺少 onUnmounted

### 5. 阻塞操作与异步优化
- ❌ 同步的文件操作
- ❌ 未使用防抖/节流的频繁事件
- ❌ 大量数据的同步处理
- ❌ 复杂的正则表达式
- ❌ 串行 await 调用（应使用 Promise.all）
- ❌ 未处理的 Promise rejection
- ❌ 循环中创建 Promise

### 6. 打包体积问题
- ❌ 完整导入大型库（lodash、moment、antd 等）
- ❌ 内联大型数据
- ❌ 文件过大
- ❌ 重复导入相同的包
- ❌ 未使用 tree-shaking 的导入方式

### 7. 网络请求性能
- ❌ 循环中发起网络请求
- ❌ 未设置超时的请求
- ❌ 在组件渲染时直接发起请求（应在 useEffect 中）

### 8. Web Vitals 核心指标 🆕
- ❌ **INP (Interaction to Next Paint)**: 高频事件未防抖/节流、重量级事件处理器、强制同步布局
- ❌ **FCP (First Contentful Paint)**: 顶层阻塞代码、document.write、同步 alert/confirm
- ❌ **LCP (Largest Contentful Paint)**: 延迟加载主要内容、懒加载首屏组件
- ❌ **CLS (Cumulative Layout Shift)**: 动态插入内容、图片未设置尺寸、Web 字体闪烁
- ❌ **TTI (Time to Interactive)**: 长任务阻塞主线程

## 🚀 快速开始

### 安装

1. 克隆项目：
```bash
git clone <repository-url>
cd vscode-frontend-performance-analyzer
```

2. 安装依赖：
```bash
npm install
```

3. 编译：
```bash
npm run compile
```

4. 在 VSCode 中按 `F5` 启动插件开发模式

### 配置 AI 智能分析（推荐）

要使用 AI 智能深度分析功能：

1. 插件已集成 MCP（Model Context Protocol）进行 AI 分析
2. 首次使用时会自动安装必要的依赖

> 💡 **提示**：AI 智能分析通过 MCP 协议实现，无需额外配置 API Key。保存文件时会自动进行深度分析。

## 📖 使用方法

### 自动分析

插件会在以下情况自动分析代码：
- 打开支持的文件类型
- 保存文件时（需启用 `autoAnalyze` 配置）

### 手动分析

使用命令面板（`Cmd/Ctrl + Shift + P`）：

- `Performance: Analyze Current File` - 分析当前文件（已自动集成 AI 深度分析）
- `Performance: View Detailed Analysis Report` - 查看详细 AI 分析报告
- `Performance: Clear Diagnostics` - 清除诊断信息

### 查看问题

性能问题会以波浪线标注在代码中：
- 红色波浪线：严重问题
- 黄色波浪线：警告
- 蓝色波浪线：建议

悬停在标注上可以查看：
- 问题描述
- 优化建议
- 相关信息

## ⚙️ 配置选项

```json
{
  // 启用/禁用性能分析
  "performanceAnalyzer.enabled": true,

  // 保存时自动分析
  "performanceAnalyzer.autoAnalyze": true,

  // 自动进行 AI 深度分析（使用 MCP）
  "performanceAnalyzer.autoClaudeAnalysis": true,

  // 问题显示级别
  "performanceAnalyzer.severity": "Warning",

  // 启用/禁用特定规则
  "performanceAnalyzer.rules": {
    "largeLoop": true,
    "nestedLoop": true,
    "frequentDomManipulation": true,
    "inefficientRendering": true,
    "memoryLeak": true,
    "blockingOperation": true,
    "unoptimizedImage": true,
    "largeBundle": true
  }
}
```

## 📊 AI 智能深度分析（MCP）

本插件已集成 MCP（Model Context Protocol），可以提供更智能和全面的性能分析：

**分析能力：**
1. 🔍 识别基础规则未覆盖的性能问题
2. 💡 提供上下文相关的优化建议
3. 📈 给出整体性能评分
4. ⚡ 提供优先优化建议列表

**优势：**
- 🚀 **无需配置 API Key**：使用 MCP 协议自动管理认证
- 🤖 **自动启用**：保存文件时自动进行 AI 深度分析
- 💻 **完整上下文理解**：利用 AI 的完整代码理解能力
- 🎯 **智能建议**：基于最佳实践提供针对性优化方案
- ⚡ **快速响应**：通过 MCP 协议实现高效通信

**工作流程：**
1. 打开或保存支持的文件类型
2. 插件自动运行基础规则检测
3. 自动通过 MCP 进行 AI 深度分析
4. 在编辑器中直接查看分析结果和优化建议
5. 使用 `Performance: View Detailed Analysis Report` 查看完整分析报告

## 🎯 最佳实践

1. **启用 AI 自动分析**：确保 `autoClaudeAnalysis` 配置为 `true` 以获得最佳分析体验
2. **定期运行分析**：养成保存代码时查看性能提示的习惯
3. **重点关注警告级别问题**：优先解决黄色和红色标注的问题
4. **查看详细报告**：使用 `View Detailed Analysis Report` 命令查看 AI 的完整分析
5. **根据实际情况调整**：不是所有警告都必须修复，要根据实际场景判断

## 🛠️ 开发

### 项目结构

```
vscode-frontend-performance-analyzer/
├── src/
│   ├── extension.ts           # 插件入口
│   ├── analyzer.ts             # 性能分析引擎
│   ├── claude-integration.ts   # Claude API 集成
│   ├── diagnostics.ts          # 诊断提供者
│   ├── types.ts                # 类型定义
│   └── rules/                  # 检测规则
│       ├── index.ts
│       ├── loop-rule.ts
│       ├── dom-manipulation-rule.ts
│       ├── rendering-rule.ts
│       ├── memory-leak-rule.ts
│       └── blocking-operation-rule.ts
├── package.json
├── tsconfig.json
└── README.md
```

### 添加新规则

1. 在 `src/rules/` 下创建新的规则文件
2. 实现 `Rule` 接口
3. 在 `src/rules/index.ts` 中注册规则

示例：

```typescript
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class MyCustomRule implements Rule {
    name = 'MyCustomRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检测逻辑
        if (/* 检测到问题 */) {
            issues.push({
                type: IssueType.BlockingOperation,
                severity: IssueSeverity.Warning,
                message: '问题描述',
                line: path.node.loc?.start.line || 0,
                suggestion: '优化建议',
            });
        }

        return issues;
    }
}
```

### 构建和发布

```bash
# 编译
npm run compile

# 监听模式
npm run watch

# 打包为 .vsix
vsce package
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

## 🙏 致谢

- [Anthropic Claude](https://www.anthropic.com/) - 提供强大的 AI 分析能力
- [Babel](https://babeljs.io/) - JavaScript 解析器
- [VSCode Extension API](https://code.visualstudio.com/api) - 插件开发框架

## 📮 反馈

如有问题或建议，欢迎：
- 提交 GitHub Issue
- 发送邮件
- 在 VSCode Marketplace 留言

---

**享受编码的同时，也关注性能！** 🚀
