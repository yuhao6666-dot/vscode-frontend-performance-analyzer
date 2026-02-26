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

        // 🔍 调试：输出完整 prompt
        console.log('📝 发送给 Claude 的完整 Prompt:');
        console.log('='.repeat(80));
        console.log(prompt);
        console.log('='.repeat(80));

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

            // 🔍 调试：输出 Claude 的原始响应
            console.log('📥 Claude 的原始响应:');
            console.log('='.repeat(80));
            console.log(stdout);
            console.log('='.repeat(80));

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

7. **Web Vitals 性能问题**
   - **LCP (Largest Contentful Paint)** - 最大内容绘制
     * 大型图片或视频未优化
     * 阻塞渲染的 CSS/JS 资源
     * 服务器响应时间过长
     * 客户端渲染延迟
   - **INP (Interaction to Next Paint)** - 交互响应性
     * 长时间运行的 JavaScript 任务
     * 事件处理器中的昂贵操作
     * 大量同步更新导致的阻塞
     * 主线程繁忙影响交互响应
   - **CLS (Cumulative Layout Shift)** - 累积布局偏移
     * 图片/视频未设置尺寸
     * 动态注入内容导致布局变化
     * 使用不稳定的字体加载
     * 广告或嵌入式内容导致的偏移
   - **FCP (First Contentful Paint)** - 首次内容绘制
     * 阻塞的 CSS/JS 资源
     * 未优化的关键渲染路径
     * 字体加载策略不当
   - **TTI (Time to Interactive)** - 可交互时间
     * 大量的 JavaScript 执行
     * 长任务阻塞主线程
     * 不必要的初始化代码

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
    "添加防抖处理频繁调用的函数",
    "为图片添加 width/height 属性以改善 CLS",
    "使用代码拆分和懒加载优化 LCP",
    "优化长任务以改善 INP 和 TTI"
  ],
  "summary": "整体分析说明（包含 Web Vitals 相关的性能评估和优化建议）..."
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
