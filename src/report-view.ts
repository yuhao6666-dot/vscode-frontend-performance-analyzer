import * as vscode from 'vscode';
import { ClaudeAnalysisResult } from './types';

/**
 * AI 分析报告视图
 */
export class ReportView {
    private static currentPanel: vscode.WebviewPanel | undefined;

    /**
     * 显示 AI 分析报告
     */
    public static show(
        context: vscode.ExtensionContext,
        analysis: ClaudeAnalysisResult,
        filePath: string
    ) {
        const column = vscode.ViewColumn.Beside;

        // 如果已经有面板，则重用
        if (ReportView.currentPanel) {
            ReportView.currentPanel.reveal(column);
            ReportView.currentPanel.webview.html = ReportView.getHtmlContent(analysis, filePath);
            return;
        }

        // 创建新面板
        const panel = vscode.window.createWebviewPanel(
            'performanceReport',
            '🤖 AI 性能分析报告',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        panel.webview.html = ReportView.getHtmlContent(analysis, filePath);

        // 监听面板关闭
        panel.onDidDispose(() => {
            ReportView.currentPanel = undefined;
        });

        ReportView.currentPanel = panel;
    }

    /**
     * 生成 HTML 内容
     */
    private static getHtmlContent(analysis: ClaudeAnalysisResult, filePath: string): string {
        const scoreColor = ReportView.getScoreColor(analysis.overallScore || 0);
        const fileName = filePath.split('/').pop() || filePath;

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 性能分析报告</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }

        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .header h1 {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
            font-size: 24px;
        }

        .file-path {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
            font-family: 'Courier New', monospace;
        }

        .score-section {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }

        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
        }

        .score-label {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .section {
            margin-bottom: 30px;
        }

        .section h2 {
            color: var(--vscode-foreground);
            font-size: 18px;
            margin-bottom: 15px;
            border-left: 4px solid var(--vscode-activityBarBadge-background);
            padding-left: 10px;
        }

        .summary {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }

        .issues-list {
            list-style: none;
            padding: 0;
        }

        .issue-item {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 12px;
            border-left: 4px solid var(--vscode-inputValidation-warningBorder);
        }

        .issue-item.error {
            border-left-color: var(--vscode-inputValidation-errorBorder);
        }

        .issue-item.warning {
            border-left-color: var(--vscode-inputValidation-warningBorder);
        }

        .issue-item.info {
            border-left-color: var(--vscode-inputValidation-infoBorder);
        }

        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .issue-type {
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .issue-location {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .issue-message {
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }

        .issue-suggestion {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
            font-style: italic;
        }

        .recommendations {
            list-style: none;
            padding: 0;
        }

        .recommendation-item {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 12px 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            border-left: 4px solid var(--vscode-activityBarBadge-background);
        }

        .recommendation-item::before {
            content: "💡 ";
            margin-right: 8px;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge.error {
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
        }

        .badge.warning {
            background: var(--vscode-inputValidation-warningBackground);
            color: var(--vscode-inputValidation-warningForeground);
        }

        .badge.info {
            background: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI 性能分析报告</h1>
        <div class="file-path">${fileName}</div>
    </div>

    ${analysis.overallScore !== undefined ? `
    <div class="score-section">
        <div class="score-circle" style="background: ${scoreColor};">
            ${analysis.overallScore}
        </div>
        <div class="score-label">性能评分</div>
    </div>
    ` : ''}

    ${analysis.summary ? `
    <div class="section">
        <h2>📊 总体分析</h2>
        <div class="summary">
            ${analysis.summary}
        </div>
    </div>
    ` : ''}

    ${analysis.issues && analysis.issues.length > 0 ? `
    <div class="section">
        <h2>⚠️ 发现的问题 (${analysis.issues.length})</h2>
        <ul class="issues-list">
            ${analysis.issues.map(issue => `
                <li class="issue-item ${issue.severity.toLowerCase()}">
                    <div class="issue-header">
                        <span class="issue-type">${ReportView.getIssueTypeLabel(issue.type)}</span>
                        <span class="issue-location">Line ${issue.line + 1}</span>
                    </div>
                    <div class="issue-message">
                        <span class="badge ${issue.severity.toLowerCase()}">${issue.severity}</span>
                        ${issue.message}
                    </div>
                    ${issue.suggestion ? `
                        <div class="issue-suggestion">
                            💡 建议: ${issue.suggestion}
                        </div>
                    ` : ''}
                </li>
            `).join('')}
        </ul>
    </div>
    ` : `
    <div class="section">
        <div class="empty-state">
            ✅ 未发现明显的性能问题
        </div>
    </div>
    `}

    ${analysis.recommendations && analysis.recommendations.length > 0 ? `
    <div class="section">
        <h2>🎯 优化建议</h2>
        <ul class="recommendations">
            ${analysis.recommendations.map(rec => `
                <li class="recommendation-item">${rec}</li>
            `).join('')}
        </ul>
    </div>
    ` : ''}
</body>
</html>`;
    }

    /**
     * 根据分数获取颜色
     */
    private static getScoreColor(score: number): string {
        if (score >= 80) return '#4caf50'; // 绿色
        if (score >= 60) return '#ff9800'; // 橙色
        return '#f44336'; // 红色
    }

    /**
     * 获取问题类型标签
     */
    private static getIssueTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            largeLoop: '大型循环',
            nestedLoop: '嵌套循环',
            frequentDomManipulation: '频繁 DOM 操作',
            inefficientRendering: '低效渲染',
            memoryLeak: '内存泄漏风险',
            blockingOperation: '阻塞操作',
            unoptimizedImage: '未优化图片',
            largeBundle: '打包体积过大',
        };
        return labels[type] || type;
    }
}
