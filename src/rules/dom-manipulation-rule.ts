import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class DomManipulationRule implements Rule {
    name = 'DomManipulationRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;

            // 检查频繁的 DOM 查询
            if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
                const methodName = callee.property.name;

                // querySelector 等查询方法
                if (['querySelector', 'querySelectorAll', 'getElementById'].includes(methodName)) {
                    // 检查是否在循环中
                    if (this.isInLoop(path)) {
                        issues.push({
                            type: IssueType.FrequentDomManipulation,
                            severity: IssueSeverity.Warning,
                            message: `循环中使用 ${methodName}，建议缓存 DOM 引用`,
                            line: path.node.loc?.start.line || 0,
                            suggestion: '在循环外查询一次 DOM 元素并缓存结果',
                        });
                    }
                }

                // 检查修改样式的操作
                if (['style', 'classList'].includes(methodName)) {
                    if (this.isInLoop(path)) {
                        issues.push({
                            type: IssueType.FrequentDomManipulation,
                            severity: IssueSeverity.Warning,
                            message: '循环中频繁修改样式，可能导致多次重排重绘',
                            line: path.node.loc?.start.line || 0,
                            suggestion: '使用 CSS 类切换代替直接修改样式，或使用 CSS 变量批量更新',
                        });
                    }
                }
            }
        }

        // 检查直接操作 innerHTML
        if (t.isMemberExpression(path.node) && t.isIdentifier(path.node.property)) {
            if (['innerHTML', 'outerHTML'].includes(path.node.property.name)) {
                const parent = path.parent;
                if (t.isAssignmentExpression(parent)) {
                    issues.push({
                        type: IssueType.FrequentDomManipulation,
                        severity: IssueSeverity.Information,
                        message: '使用 innerHTML 可能存在 XSS 风险且性能较差',
                        line: path.node.loc?.start.line || 0,
                        suggestion: '考虑使用 textContent 或模板引擎，或使用 DocumentFragment',
                    });
                }
            }
        }

        return issues;
    }

    private isInLoop(path: NodePath): boolean {
        let currentPath: NodePath | null = path.parentPath;

        while (currentPath) {
            if (
                t.isForStatement(currentPath.node) ||
                t.isWhileStatement(currentPath.node) ||
                t.isDoWhileStatement(currentPath.node) ||
                t.isForInStatement(currentPath.node) ||
                t.isForOfStatement(currentPath.node)
            ) {
                return true;
            }
            currentPath = currentPath.parentPath;
        }

        return false;
    }
}
