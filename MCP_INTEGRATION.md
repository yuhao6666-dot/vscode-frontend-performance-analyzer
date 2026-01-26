# MCP 集成说明

## 概述

本插件已成功集成 MCP（Model Context Protocol）来实现 AI 自动分析功能。这解决了之前 Claude Code CLI 超时的问题，使得 AI 深度分析能够稳定运行。

## 架构设计

### 组件说明

1. **MCP Server** (`src/mcp-server/performance-analyzer-server.ts`)
   - 独立的 MCP 服务器进程
   - 提供 `analyze_performance` 工具
   - 接收代码分析请求，返回分析 prompt

2. **MCP Client** (`src/claude-code-integration.ts`)
   - VSCode 插件中的 MCP 客户端
   - 连接到 MCP Server
   - 调用 `analyze_performance` 工具
   - 解析和规范化分析结果

3. **插件集成** (`src/extension.ts`)
   - 管理分析工作流
   - 先运行基础规则分析
   - 然后通过 MCP 进行 AI 深度分析
   - 合并两种分析结果

### 通信流程

```
VSCode 插件 → MCP Client → MCP Server → Claude AI
                ↓              ↓            ↓
              启动连接      接收请求     执行分析
                ↓              ↓            ↓
            发送分析请求   构建 Prompt   返回结果
                ↓              ↓            ↓
            解析结果     传递响应      显示诊断
```

## 关键特性

### 1. 自动分析
- 保存文件时自动触发
- 先运行基础规则（快速）
- 再运行 AI 分析（深度）
- 可通过配置项 `autoClaudeAnalysis` 开关

### 2. AI 输出标识 🆕
- **AI 分析结果带有 "🤖 AI 分析:" 前缀**，轻松区分基础规则和 AI 深度分析
- 基础规则: `检测到嵌套循环，可能影响性能`
- AI 分析: `🤖 AI 分析: 建议使用 Map 数据结构优化查找性能`
- 详见 [AI_OUTPUT_GUIDE.md](AI_OUTPUT_GUIDE.md)

### 3. Web Vitals 监控 🆕
- 新增专门的 Web Vitals 规则检测
- 涵盖 **INP、FCP、LCP、CLS、TTI** 等核心指标
- 检测影响性能指标的具体代码模式
- 提供针对性优化建议

### 4. 错误处理
- MCP 服务初始化失败时降级到基础分析
- AI 分析失败时保留基础分析结果
- 详细的错误日志便于调试

### 5. 资源管理
- MCP 客户端单例模式
- 插件卸载时自动清理连接
- 防止资源泄漏

## 配置选项

在 VSCode 设置中添加：

```json
{
  // 启用/禁用整体性能分析
  "performanceAnalyzer.enabled": true,

  // 保存时自动分析
  "performanceAnalyzer.autoAnalyze": true,

  // 自动进行 AI 深度分析（新增）
  "performanceAnalyzer.autoClaudeAnalysis": true
}
```

## 支持的语言

- JavaScript (.js)
- TypeScript (.ts)
- Vue (.vue)
- JSX (.jsx)
- TSX (.tsx)

## 使用方法

### 自动分析
1. 打开或编辑支持的文件
2. 保存文件（Cmd/Ctrl + S）
3. 插件自动进行基础分析和 AI 深度分析
4. 查看编辑器中的波浪线标注
5. 🤖 标识的诊断来自 AI 深度分析

### 手动分析
1. 打开命令面板（Cmd/Ctrl + Shift + P）
2. 运行 `Performance: View Detailed Analysis Report`
3. 查看完整的 AI 分析报告

## 日志和调试

插件会在控制台输出详细日志：

```
🔍 开始分析文件: /path/to/file.js
📄 文件内容长度: 1234 字符
🔧 开始基础规则分析...
✅ 基础分析完成，发现 5 个问题
🤖 开始 AI 深度分析...
✅ MCP 客户端连接成功
🔍 开始 MCP 分析...
📊 MCP 分析完成
✅ AI 深度分析完成，新增 3 个问题
✅ 分析完成！
```

如果 MCP 初始化失败或 AI 分析出错，会看到：
```
⚠️ AI 深度分析失败，使用基础分析结果: [错误信息]
```

## 性能优化

### 减少超时风险
- MCP 协议提供更稳定的通信机制
- 异步处理不阻塞编辑器
- 错误时快速降级到基础分析

### 资源占用
- MCP Server 轻量级进程
- 客户端连接复用
- 按需启动，自动清理

## 与原方案对比

| 特性 | 原 Claude Code CLI | 新 MCP 集成 |
|------|-------------------|-------------|
| 通信方式 | spawn 进程 + 标准输入输出 | MCP 协议 |
| 稳定性 | 易超时 | 稳定可靠 |
| 资源管理 | 手动清理 | 自动管理 |
| 错误处理 | 简单 | 完善的降级机制 |
| 扩展性 | 有限 | 易于扩展 |

## 故障排查

### MCP 服务启动失败
**症状**: 日志显示 "❌ MCP 客户端初始化失败"

**解决方法**:
1. 检查依赖是否安装: `npm install`
2. 检查编译是否成功: `npm run compile`
3. 查看 `out/mcp-server/performance-analyzer-server.js` 是否存在

### AI 分析无结果
**症状**: 只看到基础分析结果，没有 AI 深度分析

**解决方法**:
1. 检查配置: `performanceAnalyzer.autoClaudeAnalysis` 是否为 `true`
2. 查看控制台日志，确认 MCP 连接状态
3. 尝试手动运行 `Performance: View Detailed Analysis Report`

### 分析结果解析失败
**症状**: 日志显示 "解析分析结果失败"

**解决方法**:
- 这通常意味着 AI 返回的格式不符合预期
- 原始结果会显示在 summary 中
- 插件会继续显示基础分析结果

## 开发指南

### 添加新的 MCP 工具

1. 在 `src/mcp-server/performance-analyzer-server.ts` 中定义工具：
```typescript
const NEW_TOOL: Tool = {
    name: 'new_tool_name',
    description: '工具描述',
    inputSchema: { /* JSON Schema */ },
};
```

2. 注册到工具列表：
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [ANALYZE_PERFORMANCE_TOOL, NEW_TOOL],
    };
});
```

3. 实现工具处理逻辑：
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'new_tool_name') {
        // 处理逻辑
    }
});
```

### 扩展分析类型

在 MCP Server 的 `buildAnalysisPrompt` 函数中添加新的分析类别：

```typescript
private buildAnalysisPrompt(code: string, languageId: string): string {
    return `请分析以下 ${languageId} 代码的性能问题：

## 新增分析类别

7. **新类别名称**
   - 检测项1
   - 检测项2
   ...
`;
}
```

## 未来改进

1. **缓存机制**: 对相同代码避免重复分析
2. **增量分析**: 只分析修改的部分
3. **自定义 Prompt**: 允许用户自定义分析要求
4. **多模型支持**: 支持不同的 AI 模型
5. **分析历史**: 记录和对比历史分析结果

## 总结

通过 MCP 集成，本插件实现了：
- ✅ 稳定的 AI 自动分析
- ✅ 完善的错误处理
- ✅ 良好的用户体验
- ✅ 易于维护和扩展

这是插件的核心"亮点功能"，为用户提供了强大的代码性能分析能力。
