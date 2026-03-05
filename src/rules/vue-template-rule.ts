import { PerformanceIssue, IssueType, IssueSeverity } from '../types';

/**
 * Vue Template 规则 - 检测 Vue 模板中的性能问题
 */
export class VueTemplateRule {
    name = 'VueTemplateRule';

    check(templateCode: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        if (!templateCode) {
            return issues;
        }

        // 检测 v-for 缺少 key 或使用 index 作为 key
        const vForIssues = this.checkVForKey(templateCode);
        issues.push(...vForIssues);

        return issues;
    }

    /**
     * 检测 v-for 中的 key 使用问题
     */
    private checkVForKey(templateCode: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];
        const lines = templateCode.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // 检测 v-for 指令
            const vForMatch = line.match(/v-for\s*=\s*["']([^"']+)["']/);
            if (!vForMatch) {
                continue;
            }

            const vForExpression = vForMatch[1];

            // 提取变量名，例如 "(item, index) in list" -> index
            const indexVarMatch = vForExpression.match(/\(\s*\w+\s*,\s*(\w+)\s*\)/);
            const indexVar = indexVarMatch ? indexVarMatch[1] : null;

            // 检查当前标签是否有 :key 或 v-bind:key（同行或多行）
            const keyInfo = this.findKeyInElement(lines, i);

            if (!keyInfo.hasKey) {
                issues.push({
                    type: IssueType.InefficientRendering,
                    severity: IssueSeverity.Warning,
                    message: '在 v-for 循环中缺少 key 属性，会导致不必要的重渲染',
                    line: lineNumber,
                    suggestion: '为列表项添加唯一的 :key 属性，例如 :key="item.id"',
                });
            } else {
                // 检查是否使用了 index 作为 key
                if (indexVar && keyInfo.keyValue === indexVar) {
                    issues.push({
                        type: IssueType.InefficientRendering,
                        severity: IssueSeverity.Warning,
                        message: `在 v-for 循环中使用 index 作为 key，会导致不必要的重渲染`,
                        line: lineNumber,
                        suggestion: `使用唯一标识符（如 item.id）作为 key，而不是 ${indexVar}`,
                    });
                }
            }
        }

        return issues;
    }

    /**
     * 在元素范围内查找 key 属性（支持多行）
     */
    private findKeyInElement(
        lines: string[],
        startIndex: number
    ): { hasKey: boolean; keyValue: string | null } {
        // 查找标签结束位置（找到 > 或 />）
        let endIndex = startIndex;
        let foundEnd = false;

        for (let i = startIndex; i < Math.min(startIndex + 20, lines.length); i++) {
            if (lines[i].includes('>')) {
                endIndex = i;
                foundEnd = true;
                break;
            }
        }

        if (!foundEnd) {
            return { hasKey: false, keyValue: null };
        }

        // 检查这个范围内是否有 key，并提取 key 的值
        for (let i = startIndex; i <= endIndex; i++) {
            // 匹配 :key="xxx" 或 v-bind:key="xxx"，支持 item.id, index 等各种形式
            const keyMatch = lines[i].match(/:key\s*=\s*["']([^"']+)["']|v-bind:key\s*=\s*["']([^"']+)["']/);
            if (keyMatch) {
                const keyValue = (keyMatch[1] || keyMatch[2]).trim();
                // 返回完整的 key 值，用于后续判断是否使用了 index
                return { hasKey: true, keyValue };
            }
        }

        return { hasKey: false, keyValue: null };
    }
}
