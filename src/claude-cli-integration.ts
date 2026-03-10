import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeAnalysisResult, PerformanceIssue, IssueType, IssueSeverity } from './types';

const execAsync = promisify(exec);

// 单个分析请求最大 token 估算上限（按字符数粗算，1 token ≈ 4 chars）
const MAX_CODE_CHARS = 24000; // ~6000 tokens，留 prompt 框架的余量
// 优先级截取：超过此行数时只提取关键代码块
const MAX_LINES_BEFORE_EXTRACT = 400;

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

        // 检查缓存 —— 防 compact：即使 context 被压缩，磁盘结果仍在
        if (filePath) {
            const cached = this.readCache(filePath, code);
            if (cached) {
                console.log('📂 命中磁盘缓存，跳过 AI 分析');
                return cached;
            }
        }

        const isInstalled = await this.isClaudeInstalled();
        if (!isInstalled) {
            throw new Error('Claude CLI 未安装。请先安装 Claude CLI：npm install -g @anthropic-ai/claude-cli');
        }

        // 内容压缩 + 优先级截取，减少 token 消耗
        const processedCode = this.prepareCode(code);
        console.log(`📊 代码压缩: ${code.length} → ${processedCode.length} 字符`);

        const prompt = this.buildAnalysisPrompt(processedCode, languageId);

        try {
            const { stdout, stderr } = await execAsync(
                `claude << 'PROMPT_END'\n${prompt}\nPROMPT_END`,
                {
                    maxBuffer: 1024 * 1024 * 10,
                    timeout: 60000,
                }
            );

            if (stderr) {
                console.warn('Claude CLI stderr:', stderr);
            }

            console.log('✅ Claude CLI 分析完成');
            const result = this.parseAnalysisResult(stdout);

            // 持久化到磁盘 —— 防 compact 导致数据丢失
            if (filePath) {
                this.writeCache(filePath, code, result);
            }

            return result;
        } catch (error: any) {
            console.error('❌ Claude CLI 调用失败:', error);
            throw new Error(`Claude CLI 分析失败: ${error.message}`);
        }
    }

    /**
     * 内容压缩 + 优先级截取
     * ⚠️ 为减少 token 消耗，超长文件只提取关键代码块
     */
    private prepareCode(code: string): string {
        // Step 1: 压缩空白
        let compressed = code
            .replace(/\n\s*\n\s*\n+/g, '\n\n')  // 多余空行
            .replace(/[ \t]+/g, ' ')              // 多余空格
            .replace(/^\s+|\s+$/gm, '');          // 行首尾空白

        // Step 2: 如果压缩后仍超限，提取关键代码块
        const lines = compressed.split('\n');
        if (lines.length > MAX_LINES_BEFORE_EXTRACT || compressed.length > MAX_CODE_CHARS) {
            compressed = this.extractKeyBlocks(lines);
            console.log(`✂️ 文件过长，已提取关键块: ${lines.length} 行 → ${compressed.split('\n').length} 行`);
        }

        return compressed;
    }

    /**
     * 提取关键代码块：函数、类、组件、v-for/useEffect 等
     */
    private extractKeyBlocks(lines: string[]): string {
        const keyPatterns = [
            /^\s*(export\s+)?(default\s+)?(async\s+)?function\s+/,
            /^\s*(export\s+)?(default\s+)?class\s+/,
            /^\s*(const|let|var)\s+\w+\s*=\s*(async\s+)?\(.*\)\s*=>/,
            /^\s*(const|let|var)\s+\w+\s*=\s*use\w+/,   // hooks
            /v-for|v-if|@click|:key/,                    // Vue 模板关键指令
            /useEffect|useMemo|useCallback|useState/,     // React hooks
            /addEventListener|setTimeout|setInterval/,    // 潜在性能问题
            /innerHTML|querySelector|getElementById/,
            /for\s*\(|\.forEach\(|\.map\(|\.filter\(/,   // 循环
        ];

        const result: string[] = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            if (keyPatterns.some(p => p.test(line))) {
                // 提取当前块（找到匹配行 ± 上下文）
                const start = Math.max(0, i - 1);
                const blockEnd = this.findBlockEnd(lines, i);
                result.push(...lines.slice(start, blockEnd + 1));
                result.push(''); // 块间空行
                i = blockEnd + 1;
            } else {
                i++;
            }
        }

        // 兜底：如果什么都没提取到，直接截断
        if (result.length === 0) {
            return lines.slice(0, MAX_LINES_BEFORE_EXTRACT).join('\n')
                + '\n// ... (文件过长，已截断)';
        }

        return result.join('\n');
    }

    /**
     * 找到代码块结束行（简单括号配对）
     */
    private findBlockEnd(lines: string[], startIndex: number): number {
        let depth = 0;
        let started = false;
        for (let i = startIndex; i < Math.min(startIndex + 100, lines.length); i++) {
            for (const ch of lines[i]) {
                if (ch === '{') { depth++; started = true; }
                if (ch === '}') { depth--; }
            }
            if (started && depth <= 0) {
                return i;
            }
        }
        return Math.min(startIndex + 50, lines.length - 1);
    }

    /**
     * 读取磁盘缓存（防 compact 兜底）
     * 缓存 key = 文件路径 + 内容 hash，内容变化自动失效
     */
    private readCache(filePath: string, code: string): ClaudeAnalysisResult | null {
        try {
            const cacheFile = this.getCachePath(filePath, code);
            if (!fs.existsSync(cacheFile)) return null;
            const raw = fs.readFileSync(cacheFile, 'utf-8');
            return JSON.parse(raw) as ClaudeAnalysisResult;
        } catch {
            return null;
        }
    }

    /**
     * 写入磁盘缓存
     */
    private writeCache(filePath: string, code: string, result: ClaudeAnalysisResult): void {
        try {
            const cacheFile = this.getCachePath(filePath, code);
            fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
            fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), 'utf-8');
            console.log('💾 分析结果已缓存:', cacheFile);
        } catch (e) {
            console.warn('缓存写入失败（不影响功能）:', e);
        }
    }

    /**
     * 生成缓存文件路径，内容 hash 作为 key 保证变更后失效
     */
    private getCachePath(filePath: string, code: string): string {
        const hash = this.simpleHash(code);
        const safeName = path.basename(filePath).replace(/[^a-zA-Z0-9.]/g, '_');
        return path.join(os.tmpdir(), '.perf-analyzer-cache', `${safeName}_${hash}.json`);
    }

    /** 简单字符串 hash（djb2） */
    private simpleHash(str: string): string {
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h) ^ str.charCodeAt(i);
        }
        return (h >>> 0).toString(36);
    }

    /**
     * 构建分析 prompt
     */
    private buildAnalysisPrompt(code: string, languageId: string): string {
        return `请分析以下 ${languageId} 代码的性能问题（内容已压缩/提取关键块）：

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
