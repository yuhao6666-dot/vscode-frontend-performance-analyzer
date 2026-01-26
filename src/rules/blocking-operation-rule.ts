import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class BlockingOperationRule implements Rule {
    name = 'BlockingOperationRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检查同步的文件操作（Node.js 环境）
        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;

            if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
                const methodName = callee.property.name;

                // 检测同步的 fs 操作
                if (methodName.endsWith('Sync')) {
                    issues.push({
                        type: IssueType.BlockingOperation,
                        severity: IssueSeverity.Warning,
                        message: `使用同步方法 ${methodName}，会阻塞主线程`,
                        line: path.node.loc?.start.line || 0,
                        suggestion: `使用异步版本替代，如 ${methodName.replace('Sync', '')}`,
                    });
                }
            }

            // 检测未使用防抖/节流的频繁调用
            if (this.isEventHandler(path)) {
                const handlerName = this.getHandlerEventType(path);
                const needsThrottle = ['scroll', 'resize', 'mousemove', 'touchmove'];

                if (handlerName && needsThrottle.includes(handlerName)) {
                    if (!this.hasThrottleOrDebounce(path)) {
                        issues.push({
                            type: IssueType.BlockingOperation,
                            severity: IssueSeverity.Warning,
                            message: `${handlerName} 事件处理器可能频繁触发，建议使用防抖或节流`,
                            line: path.node.loc?.start.line || 0,
                            suggestion: '使用 lodash.throttle、lodash.debounce 或自定义实现',
                        });
                    }
                }
            }
        }

        // 检测大量数据的同步处理
        if (t.isVariableDeclarator(path.node)) {
            if (t.isArrayExpression(path.node.init)) {
                const elementCount = path.node.init.elements.length;
                if (elementCount > 1000) {
                    issues.push({
                        type: IssueType.BlockingOperation,
                        severity: IssueSeverity.Information,
                        message: `数组包含 ${elementCount} 个元素，同步处理可能影响性能`,
                        line: path.node.loc?.start.line || 0,
                        suggestion: '考虑使用分片处理、虚拟滚动或 Web Worker',
                    });
                }
            }
        }

        // 检测复杂的正则表达式
        if (t.isRegExpLiteral(path.node)) {
            const pattern = path.node.pattern;
            if (this.isComplexRegex(pattern)) {
                issues.push({
                    type: IssueType.BlockingOperation,
                    severity: IssueSeverity.Information,
                    message: '复杂的正则表达式可能导致性能问题（ReDoS）',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '简化正则表达式或使用多个简单正则分步处理',
                });
            }
        }

        // 检测 JSON.parse/JSON.stringify 大数据
        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;

            if (
                t.isMemberExpression(callee) &&
                t.isIdentifier(callee.object) &&
                callee.object.name === 'JSON' &&
                t.isIdentifier(callee.property)
            ) {
                const methodName = callee.property.name;

                if (['parse', 'stringify'].includes(methodName)) {
                    issues.push({
                        type: IssueType.BlockingOperation,
                        severity: IssueSeverity.Hint,
                        message: `JSON.${methodName} 处理大数据时会阻塞主线程`,
                        line: path.node.loc?.start.line || 0,
                        suggestion: '对于大数据，考虑使用流式处理或 Web Worker',
                    });
                }
            }
        }

        return issues;
    }

    private isEventHandler(path: NodePath): boolean {
        const parent = path.parent;

        // 检查是否是 addEventListener 的回调
        if (
            t.isCallExpression(parent) &&
            t.isMemberExpression(parent.callee) &&
            t.isIdentifier(parent.callee.property) &&
            parent.callee.property.name === 'addEventListener'
        ) {
            return true;
        }

        // 检查是否是 JSX 事件处理器
        if (t.isJSXAttribute(parent) && t.isJSXIdentifier(parent.name)) {
            return parent.name.name.startsWith('on');
        }

        return false;
    }

    private getHandlerEventType(path: NodePath): string | null {
        const parent = path.parent;

        if (t.isCallExpression(parent) && parent.arguments.length > 0) {
            const firstArg = parent.arguments[0];
            if (t.isStringLiteral(firstArg)) {
                return firstArg.value;
            }
        }

        if (t.isJSXAttribute(parent) && t.isJSXIdentifier(parent.name)) {
            const eventName = parent.name.name;
            if (eventName.startsWith('on')) {
                return eventName.substring(2).toLowerCase();
            }
        }

        return null;
    }

    private hasThrottleOrDebounce(path: NodePath): boolean {
        let hasOptimization = false;

        // 检查父级调用链中是否有 throttle 或 debounce
        let currentPath: NodePath | null = path;
        while (currentPath) {
            if (t.isCallExpression(currentPath.node)) {
                const callee = currentPath.node.callee;
                if (t.isIdentifier(callee)) {
                    if (['throttle', 'debounce'].includes(callee.name)) {
                        hasOptimization = true;
                        break;
                    }
                }
            }
            currentPath = currentPath.parentPath;
        }

        return hasOptimization;
    }

    private isComplexRegex(pattern: string): boolean {
        // 简单启发式：检测可能导致回溯的模式
        const complexPatterns = [
            /(\(.*\)\+)+/, // 嵌套捕获组加量词
            /(\*.*\*)+/, // 多个贪婪量词
            /(.+)+/, // 嵌套加号
            /(.*).*/, // 多个贪婪星号
        ];

        return complexPatterns.some((p) => p.test(pattern));
    }
}
