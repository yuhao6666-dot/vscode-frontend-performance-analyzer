import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class NetworkRequestRule implements Rule {
    name = 'NetworkRequestRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检测循环中的网络请求
        if (
            t.isForStatement(path.node) ||
            t.isWhileStatement(path.node) ||
            t.isDoWhileStatement(path.node)
        ) {
            path.traverse({
                CallExpression(innerPath) {
                    // 检测 fetch 调用
                    if (t.isIdentifier(innerPath.node.callee) && innerPath.node.callee.name === 'fetch') {
                        issues.push({
                            type: IssueType.BlockingOperation,
                            severity: IssueSeverity.Error,
                            message: '在循环中发起网络请求，严重影响性能',
                            line: innerPath.node.loc?.start.line || 0,
                            suggestion: '将请求收集起来使用 Promise.all() 批量发送，或考虑使用批量 API',
                        });
                    }

                    // 检测 axios 调用
                    if (
                        t.isMemberExpression(innerPath.node.callee) &&
                        t.isIdentifier(innerPath.node.callee.object) &&
                        innerPath.node.callee.object.name === 'axios'
                    ) {
                        issues.push({
                            type: IssueType.BlockingOperation,
                            severity: IssueSeverity.Error,
                            message: '在循环中发起网络请求，严重影响性能',
                            line: innerPath.node.loc?.start.line || 0,
                            suggestion: '使用 axios.all() 或 Promise.all() 批量发送请求',
                        });
                    }

                    // 检测 $.ajax 调用
                    if (
                        t.isMemberExpression(innerPath.node.callee) &&
                        t.isIdentifier(innerPath.node.callee.object) &&
                        innerPath.node.callee.object.name === '$' &&
                        t.isIdentifier(innerPath.node.callee.property) &&
                        (innerPath.node.callee.property.name === 'ajax' || innerPath.node.callee.property.name === 'get' || innerPath.node.callee.property.name === 'post')
                    ) {
                        issues.push({
                            type: IssueType.BlockingOperation,
                            severity: IssueSeverity.Error,
                            message: '在循环中发起网络请求，严重影响性能',
                            line: innerPath.node.loc?.start.line || 0,
                            suggestion: '将请求收集起来批量发送，或使用批量 API',
                        });
                    }
                },
            });
        }

        // 检测未设置超时的请求
        if (t.isCallExpression(path.node) && t.isIdentifier(path.node.callee) && path.node.callee.name === 'fetch') {
            const args = path.node.arguments;
            let hasTimeout = false;

            if (args.length >= 2 && t.isObjectExpression(args[1])) {
                const options = args[1];
                hasTimeout = options.properties.some(
                    (prop) =>
                        t.isObjectProperty(prop) &&
                        t.isIdentifier(prop.key) &&
                        (prop.key.name === 'timeout' || prop.key.name === 'signal')
                );
            }

            if (!hasTimeout) {
                issues.push({
                    type: IssueType.BlockingOperation,
                    severity: IssueSeverity.Information,
                    message: 'fetch 请求未设置超时，可能导致长时间等待',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '使用 AbortController 设置请求超时，提升用户体验',
                });
            }
        }

        // 检测在 render 或组件函数中直接发起请求
        if (
            (t.isFunctionDeclaration(path.node) || t.isFunctionExpression(path.node) || t.isArrowFunctionExpression(path.node)) &&
            t.isBlockStatement(path.node.body)
        ) {
            const functionName = t.isFunctionDeclaration(path.node) && path.node.id ? path.node.id.name : '';

            // 检测函数名是否为组件（大写开头）
            if (functionName && /^[A-Z]/.test(functionName)) {
                path.traverse({
                    CallExpression(innerPath) {
                        if (
                            (t.isIdentifier(innerPath.node.callee) && innerPath.node.callee.name === 'fetch') ||
                            (t.isMemberExpression(innerPath.node.callee) &&
                                t.isIdentifier(innerPath.node.callee.object) &&
                                (innerPath.node.callee.object.name === 'axios' || innerPath.node.callee.object.name === '$'))
                        ) {
                            // 检查是否在 useEffect 内
                            let inUseEffect = false;
                            let parent: NodePath | null = innerPath.parentPath;
                            while (parent) {
                                if (
                                    t.isCallExpression(parent.node) &&
                                    t.isIdentifier(parent.node.callee) &&
                                    parent.node.callee.name === 'useEffect'
                                ) {
                                    inUseEffect = true;
                                    break;
                                }
                                parent = parent.parentPath;
                            }

                            if (!inUseEffect) {
                                issues.push({
                                    type: IssueType.InefficientRendering,
                                    severity: IssueSeverity.Warning,
                                    message: '在组件函数体中直接发起网络请求',
                                    line: innerPath.node.loc?.start.line || 0,
                                    suggestion: '将网络请求移到 useEffect 或事件处理函数中，避免每次渲染都发起请求',
                                });
                            }
                        }
                    },
                });
            }
        }

        return issues;
    }
}
