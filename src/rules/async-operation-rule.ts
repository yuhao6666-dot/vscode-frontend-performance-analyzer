import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class AsyncOperationRule implements Rule {
    name = 'AsyncOperationRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检测串行的 await 调用（应该使用 Promise.all）
        if (t.isFunctionDeclaration(path.node) || t.isFunctionExpression(path.node) || t.isArrowFunctionExpression(path.node)) {
            if (path.node.async) {
                const awaitStatements: any[] = [];
                path.traverse({
                    AwaitExpression(awaitPath) {
                        awaitStatements.push(awaitPath.node);
                    },
                });

                // 检测连续的 await
                if (awaitStatements.length >= 2) {
                    const firstAwait = awaitStatements[0];
                    issues.push({
                        type: IssueType.BlockingOperation,
                        severity: IssueSeverity.Information,
                        message: `函数中有 ${awaitStatements.length} 个 await 表达式，考虑是否可以并行执行`,
                        line: firstAwait.loc?.start.line || 0,
                        suggestion: '如果这些异步操作相互独立，使用 Promise.all() 或 Promise.allSettled() 并行执行可以提升性能',
                    });
                }
            }
        }

        // 检测未处理的 Promise rejection
        if (
            t.isCallExpression(path.node) &&
            t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.property) &&
            path.node.callee.property.name === 'then'
        ) {
            // 检查是否有 .catch()
            let parent: NodePath | null = path.parentPath;
            let hasCatch = false;

            if (parent && t.isMemberExpression(parent.node)) {
                const grandParent = parent.parentPath;
                if (
                    grandParent &&
                    t.isCallExpression(grandParent.node) &&
                    t.isMemberExpression(grandParent.node.callee) &&
                    t.isIdentifier(grandParent.node.callee.property) &&
                    grandParent.node.callee.property.name === 'catch'
                ) {
                    hasCatch = true;
                }
            }

            if (!hasCatch && path.node.arguments.length === 1) {
                issues.push({
                    type: IssueType.BlockingOperation,
                    severity: IssueSeverity.Information,
                    message: 'Promise 链缺少 .catch() 错误处理',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '添加 .catch() 处理可能的错误，避免未捕获的 Promise rejection',
                });
            }
        }

        // 检测在循环中创建 Promise
        if (
            (t.isForStatement(path.node) ||
                t.isWhileStatement(path.node) ||
                t.isDoWhileStatement(path.node)) &&
            t.isBlockStatement(path.node.body)
        ) {
            path.traverse({
                NewExpression(innerPath) {
                    if (t.isIdentifier(innerPath.node.callee) && innerPath.node.callee.name === 'Promise') {
                        issues.push({
                            type: IssueType.BlockingOperation,
                            severity: IssueSeverity.Warning,
                            message: '在循环中创建 Promise，可能导致性能问题',
                            line: innerPath.node.loc?.start.line || 0,
                            suggestion: '考虑将 Promise 创建移到循环外，或使用 Promise.all() 批量处理',
                        });
                    }
                },
            });
        }

        return issues;
    }
}
