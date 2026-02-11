import { exec } from 'child_process';
import { promisify } from 'util';
import { ClaudeAnalysisResult, PerformanceIssue, IssueType, IssueSeverity } from './types';

const execAsync = promisify(exec);

/**
 * Claude CLI 集成
 * 使用终端的 claude 命令进行分析
 */
export class ClaudeCLIIntegration {
    /**
     * 检查 Claude CLI 是否可用
     */
    async isClaudeInstalled(): Promise<boolean> {
        try {
            await execAsync('which claude');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 使用 Claude CLI 分析代码
     */
    async analyzeCode(
        code: string,
        languageId: string,
        filePath?: string
    ): Promise<ClaudeAnalysisResult> {
        console.log('🤖 使用 Claude CLI 进行分析...');

        // 检查 Claude CLI 是否可用
        const isInstalled = await this.isClaudeInstalled();
        if (!isInstalled) {
            throw new Error('Claude CLI 未安装。请先安装 Claude CLI：npm install -g @anthropic-ai/claude-cli');
        }

        const prompt = this.buildAnalysisPrompt(code, languageId);

        try {
            // 使用 claude 命令进行分析
            // 使用 heredoc 方式传递 prompt
            const { stdout, stderr } = await execAsync(
                `claude << 'PROMPT_END'\n${prompt}\nPROMPT_END`,
                {
                    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                    timeout: 60000, // 60秒超时
                }
            );

            if (stderr) {
                console.warn('Claude CLI stderr:', stderr);
            }

            console.log('✅ Claude CLI 分析完成');
            return this.parseAnalysisResult(stdout);
        } catch (error: any) {
            console.error('❌ Claude CLI 调用失败:', error);
            throw new Error(`Claude CLI 分析失败: ${error.message}`);
        }
    }

    /**
     * 构建分析 prompt
     */
    private buildAnalysisPrompt(code: string, languageId: string): string {
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
   - React/Vue 组件的不必要重复渲染
   - 缺少 key 的列表渲染
   - React 中未使用 memo/useMemo/useCallback 优化
   - React 在渲染函数中创建新对象/函数作为 props（导致子组件重渲染）

   **注意：Vue 响应式系统的正确理解**
   - 直接修改响应式对象的属性（如 this.query.params.name = 'value'）是正常且高效的，这是 Vue 响应式系统的设计初衷
   - 不要建议使用对象展开运算符来"优化"响应式更新，这反而会降低性能
   - 只有当数据不需要响应式时，才考虑使用 Object.freeze()

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

    /**
     * 解析分析结果
     */
    private parseAnalysisResult(response: string): ClaudeAnalysisResult {
        try {
            // 尝试从输出中提取 JSON
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

            let parsed: any;
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1]);
            } else {
                // 尝试直接解析整个输出
                try {
                    parsed = JSON.parse(response);
                } catch {
                    // 如果无法解析为 JSON，返回原始文本作为摘要
                    return {
                        issues: [],
                        summary: response,
                        overallScore: undefined,
                        recommendations: [],
                    };
                }
            }

            // 规范化结果 - 添加 AI 标识
            const issues: PerformanceIssue[] = (parsed.issues || []).map((issue: any) => ({
                type: this.normalizeIssueType(issue.type),
                severity: this.normalizeSeverity(issue.severity),
                message: `🤖 Claude AI: ${issue.message || '性能问题'}`,
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

    /**
     * 规范化问题类型
     */
    private normalizeIssueType(type: string): IssueType {
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

    /**
     * 规范化严重程度
     */
    private normalizeSeverity(severity: string): IssueSeverity {
        const mapping: Record<string, IssueSeverity> = {
            Error: IssueSeverity.Error,
            Warning: IssueSeverity.Warning,
            Information: IssueSeverity.Information,
            Hint: IssueSeverity.Hint,
        };

        return mapping[severity] || IssueSeverity.Warning;
    }
}
