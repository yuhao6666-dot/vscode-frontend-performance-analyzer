import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class MemoryLeakRule implements Rule {
    name = 'MemoryLeakRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检查事件监听器和定时器
        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;
            let methodName: string | undefined;

            // 支持两种调用方式：window.setInterval() 和 setInterval()
            if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
                methodName = callee.property.name;
            } else if (t.isIdentifier(callee)) {
                methodName = callee.name;
            }

            if (methodName) {
                // 检测 addEventListener 但缺少对应的 removeEventListener
                if (methodName === 'addEventListener') {
                    if (!this.hasCorrespondingRemoveListener(path, code)) {
                        issues.push({
                            type: IssueType.MemoryLeak,
                            severity: IssueSeverity.Warning,
                            message: '添加了事件监听器，但可能未在组件卸载时移除',
                            line: path.node.loc?.start.line || 0,
                            suggestion: '在组件卸载（如 useEffect 返回函数、componentWillUnmount 或 onUnmounted）中调用 removeEventListener',
                        });
                    }
                }

                // 检测 setInterval 但缺少 clearInterval
                if (methodName === 'setInterval') {
                    if (!this.hasCorrespondingClearInterval(path, code)) {
                        issues.push({
                            type: IssueType.MemoryLeak,
                            severity: IssueSeverity.Warning,
                            message: '使用了 setInterval，但可能未在组件卸载时清除',
                            line: path.node.loc?.start.line || 0,
                            suggestion: '保存 interval ID 并在组件卸载时调用 clearInterval',
                        });
                    }
                }

                // 检测 setTimeout 长时间延迟
                if (methodName === 'setTimeout') {
                    const delay = this.getTimeoutDelay(path.node);
                    if (delay && delay > 5000) {
                        issues.push({
                            type: IssueType.MemoryLeak,
                            severity: IssueSeverity.Information,
                            message: `setTimeout 延迟时间较长 (${delay}ms)，可能需要在组件卸载时清除`,
                            line: path.node.loc?.start.line || 0,
                            suggestion: '保存 timeout ID 并在组件卸载时调用 clearTimeout',
                        });
                    }
                }
            }
        }

        // 检查 React useEffect 缺少清理函数
        if (this.isUseEffectCall(path)) {
            if (!this.hasCleanupFunction(path as NodePath<t.CallExpression>)) {
                const hasSubscription = this.hasSubscriptionInEffect(path as NodePath<t.CallExpression>);
                if (hasSubscription) {
                    issues.push({
                        type: IssueType.MemoryLeak,
                        severity: IssueSeverity.Warning,
                        message: 'useEffect 中包含订阅操作，但缺少清理函数',
                        line: path.node.loc?.start.line || 0,
                        suggestion: '在 useEffect 中返回清理函数来取消订阅或移除监听器',
                    });
                }
            }
        }

        // 检查 Vue onMounted 缺少 onUnmounted
        if (this.isVueOnMountedCall(path)) {
            if (!this.hasCorrespondingOnUnmounted(path, code)) {
                const hasSubscription = this.hasSubscriptionInCallback(path);
                if (hasSubscription) {
                    issues.push({
                        type: IssueType.MemoryLeak,
                        severity: IssueSeverity.Warning,
                        message: 'onMounted 中包含订阅操作，但可能缺少 onUnmounted 清理',
                        line: path.node.loc?.start.line || 0,
                        suggestion: '在 onUnmounted 中清理事件监听器、定时器等资源',
                    });
                }
            }
        }

        return issues;
    }

    private hasCorrespondingRemoveListener(path: NodePath, code: string): boolean {
        // 简单检查：在同一作用域或父作用域中是否有 removeEventListener
        const scope = path.scope;
        let hasRemove = false;

        scope.traverse(scope.block, {
            CallExpression(innerPath) {
                const callee = innerPath.node.callee;
                if (
                    t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === 'removeEventListener'
                ) {
                    hasRemove = true;
                    innerPath.stop();
                }
            },
        });

        return hasRemove;
    }

    private hasCorrespondingClearInterval(path: NodePath, code: string): boolean {
        const scope = path.scope;
        let hasClear = false;

        scope.traverse(scope.block, {
            CallExpression(innerPath) {
                const callee = innerPath.node.callee;
                if (t.isIdentifier(callee) && callee.name === 'clearInterval') {
                    hasClear = true;
                    innerPath.stop();
                }
            },
        });

        return hasClear;
    }

    private hasCorrespondingOnUnmounted(path: NodePath, code: string): boolean {
        // 检查代码中是否有 onUnmounted 调用
        return code.includes('onUnmounted') || code.includes('onBeforeUnmount');
    }

    private getTimeoutDelay(node: t.CallExpression): number | null {
        if (node.arguments.length >= 2) {
            const delayArg = node.arguments[1];
            if (t.isNumericLiteral(delayArg)) {
                return delayArg.value;
            }
        }
        return null;
    }

    private isUseEffectCall(path: NodePath): boolean {
        return (
            t.isCallExpression(path.node) &&
            t.isIdentifier(path.node.callee) &&
            path.node.callee.name === 'useEffect'
        );
    }

    private isVueOnMountedCall(path: NodePath): boolean {
        return (
            t.isCallExpression(path.node) &&
            t.isIdentifier(path.node.callee) &&
            path.node.callee.name === 'onMounted'
        );
    }

    private hasCleanupFunction(path: NodePath<t.CallExpression>): boolean {
        if (path.node.arguments.length === 0) {
            return false;
        }

        const callback = path.node.arguments[0];
        if (!t.isArrowFunctionExpression(callback) && !t.isFunctionExpression(callback)) {
            return false;
        }

        // 检查函数体中是否有 return 语句返回函数
        let hasCleanup = false;

        if (t.isBlockStatement(callback.body)) {
            callback.body.body.forEach((statement) => {
                if (t.isReturnStatement(statement) && statement.argument) {
                    if (
                        t.isArrowFunctionExpression(statement.argument) ||
                        t.isFunctionExpression(statement.argument)
                    ) {
                        hasCleanup = true;
                    }
                }
            });
        }

        return hasCleanup;
    }

    private hasSubscriptionInEffect(path: NodePath<t.CallExpression>): boolean {
        return this.hasSubscriptionInCallback(path);
    }

    private hasSubscriptionInCallback(path: NodePath): boolean {
        let hasSubscription = false;

        path.traverse({
            CallExpression(innerPath) {
                const callee = innerPath.node.callee;

                if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
                    const methodName = callee.property.name;
                    if (
                        ['addEventListener', 'setInterval', 'setTimeout', 'subscribe', 'on'].includes(
                            methodName
                        )
                    ) {
                        hasSubscription = true;
                        innerPath.stop();
                    }
                }
            },
        });

        return hasSubscription;
    }
}
