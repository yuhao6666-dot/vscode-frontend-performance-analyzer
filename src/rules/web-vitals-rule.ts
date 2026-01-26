import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { PerformanceIssue, IssueType, IssueSeverity } from '../types';
import { Rule } from './index';

/**
 * Web Vitals 性能规则
 * 检测影响 Core Web Vitals 指标的代码模式
 * - INP (Interaction to Next Paint): 交互响应时间
 * - FCP (First Contentful Paint): 首次内容绘制
 * - LCP (Largest Contentful Paint): 最大内容绘制
 * - CLS (Cumulative Layout Shift): 累积布局偏移
 * - TTI (Time to Interactive): 可交互时间
 */
export class WebVitalsRule implements Rule {
    name = 'WebVitalsRule';

    check(path: NodePath, code: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 检测影响 INP 的问题
        issues.push(...this.checkINPIssues(path));

        // 检测影响 FCP 的问题
        issues.push(...this.checkFCPIssues(path));

        // 检测影响 LCP 的问题
        issues.push(...this.checkLCPIssues(path));

        // 检测影响 CLS 的问题
        issues.push(...this.checkCLSIssues(path));

        return issues;
    }

    /**
     * 检测影响 INP (Interaction to Next Paint) 的问题
     * INP 衡量页面响应用户交互的速度
     */
    private checkINPIssues(path: NodePath): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 1. 检测重量级事件处理器（可能阻塞交互响应）
        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;

            // addEventListener with heavy handler
            if (
                t.isMemberExpression(callee) &&
                t.isIdentifier(callee.property) &&
                callee.property.name === 'addEventListener'
            ) {
                const args = path.node.arguments;
                if (args.length >= 2) {
                    const eventType = args[0];
                    const handler = args[1];

                    // 检查高频事件（scroll, mousemove, touchmove）
                    if (
                        t.isStringLiteral(eventType) &&
                        ['scroll', 'mousemove', 'touchmove', 'pointermove', 'wheel'].includes(
                            eventType.value
                        )
                    ) {
                        // 检查是否使用了防抖/节流
                        const hasThrottle = this.checkForThrottleOrDebounce(handler);
                        if (!hasThrottle) {
                            issues.push({
                                type: IssueType.BlockingOperation,
                                severity: IssueSeverity.Warning,
                                message: `影响 INP: 高频事件 "${eventType.value}" 未使用防抖/节流，可能导致交互延迟`,
                                line: path.node.loc?.start.line || 0,
                                suggestion:
                                    '使用 debounce 或 throttle 包裹事件处理器，减少执行频率。建议使用 requestAnimationFrame 或 passive: true 选项',
                            });
                        }
                    }
                }
            }

            // 检测 onClick 等交互事件中的重操作
            if (
                t.isMemberExpression(callee) &&
                t.isIdentifier(callee.property) &&
                callee.property.name === 'onClick'
            ) {
                // 检查是否有同步的大量计算
                path.traverse({
                    ForStatement(innerPath) {
                        issues.push({
                            type: IssueType.BlockingOperation,
                            severity: IssueSeverity.Warning,
                            message: '影响 INP: 点击事件处理器中包含循环操作，可能阻塞交互响应',
                            line: innerPath.node.loc?.start.line || 0,
                            suggestion:
                                '将耗时操作移到 Web Worker 或使用 setTimeout 分片处理，或使用 requestIdleCallback',
                        });
                    },
                });
            }
        }

        // 2. 检测阻塞主线程的长任务
        if (t.isFunctionDeclaration(path.node) || t.isFunctionExpression(path.node)) {
            const body = path.node.body;
            if (t.isBlockStatement(body)) {
                let statementCount = 0;
                path.traverse({
                    Statement() {
                        statementCount++;
                    },
                });

                // 如果函数体超过 100 条语句，可能是长任务
                if (statementCount > 100) {
                    issues.push({
                        type: IssueType.BlockingOperation,
                        severity: IssueSeverity.Warning,
                        message: '影响 INP/TTI: 检测到可能的长任务（函数体过大），可能阻塞用户交互',
                        line: path.node.loc?.start.line || 0,
                        suggestion:
                            '考虑拆分函数，使用 setTimeout、requestIdleCallback 或 Web Worker 处理耗时逻辑',
                    });
                }
            }
        }

        // 3. 检测强制同步布局（导致 layout thrashing）
        if (t.isMemberExpression(path.node)) {
            const property = path.node.property;
            if (t.isIdentifier(property)) {
                // 读取布局属性（offsetHeight, clientHeight, scrollTop 等）
                const layoutReadProps = [
                    'offsetHeight',
                    'offsetWidth',
                    'clientHeight',
                    'clientWidth',
                    'scrollTop',
                    'scrollLeft',
                    'scrollHeight',
                    'scrollWidth',
                    'getBoundingClientRect',
                ];

                if (layoutReadProps.includes(property.name)) {
                    // 检查附近是否有 DOM 写操作
                    const parent = path.parentPath;
                    if (parent && t.isBlockStatement(parent.parent)) {
                        issues.push({
                            type: IssueType.FrequentDomManipulation,
                            severity: IssueSeverity.Information,
                            message: `影响 INP: 读取布局属性 "${property.name}" 可能导致强制同步布局`,
                            line: path.node.loc?.start.line || 0,
                            suggestion:
                                '批量读取所有布局属性，然后再批量写入 DOM，避免布局抖动（layout thrashing）',
                        });
                    }
                }
            }
        }

        return issues;
    }

    /**
     * 检测影响 FCP (First Contentful Paint) 的问题
     * FCP 衡量页面首次渲染内容的速度
     */
    private checkFCPIssues(path: NodePath): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 1. 检测顶层同步代码（阻塞渲染）
        if (
            t.isProgram(path.node) ||
            (t.isExportNamedDeclaration(path.node) && path.node.declaration)
        ) {
            // 检测顶层的大型初始化代码
            let topLevelStatements = 0;
            path.traverse({
                Statement(innerPath) {
                    if (innerPath.parent === path.node) {
                        topLevelStatements++;
                    }
                },
            });

            if (topLevelStatements > 50) {
                issues.push({
                    type: IssueType.BlockingOperation,
                    severity: IssueSeverity.Warning,
                    message: '影响 FCP: 顶层代码过多，可能延迟首次内容绘制',
                    line: path.node.loc?.start.line || 0,
                    suggestion:
                        '将非关键初始化代码移到 DOMContentLoaded 或 window.load 事件中，或使用动态 import',
                });
            }
        }

        // 2. 检测阻塞渲染的同步 API 调用
        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;

            // alert, confirm, prompt 阻塞渲染
            if (t.isIdentifier(callee) && ['alert', 'confirm', 'prompt'].includes(callee.name)) {
                issues.push({
                    type: IssueType.BlockingOperation,
                    severity: IssueSeverity.Warning,
                    message: `影响 FCP: 使用 ${callee.name} 会阻塞页面渲染`,
                    line: path.node.loc?.start.line || 0,
                    suggestion: '使用自定义对话框组件替代浏览器原生对话框',
                });
            }

            // document.write 阻塞解析
            if (
                t.isMemberExpression(callee) &&
                t.isIdentifier(callee.object) &&
                callee.object.name === 'document' &&
                t.isIdentifier(callee.property) &&
                callee.property.name === 'write'
            ) {
                issues.push({
                    type: IssueType.BlockingOperation,
                    severity: IssueSeverity.Error,
                    message: '影响 FCP: document.write 严重阻塞页面解析和渲染',
                    line: path.node.loc?.start.line || 0,
                    suggestion: '使用 DOM API (createElement, appendChild) 或现代框架替代 document.write',
                });
            }
        }

        return issues;
    }

    /**
     * 检测影响 LCP (Largest Contentful Paint) 的问题
     * LCP 衡量最大内容元素的渲染时间
     */
    private checkLCPIssues(path: NodePath): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 1. 检测延迟加载主要内容
        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;

            // 检测 setTimeout/setInterval 中加载主要内容
            if (t.isIdentifier(callee) && ['setTimeout', 'setInterval'].includes(callee.name)) {
                const args = path.node.arguments;
                if (args.length > 0) {
                    const callback = args[0];
                    let hasContentLoading = false;

                    // 检查回调中是否有内容加载
                    if (t.isFunction(callback)) {
                        const callbackPath = path.get('arguments.0') as NodePath;
                        callbackPath.traverse({
                            CallExpression(innerPath) {
                                const innerCallee = innerPath.node.callee;
                                if (
                                    t.isIdentifier(innerCallee) &&
                                    ['fetch', 'axios', 'render', 'mount'].includes(innerCallee.name)
                                ) {
                                    hasContentLoading = true;
                                }
                            },
                        });
                    }

                    if (hasContentLoading) {
                        issues.push({
                            type: IssueType.BlockingOperation,
                            severity: IssueSeverity.Warning,
                            message: '影响 LCP: 主要内容在定时器中加载，可能延迟 LCP',
                            line: path.node.loc?.start.line || 0,
                            suggestion: '尽早加载和渲染主要内容，避免使用定时器延迟',
                        });
                    }
                }
            }
        }

        // 2. 检测动态导入主要组件
        if (t.isImportExpression(path.node) || t.isCallExpression(path.node)) {
            if (t.isCallExpression(path.node)) {
                const callee = path.node.callee;
                // React.lazy 或 defineAsyncComponent
                if (
                    (t.isMemberExpression(callee) &&
                        t.isIdentifier(callee.property) &&
                        callee.property.name === 'lazy') ||
                    (t.isIdentifier(callee) && callee.name === 'defineAsyncComponent')
                ) {
                    issues.push({
                        type: IssueType.InefficientRendering,
                        severity: IssueSeverity.Information,
                        message:
                            '影响 LCP: 使用懒加载组件，确保主要内容不受影响（如果这是首屏组件，建议预加载）',
                        line: path.node.loc?.start.line || 0,
                        suggestion:
                            '对于首屏主要内容组件，考虑预加载或使用服务端渲染。使用 <link rel="preload"> 预加载关键资源',
                    });
                }
            }
        }

        return issues;
    }

    /**
     * 检测影响 CLS (Cumulative Layout Shift) 的问题
     * CLS 衡量视觉稳定性
     */
    private checkCLSIssues(path: NodePath): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        // 1. 检测动态插入内容（可能导致布局偏移）
        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;

            // appendChild, insertBefore, innerHTML 等
            if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
                const methodName = callee.property.name;
                if (
                    [
                        'appendChild',
                        'insertBefore',
                        'insertAdjacentElement',
                        'insertAdjacentHTML',
                    ].includes(methodName)
                ) {
                    issues.push({
                        type: IssueType.FrequentDomManipulation,
                        severity: IssueSeverity.Information,
                        message: `影响 CLS: 动态插入内容（${methodName}）可能导致布局偏移`,
                        line: path.node.loc?.start.line || 0,
                        suggestion:
                            '为动态内容预留空间（设置 min-height），或使用 transform 代替改变布局的属性',
                    });
                }
            }
        }

        // 2. 检测未设置尺寸的图片加载
        if (t.isJSXElement(path.node)) {
            const openingElement = path.node.openingElement;
            if (t.isJSXIdentifier(openingElement.name) && openingElement.name.name === 'img') {
                const hasWidth = openingElement.attributes.some(
                    (attr) =>
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name) &&
                        attr.name.name === 'width'
                );
                const hasHeight = openingElement.attributes.some(
                    (attr) =>
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name) &&
                        attr.name.name === 'height'
                );

                if (!hasWidth || !hasHeight) {
                    issues.push({
                        type: IssueType.UnoptimizedImage,
                        severity: IssueSeverity.Warning,
                        message: '影响 CLS: <img> 标签未设置 width 和 height 属性',
                        line: path.node.loc?.start.line || 0,
                        suggestion:
                            '为图片设置明确的 width 和 height 属性，或使用 aspect-ratio CSS 属性，防止加载时布局偏移',
                    });
                }
            }
        }

        // 3. 检测可能导致字体闪烁的代码
        if (t.isCallExpression(path.node)) {
            const callee = path.node.callee;
            // Web Font Loader 或动态加载字体
            if (
                t.isMemberExpression(callee) &&
                t.isIdentifier(callee.property) &&
                callee.property.name === 'load' &&
                t.isIdentifier(callee.object) &&
                callee.object.name === 'WebFont'
            ) {
                issues.push({
                    type: IssueType.InefficientRendering,
                    severity: IssueSeverity.Information,
                    message: '影响 CLS: 动态加载 Web 字体可能导致布局偏移和文本闪烁',
                    line: path.node.loc?.start.line || 0,
                    suggestion:
                        '使用 font-display: swap 和 preload 字体，或使用系统字体作为后备。考虑使用 CSS Font Loading API',
                });
            }
        }

        return issues;
    }

    /**
     * 检查是否使用了防抖或节流
     */
    private checkForThrottleOrDebounce(node: t.Node): boolean {
        if (t.isCallExpression(node)) {
            const callee = node.callee;
            if (t.isIdentifier(callee)) {
                return ['debounce', 'throttle', 'requestAnimationFrame'].includes(callee.name);
            }
        }
        return false;
    }
}
