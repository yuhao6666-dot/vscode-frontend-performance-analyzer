import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class LoopRule implements Rule {
    name = 'LoopRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检查循环语句
        if (
            t.isForStatement(path.node) ||
            t.isWhileStatement(path.node) ||
            t.isDoWhileStatement(path.node) ||
            t.isForInStatement(path.node) ||
            t.isForOfStatement(path.node)
        ) {
            // 检查嵌套循环
            const nestedLevel = this.getLoopNestingLevel(path);
            if (nestedLevel >= 1) {
                issues.push({
                    type: IssueType.NestedLoop,
                    severity: nestedLevel >= 2 ? IssueSeverity.Error : IssueSeverity.Warning,
                    message: `检测到 ${nestedLevel + 1} 层嵌套循环，可能严重影响性能`,
                    line: path.node.loc?.start.line || 0,
                    suggestion: '考虑使用 Map、Set 或其他数据结构优化查找操作，或将复杂逻辑提取到单独的函数',
                });
            }

            // 检查循环中的 DOM 操作
            if (this.hasDomOperationInLoop(path)) {
                issues.push({
                    type: IssueType.FrequentDomManipulation,
                    severity: IssueSeverity.Warning,
                    message: '循环中存在 DOM 操作，会导致频繁的重排重绘',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '将 DOM 操作移到循环外，或使用 DocumentFragment 批量操作',
                });
            }

            // 检查循环中的异步操作
            if (this.hasAsyncOperationInLoop(path)) {
                issues.push({
                    type: IssueType.BlockingOperation,
                    severity: IssueSeverity.Warning,
                    message: '循环中存在异步操作，可能导致性能问题',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '考虑使用 Promise.all() 并行处理，或使用批处理策略',
                });
            }
        }

        // 检查数组方法链式调用
        if (t.isCallExpression(path.node)) {
            const chainLength = this.getArrayMethodChainLength(path as NodePath<t.CallExpression>);
            if (chainLength >= 3) {
                issues.push({
                    type: IssueType.LargeLoop,
                    severity: IssueSeverity.Information,
                    message: `检测到 ${chainLength} 次链式数组操作，可能多次遍历数组`,
                    line: path.node.loc?.start.line || 0,
                    suggestion: '考虑使用 reduce 合并多次遍历，或在单次循环中完成所有操作',
                });
            }
        }

        return issues;
    }

    private getLoopNestingLevel(path: NodePath): number {
        let level = 0;
        let currentPath: NodePath | null = path.parentPath;

        while (currentPath) {
            if (
                t.isForStatement(currentPath.node) ||
                t.isWhileStatement(currentPath.node) ||
                t.isDoWhileStatement(currentPath.node) ||
                t.isForInStatement(currentPath.node) ||
                t.isForOfStatement(currentPath.node)
            ) {
                level++;
            }
            currentPath = currentPath.parentPath;
        }

        return level;
    }

    private hasDomOperationInLoop(path: NodePath): boolean {
        let hasDom = false;

        path.traverse({
            CallExpression(innerPath) {
                const callee = innerPath.node.callee;

                // 检查常见的 DOM 操作方法
                if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
                    const methodName = callee.property.name;
                    const domMethods = [
                        'querySelector',
                        'querySelectorAll',
                        'getElementById',
                        'getElementsByClassName',
                        'getElementsByTagName',
                        'appendChild',
                        'removeChild',
                        'insertBefore',
                        'replaceChild',
                        'innerHTML',
                        'innerText',
                        'textContent',
                    ];

                    if (domMethods.includes(methodName)) {
                        hasDom = true;
                        innerPath.stop();
                    }
                }
            },
        });

        return hasDom;
    }

    private hasAsyncOperationInLoop(path: NodePath): boolean {
        let hasAsync = false;

        path.traverse({
            CallExpression(innerPath) {
                const callee = innerPath.node.callee;

                // 检查 fetch、axios 等异步操作
                if (t.isIdentifier(callee)) {
                    if (['fetch', 'axios'].includes(callee.name)) {
                        hasAsync = true;
                        innerPath.stop();
                    }
                }
            },
            AwaitExpression() {
                hasAsync = true;
            },
        });

        return hasAsync;
    }

    private getArrayMethodChainLength(path: NodePath<t.CallExpression>): number {
        let length = 0;
        let currentNode: t.Node = path.node;

        while (t.isCallExpression(currentNode)) {
            const callee: t.Expression | t.V8IntrinsicIdentifier = currentNode.callee;
            if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
                const methodName = callee.property.name;
                const arrayMethods = ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every'];

                if (arrayMethods.includes(methodName)) {
                    length++;
                    currentNode = callee.object;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        return length;
    }
}
