import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parse as parseVue } from '@vue/compiler-sfc';
import { PerformanceIssue, IssueType, IssueSeverity } from './types';
import { rules } from './rules';

export class PerformanceAnalyzer {
    async analyze(
        code: string,
        languageId: string,
        uri: vscode.Uri
    ): Promise<PerformanceIssue[]> {
        const issues: PerformanceIssue[] = [];

        try {
            let scriptCode = code;
            let offset = 0;

            // 处理 Vue 文件
            if (languageId === 'vue') {
                const result = this.extractScriptFromVue(code);
                scriptCode = result.script;
                offset = result.offset;
            }

            // 解析代码为 AST
            const ast = parse(scriptCode, {
                sourceType: 'module',
                plugins: [
                    'typescript',
                    'jsx',
                    'decorators-legacy',
                    'classProperties',
                    'optionalChaining',
                    'nullishCoalescingOperator',
                ],
                errorRecovery: true,
            });

            // 遍历 AST 并应用规则
            traverse(ast, {
                enter: (path) => {
                    // 应用所有检测规则
                    for (const rule of rules) {
                        const ruleIssues = rule.check(path, code);
                        if (ruleIssues.length > 0) {
                            issues.push(
                                ...ruleIssues.map((issue) => ({
                                    ...issue,
                                    line: issue.line + offset,
                                }))
                            );
                        }
                    }
                },
            });

            // 额外的文件级检测
            const fileIssues = this.checkFileLevel(code, languageId);
            issues.push(...fileIssues);
        } catch (error) {
            console.error('代码解析失败:', error);
        }

        return this.filterAndSortIssues(issues);
    }

    private extractScriptFromVue(code: string): { script: string; offset: number } {
        try {
            const { descriptor } = parseVue(code);
            if (descriptor.script || descriptor.scriptSetup) {
                const script = descriptor.scriptSetup || descriptor.script;
                if (script) {
                    const lines = code.substring(0, script.loc.start.offset).split('\n');
                    return {
                        script: script.content,
                        offset: lines.length - 1,
                    };
                }
            }
        } catch (error) {
            console.error('Vue 文件解析失败:', error);
        }

        return { script: code, offset: 0 };
    }

    private checkFileLevel(code: string, languageId: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检查文件大小
        const lines = code.split('\n');
        if (lines.length > 1000) {
            issues.push({
                type: IssueType.LargeFile,
                severity: IssueSeverity.Warning,
                message: `文件过大 (${lines.length} 行)，建议拆分为多个模块`,
                line: 0,
                suggestion: '将相关功能提取到独立的模块中，提高代码可维护性和加载性能',
            });
        }

        // 检查未压缩的大型字符串或数据
        const largeStringRegex = /['"`]([^'"`]{5000,})['"`]/g;
        let match;
        while ((match = largeStringRegex.exec(code)) !== null) {
            const line = code.substring(0, match.index).split('\n').length - 1;
            issues.push({
                type: IssueType.LargeData,
                severity: IssueSeverity.Warning,
                message: '检测到大型内联字符串，可能影响打包体积',
                line,
                suggestion: '考虑将大型数据移到独立的 JSON 文件或使用动态导入',
            });
        }

        // 检查图片资源导入
        const imageImportRegex = /import\s+.*\s+from\s+['"].*\.(png|jpg|jpeg|gif|svg)['"];?/gi;
        while ((match = imageImportRegex.exec(code)) !== null) {
            const line = code.substring(0, match.index).split('\n').length - 1;
            issues.push({
                type: IssueType.UnoptimizedImage,
                severity: IssueSeverity.Information,
                message: '直接导入图片资源，注意优化图片大小',
                line,
                suggestion: '使用图片压缩工具，或考虑使用 CDN、懒加载等优化策略',
            });
        }

        // 检查大型库的完整导入
        const fullImportRegex = /import\s+\*\s+as\s+\w+\s+from\s+['"](@?[\w\-/]+)['"]/g;
        while ((match = fullImportRegex.exec(code)) !== null) {
            const packageName = match[1];
            const knownLargePackages = [
                { name: 'lodash', suggestion: "使用 lodash-es 并按需导入，或使用 import { debounce } from 'lodash/debounce'" },
                { name: 'moment', suggestion: "考虑使用更轻量的 day.js 或 date-fns，或按需导入 moment/locale" },
                { name: 'antd', suggestion: "使用 babel-plugin-import 实现按需导入，或 import { Button } from 'antd/es/button'" },
                { name: 'element-ui', suggestion: "使用 babel-plugin-component 实现按需导入" },
                { name: 'element-plus', suggestion: "使用自动导入插件或按需导入组件" },
                { name: '@ant-design/icons', suggestion: "使用具名导入而不是完整导入所有图标" },
                { name: 'rxjs', suggestion: "使用具名导入或导入特定操作符路径" },
            ];

            const largePackage = knownLargePackages.find((pkg) => packageName.includes(pkg.name));
            if (largePackage) {
                const line = code.substring(0, match.index).split('\n').length - 1;
                issues.push({
                    type: IssueType.LargeBundle,
                    severity: IssueSeverity.Warning,
                    message: `完整导入 ${packageName}，会显著增加打包体积`,
                    line,
                    suggestion: largePackage.suggestion,
                });
            }
        }

        // 检测重复的包导入
        const importMap = new Map<string, number[]>();
        const importRegex = /import\s+.*\s+from\s+['"](@?[\w\-/]+)['"]/g;
        while ((match = importRegex.exec(code)) !== null) {
            const packageName = match[1];
            const line = code.substring(0, match.index).split('\n').length - 1;
            if (!importMap.has(packageName)) {
                importMap.set(packageName, []);
            }
            importMap.get(packageName)!.push(line);
        }

        // 报告重复导入
        importMap.forEach((lines, packageName) => {
            if (lines.length > 1) {
                issues.push({
                    type: IssueType.LargeBundle,
                    severity: IssueSeverity.Information,
                    message: `包 "${packageName}" 被导入了 ${lines.length} 次`,
                    line: lines[0],
                    suggestion: '合并相同包的导入语句，减少代码冗余',
                });
            }
        });

        // 检测未使用 tree-shaking 的导入方式
        const sideEffectImportRegex = /import\s+['"](@?[\w\-/]+)['"]/g;
        while ((match = sideEffectImportRegex.exec(code)) !== null) {
            const packageName = match[1];
            // 排除样式文件等合理的副作用导入
            if (!packageName.includes('.css') && !packageName.includes('.scss') && !packageName.includes('.less')) {
                const line = code.substring(0, match.index).split('\n').length - 1;
                issues.push({
                    type: IssueType.LargeBundle,
                    severity: IssueSeverity.Information,
                    message: `导入 "${packageName}" 时未指定具体内容`,
                    line,
                    suggestion: '如果只需要副作用（如注册全局组件），这是合理的。否则应使用具名导入以支持 tree-shaking',
                });
            }
        }

        return issues;
    }

    private filterAndSortIssues(issues: PerformanceIssue[]): PerformanceIssue[] {
        const config = vscode.workspace.getConfiguration('performanceAnalyzer');
        const enabledRules = config.get<Record<string, boolean>>('rules', {});

        // 过滤禁用的规则
        const filtered = issues.filter((issue) => {
            const ruleName = this.getRuleName(issue.type);
            return enabledRules[ruleName] !== false;
        });

        // 按行号和严重程度排序
        return filtered.sort((a, b) => {
            if (a.line !== b.line) {
                return a.line - b.line;
            }
            return this.severityToNumber(a.severity) - this.severityToNumber(b.severity);
        });
    }

    private getRuleName(type: IssueType): string {
        const mapping: Record<IssueType, string> = {
            [IssueType.LargeLoop]: 'largeLoop',
            [IssueType.NestedLoop]: 'nestedLoop',
            [IssueType.FrequentDomManipulation]: 'frequentDomManipulation',
            [IssueType.InefficientRendering]: 'inefficientRendering',
            [IssueType.MemoryLeak]: 'memoryLeak',
            [IssueType.BlockingOperation]: 'blockingOperation',
            [IssueType.UnoptimizedImage]: 'unoptimizedImage',
            [IssueType.LargeBundle]: 'largeBundle',
            [IssueType.LargeData]: 'largeBundle',
            [IssueType.LargeFile]: 'largeBundle',
        };
        return mapping[type] || 'unknown';
    }

    private severityToNumber(severity: IssueSeverity): number {
        const mapping: Record<IssueSeverity, number> = {
            [IssueSeverity.Error]: 0,
            [IssueSeverity.Warning]: 1,
            [IssueSeverity.Information]: 2,
            [IssueSeverity.Hint]: 3,
        };
        return mapping[severity] || 999;
    }
}
