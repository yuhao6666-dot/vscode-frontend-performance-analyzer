import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Rule } from './index';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

export class RenderingRule implements Rule {
    name = 'RenderingRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检查 React 组件中的问题
        if (this.isReactComponent(path)) {
            // 检查在 render 中创建新对象/函数
            if (this.isInRenderMethod(path)) {
                if (t.isObjectExpression(path.node) || t.isArrowFunctionExpression(path.node)) {
                    // 检查是否作为 prop 传递
                    if (this.isPassedAsProp(path)) {
                        issues.push({
                            type: IssueType.InefficientRendering,
                            severity: IssueSeverity.Warning,
                            message: '在 render 中创建新对象/函数作为 prop，会导致子组件不必要的重渲染',
                            line: path.node.loc?.start.line || 0,
                            suggestion: '将对象/函数提取到组件外或使用 useMemo/useCallback',
                        });
                    }
                }
            }
        }

        // 检查 Vue 组件中的问题
        if (this.isVueComponent(path)) {
            // 检查 data 中返回新对象
            if (this.isInVueData(path)) {
                if (t.isObjectExpression(path.node)) {
                    const hasNewObject = this.hasNestedNewObject(path);
                    if (hasNewObject) {
                        issues.push({
                            type: IssueType.InefficientRendering,
                            severity: IssueSeverity.Information,
                            message: 'data 中包含复杂对象，考虑是否需要响应式',
                            line: path.node.loc?.start.line || 0,
                            suggestion: '对于不需要响应式的数据，可以使用 Object.freeze() 或放在 setup 外',
                        });
                    }
                }
            }
        }

        // 检查列表渲染缺少 key
        if (t.isJSXElement(path.node)) {
            const mapCall = this.findParentMapCall(path);
            if (mapCall && !this.hasKeyProp(path as NodePath<t.JSXElement>)) {
                issues.push({
                    type: IssueType.InefficientRendering,
                    severity: IssueSeverity.Warning,
                    message: '列表渲染缺少 key 属性，可能导致渲染性能问题',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '为列表项添加唯一的 key 属性',
                });
            }
        }

        return issues;
    }

    private isReactComponent(path: NodePath): boolean {
        let currentPath: NodePath | null = path;

        while (currentPath) {
            if (
                t.isFunctionDeclaration(currentPath.node) ||
                t.isArrowFunctionExpression(currentPath.node) ||
                t.isClassDeclaration(currentPath.node)
            ) {
                const name =
                    'id' in currentPath.node && currentPath.node.id
                        ? currentPath.node.id.name
                        : undefined;
                if (name && /^[A-Z]/.test(name)) {
                    return true;
                }
            }
            currentPath = currentPath.parentPath;
        }

        return false;
    }

    private isVueComponent(path: NodePath): boolean {
        let currentPath: NodePath | null = path;

        while (currentPath) {
            if (t.isObjectExpression(currentPath.node)) {
                const properties = currentPath.node.properties;
                const hasVueLifecycle = properties.some(
                    (prop) =>
                        t.isObjectProperty(prop) &&
                        t.isIdentifier(prop.key) &&
                        ['setup', 'data', 'computed', 'methods', 'mounted', 'created'].includes(
                            prop.key.name
                        )
                );
                if (hasVueLifecycle) {
                    return true;
                }
            }
            currentPath = currentPath.parentPath;
        }

        return false;
    }

    private isInRenderMethod(path: NodePath): boolean {
        let currentPath: NodePath | null = path.parentPath;

        while (currentPath) {
            if (t.isClassMethod(currentPath.node) && t.isIdentifier(currentPath.node.key)) {
                if (currentPath.node.key.name === 'render') {
                    return true;
                }
            }

            if (t.isArrowFunctionExpression(currentPath.node) || t.isFunctionExpression(currentPath.node)) {
                return true;
            }

            currentPath = currentPath.parentPath;
        }

        return false;
    }

    private isInVueData(path: NodePath): boolean {
        let currentPath: NodePath | null = path.parentPath;

        while (currentPath) {
            if (t.isObjectMethod(currentPath.node) && t.isIdentifier(currentPath.node.key)) {
                if (currentPath.node.key.name === 'data') {
                    return true;
                }
            }
            currentPath = currentPath.parentPath;
        }

        return false;
    }

    private isPassedAsProp(path: NodePath): boolean {
        const parent = path.parent;
        return t.isJSXAttribute(parent) || (t.isObjectProperty(parent) && this.isInJSXAttributes(path));
    }

    private isInJSXAttributes(path: NodePath): boolean {
        let currentPath: NodePath | null = path.parentPath;

        while (currentPath) {
            if (t.isJSXElement(currentPath.node)) {
                return true;
            }
            currentPath = currentPath.parentPath;
        }

        return false;
    }

    private hasNestedNewObject(path: NodePath): boolean {
        let hasNested = false;

        path.traverse({
            ObjectExpression(innerPath) {
                if (innerPath !== path) {
                    hasNested = true;
                    innerPath.stop();
                }
            },
            ArrayExpression() {
                hasNested = true;
            },
        });

        return hasNested;
    }

    private findParentMapCall(path: NodePath): NodePath | null {
        let currentPath: NodePath | null = path.parentPath;

        while (currentPath) {
            if (
                t.isCallExpression(currentPath.node) &&
                t.isMemberExpression(currentPath.node.callee) &&
                t.isIdentifier(currentPath.node.callee.property) &&
                currentPath.node.callee.property.name === 'map'
            ) {
                return currentPath;
            }
            currentPath = currentPath.parentPath;
        }

        return null;
    }

    private hasKeyProp(path: NodePath<t.JSXElement>): boolean {
        const openingElement = path.node.openingElement;
        return openingElement.attributes.some(
            (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
        );
    }
}
