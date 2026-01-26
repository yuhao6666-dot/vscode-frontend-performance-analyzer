import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ClaudeAnalysisResult, PerformanceIssue, IssueType, IssueSeverity } from '../types';

// 定义分析工具
const ANALYZE_PERFORMANCE_TOOL: Tool = {
    name: 'analyze_performance',
    description: '分析前端代码性能问题，返回详细的性能分析结果',
    inputSchema: {
        type: 'object',
        properties: {
            code: {
                type: 'string',
                description: '要分析的代码内容',
            },
            languageId: {
                type: 'string',
                description: '代码语言类型 (javascript, typescript, vue, jsx, tsx)',
            },
            filePath: {
                type: 'string',
                description: '文件路径（可选）',
            },
        },
        required: ['code', 'languageId'],
    },
};

// 构建分析 prompt
function buildAnalysisPrompt(code: string, languageId: string): string {
    return `请分析以下 ${languageId} 代码的性能问题：

\`\`\`${languageId}
${code}
\`\`\`

## 分析任务

请对代码进行深度性能分析，重点关注：

1. **循环性能问题**
   - 大型循环（迭代次数过多）
   - 嵌套循环（多层嵌套）
   - 循环内的昂贵操作（DOM 操作、异步操作等）

2. **DOM 操作问题**
   - 频繁的 DOM 查询和操作
   - 在循环中操作 DOM
   - 导致回流/重绘的操作
   - 使用 innerHTML 的安全和性能问题

3. **渲染性能问题**
   - React/Vue 组件的重复渲染
   - 缺少 key 的列表渲染
   - 未使用 memo/computed 等优化
   - 在渲染函数中创建新对象/函数

4. **内存泄漏风险**
   - 未清理的事件监听器
   - 未取消的定时器
   - 未取消的网络请求
   - 闭包导致的内存泄漏

5. **阻塞操作**
   - 同步的耗时操作
   - 未使用防抖/节流的频繁调用
   - 大量数据的同步处理
   - 复杂的正则表达式

6. **打包体积问题**
   - 完整导入大型库
   - 内联大型数据
   - 未压缩的资源

## 输出要求

请以 JSON 格式输出分析结果，格式如下：

\`\`\`json
{
  "overallScore": 85,
  "issues": [
    {
      "type": "nestedLoop",
      "severity": "Warning",
      "line": 10,
      "message": "检测到嵌套循环，可能影响性能",
      "suggestion": "考虑使用 Map 或 Set 优化查找操作"
    }
  ],
  "recommendations": [
    "优先优化嵌套循环问题",
    "添加防抖处理频繁调用的函数"
  ],
  "summary": "整体分析说明..."
}
\`\`\`

其中：
- overallScore: 性能评分（0-100）
- issues: 问题列表
  - type: 问题类型（largeLoop, nestedLoop, frequentDomManipulation, inefficientRendering, memoryLeak, blockingOperation, unoptimizedImage, largeBundle）
  - severity: 严重程度（Error, Warning, Information, Hint）
  - line: 行号（从 1 开始）
  - message: 问题描述
  - suggestion: 优化建议
- recommendations: 优先优化建议列表
- summary: 整体分析说明

请仔细阅读代码，识别所有潜在的性能问题，并提供具体的优化建议。`;
}

// 解析分析结果
function parseAnalysisResult(response: string): ClaudeAnalysisResult {
    try {
        // 尝试从输出中提取 JSON
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

        let parsed: any;
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1]);
        } else {
            // 尝试直接解析整个输出
            parsed = JSON.parse(response);
        }

        // 规范化结果
        const issues: PerformanceIssue[] = (parsed.issues || []).map((issue: any) => ({
            type: normalizeIssueType(issue.type),
            severity: normalizeSeverity(issue.severity),
            message: issue.message || '性能问题',
            line: Math.max(0, (issue.line || 0) - 1), // 转换为 0-based
            column: issue.column,
            suggestion: issue.suggestion,
        }));

        return {
            issues,
            summary: parsed.summary || response,
            overallScore: parsed.overallScore,
            recommendations: parsed.recommendations || [],
        };
    } catch (error) {
        // 如果解析失败，返回原始输出作为摘要
        console.error('解析分析结果失败:', error);
        return {
            issues: [],
            summary: response,
            overallScore: undefined,
            recommendations: [],
        };
    }
}

function normalizeIssueType(type: string): IssueType {
    const mapping: Record<string, IssueType> = {
        largeLoop: IssueType.LargeLoop,
        nestedLoop: IssueType.NestedLoop,
        frequentDomManipulation: IssueType.FrequentDomManipulation,
        inefficientRendering: IssueType.InefficientRendering,
        memoryLeak: IssueType.MemoryLeak,
        blockingOperation: IssueType.BlockingOperation,
        unoptimizedImage: IssueType.UnoptimizedImage,
        largeBundle: IssueType.LargeBundle,
    };

    return mapping[type] || IssueType.BlockingOperation;
}

function normalizeSeverity(severity: string): IssueSeverity {
    const mapping: Record<string, IssueSeverity> = {
        Error: IssueSeverity.Error,
        Warning: IssueSeverity.Warning,
        Information: IssueSeverity.Information,
        Hint: IssueSeverity.Hint,
    };

    return mapping[severity] || IssueSeverity.Warning;
}

// 创建 MCP 服务器
const server = new Server(
    {
        name: 'performance-analyzer',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [ANALYZE_PERFORMANCE_TOOL],
    };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'analyze_performance') {
        const { code, languageId, filePath } = request.params.arguments as {
            code: string;
            languageId: string;
            filePath?: string;
        };

        try {
            // 构建分析 prompt
            const prompt = buildAnalysisPrompt(code, languageId);

            // 这里返回 prompt，让 Claude 来执行分析
            // MCP 协议会自动将这个 prompt 发送给 Claude 进行处理
            return {
                content: [
                    {
                        type: 'text',
                        text: prompt,
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `分析失败: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error(`未知工具: ${request.params.name}`);
});

// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Performance Analyzer MCP Server 已启动');
}

main().catch((error) => {
    console.error('服务器启动失败:', error);
    process.exit(1);
});
