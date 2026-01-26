import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ClaudeAnalysisResult, PerformanceIssue, IssueType, IssueSeverity } from './types';
import * as path from 'path';

export class ClaudeCodeIntegration {
    private mcpClient: Client | null = null;
    private mcpServerProcess: ChildProcess | null = null;

    /**
     * 初始化 MCP 客户端连接
     */
    private async initMCPClient(): Promise<void> {
        if (this.mcpClient) {
            return; // 已经初始化
        }

        try {
            // 启动 MCP 服务器进程
            const serverPath = path.join(__dirname, 'mcp-server', 'performance-analyzer-server.js');

            this.mcpServerProcess = spawn('node', [serverPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            // 创建 MCP 客户端
            this.mcpClient = new Client(
                {
                    name: 'vscode-performance-analyzer-client',
                    version: '1.0.0',
                },
                {
                    capabilities: {},
                }
            );

            // 连接到服务器
            const transport = new StdioClientTransport({
                command: 'node',
                args: [serverPath],
            });

            await this.mcpClient.connect(transport);

            console.log('✅ MCP 客户端连接成功');
        } catch (error) {
            console.error('❌ MCP 客户端初始化失败:', error);
            throw new Error(`MCP 客户端初始化失败: ${error}`);
        }
    }

    /**
     * 检查 MCP 服务是否可用
     */
    async isClaudeCodeInstalled(): Promise<boolean> {
        try {
            await this.initMCPClient();
            return this.mcpClient !== null;
        } catch (error) {
            console.error('检查 MCP 服务失败:', error);
            return false;
        }
    }

    /**
     * 使用 MCP 协议分析代码
     */
    async analyzeCode(
        code: string,
        languageId: string,
        filePath?: string
    ): Promise<ClaudeAnalysisResult> {
        try {
            // 确保 MCP 客户端已初始化
            await this.initMCPClient();

            if (!this.mcpClient) {
                throw new Error('MCP 客户端未初始化');
            }

            console.log('🔍 开始 MCP 分析...');

            // 调用 MCP 工具进行分析
            const result = await this.mcpClient.callTool({
                name: 'analyze_performance',
                arguments: {
                    code,
                    languageId,
                    filePath,
                },
            });

            console.log('📊 MCP 分析完成');

            // 解析结果
            if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                const responseText = (result.content as Array<any>)
                    .map((item: any) => {
                        if (item.type === 'text') {
                            return item.text;
                        }
                        return '';
                    })
                    .join('\n');

                return this.parseAnalysisResult(responseText);
            }

            throw new Error('MCP 分析返回空结果');
        } catch (error: any) {
            console.error('❌ MCP 分析失败:', error);
            throw new Error(`MCP 分析失败: ${error.message}`);
        }
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
                parsed = JSON.parse(response);
            }

            // 规范化结果 - 添加 AI 标识
            const issues: PerformanceIssue[] = (parsed.issues || []).map((issue: any) => ({
                type: this.normalizeIssueType(issue.type),
                severity: this.normalizeSeverity(issue.severity),
                message: `🤖 AI 分析: ${issue.message || '性能问题'}`,
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

    /**
     * 清理资源
     */
    dispose(): void {
        if (this.mcpClient) {
            this.mcpClient.close();
            this.mcpClient = null;
        }

        if (this.mcpServerProcess) {
            this.mcpServerProcess.kill();
            this.mcpServerProcess = null;
        }
    }
}
