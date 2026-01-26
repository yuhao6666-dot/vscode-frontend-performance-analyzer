import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class ReactHooksRule implements Rule {
    name = 'ReactHooksRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检测 useEffect 缺少依赖
        if (
            t.isCallExpression(path.node) &&
            t.isIdentifier(path.node.callee) &&
            path.node.callee.name === 'useEffect'
        ) {
            const args = path.node.arguments;
            if (args.length >=2 && t.isArrayExpression(args[1])) {
                const deps = args[1].elements;
                
                // 空依赖数组的警告
                if (deps.length === 0) {
                    issues.push({
                        type: IssueType.InefficientRendering,
                        severity: IssueSeverity.Information,
                        message: 'useEffect 使用空依赖数组，只会在组件挂载时执行一次',
                        line: path.node.loc?.start.line || 0,
                        suggestion: '确认这是期望的行为。如果 effect 内使用了 props 或 state，应将它们添加到依赖数组中',
                    });
                }
            } else if (args.length === 1) {
                // 缺少依赖数组
                issues.push({
                    type: IssueType.InefficientRendering,
                    severity: IssueSeverity.Warning,
                    message: 'useEffect 缺少依赖数组，会在每次渲染时执行',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '添加依赖数组以控制 effect 的执行时机，避免不必要的重复执行',
                });
            }
        }

        // 检测 useCallback 缺少依赖
        if (
            t.isCallExpression(path.node) &&
            t.isIdentifier(path.node.callee) &&
            path.node.callee.name === 'useCallback'
        ) {
            const args = path.node.arguments;
            if (args.length < 2) {
                issues.push({
                    type: IssueType.InefficientRendering,
                    severity: IssueSeverity.Warning,
                    message: 'useCallback 缺少依赖数组',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '添加依赖数组以正确缓存回调函数',
                });
            }
        }

        // 检测 useMemo 缺少依赖
        if (
            t.isCallExpression(path.node) &&
            t.isIdentifier(path.node.callee) &&
            path.node.callee.name === 'useMemo'
        ) {
            const args = path.node.arguments;
            if (args.length < 2) {
                issues.push({
                    type: IssueType.InefficientRendering,
                    severity: IssueSeverity.Warning,
                    message: 'useMemo 缺少依赖数组',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '添加依赖数组以正确缓存计算结果',
                });
            }
        }

        // 检测在循环中使用 Hooks
        if (
            t.isCallExpression(path.node) &&
            t.isIdentifier(path.node.callee) &&
            /^use[A-Z]/.test(path.node.callee.name)
        ) {
            let parent: NodePath | null = path.parentPath;
            while (parent) {
                if (
                    t.isForStatement(parent.node) ||
                    t.isWhileStatement(parent.node) ||
                    t.isDoWhileStatement(parent.node) ||
                    (t.isCallExpression(parent.node) &&
                        t.isMemberExpression(parent.node.callee) &&
                        t.isIdentifier(parent.node.callee.property) &&
                        ['forEach', 'map', 'filter', 'reduce'].includes(parent.node.callee.property.name))
                ) {
                    issues.push({
                        type: IssueType.InefficientRendering,
                        severity: IssueSeverity.Error,
                        message: `不能在循环中调用 Hook: ${path.node.callee.name}`,
                        line: path.node.loc?.start.line || 0,
                        suggestion: 'React Hooks 必须在组件的顶层调用，不能在循环、条件或嵌套函数中调用',
                    });
                    break;
                }
                parent = parent.parentPath;
            }
        }

        return issues;
    }
}
