import * as vscode from 'vscode';
import { PerformanceAnalyzer } from './analyzer';
import { DiagnosticProvider } from './diagnostics';
import { ClaudeCLIIntegration } from './claude-cli-integration';
import { ReportView } from './report-view';

let diagnosticProvider: DiagnosticProvider;
let analyzer: PerformanceAnalyzer;
let claudeCLIIntegration: ClaudeCLIIntegration;
let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    console.log('Frontend Performance Analyzer is now active!');

    // 初始化组件
    extensionContext = context;
    analyzer = new PerformanceAnalyzer();
    diagnosticProvider = new DiagnosticProvider();
    claudeCLIIntegration = new ClaudeCLIIntegration();

    // 注册命令：分析当前文件
    const analyzeCommand = vscode.commands.registerCommand(
        'performanceAnalyzer.analyzeFile',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('没有打开的文件');
                return;
            }

            await analyzeDocument(editor.document);
            vscode.window.showInformationMessage('性能分析完成！');
        }
    );

    // 注册命令：使用 Claude AI 深度分析
    const claudeCodeAnalyzeCommand = vscode.commands.registerCommand(
        'performanceAnalyzer.analyzeWithClaudeCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('没有打开的文件');
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: '🤖 Claude AI 正在深度分析代码性能...',
                    cancellable: false,
                },
                async () => {
                    await analyzeWithClaudeCode(editor.document);
                }
            );
        }
    );

    // 注册命令：清除诊断
    const clearCommand = vscode.commands.registerCommand(
        'performanceAnalyzer.clearDiagnostics',
        () => {
            diagnosticProvider.clear();
            vscode.window.showInformationMessage('已清除性能诊断');
        }
    );

    // 监听文档变化（自动分析）
    const onDidSave = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('performanceAnalyzer');
        const autoAnalyze = config.get<boolean>('autoAnalyze', true);
        const enabled = config.get<boolean>('enabled', true);

        if (enabled && autoAnalyze && isSupportedLanguage(document.languageId)) {
            await analyzeDocument(document);
        }
    });

    // 监听配置变化
    const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('performanceAnalyzer')) {
            // 重新分析所有打开的文档
            vscode.workspace.textDocuments.forEach((document) => {
                if (isSupportedLanguage(document.languageId)) {
                    analyzeDocument(document);
                }
            });
        }
    });

    context.subscriptions.push(
        analyzeCommand,
        claudeCodeAnalyzeCommand,
        clearCommand,
        onDidSave,
        onDidChangeConfiguration,
        diagnosticProvider.diagnosticCollection
    );

}

async function analyzeDocument(document: vscode.TextDocument) {
    console.log('🔍 开始分析文件:', document.fileName);

    const config = vscode.workspace.getConfiguration('performanceAnalyzer');
    const enabled = config.get<boolean>('enabled', true);

    if (!enabled) {
        console.log('⚠️ 性能分析已禁用');
        return;
    }

    try {
        const code = document.getText();
        console.log('📄 文件内容长度:', code.length, '字符');

        // 先进行基础分析
        console.log('🔧 开始基础规则分析...');
        const basicIssues = await analyzer.analyze(code, document.languageId, document.uri);
        console.log('✅ 基础分析完成，发现', basicIssues.length, '个问题');

        // 立即显示基础分析结果（快速反馈）
        diagnosticProvider.updateDiagnostics(document, basicIssues);

        // 检查是否启用 AI 深度分析
        const autoClaudeAnalysis = config.get<boolean>('autoClaudeAnalysis', true);

        if (autoClaudeAnalysis) {
            // 在后台异步执行 AI 分析，不阻塞用户
            console.log('🤖 开始后台 Claude AI 分析...');

            // 显示状态栏消息
            vscode.window.setStatusBarMessage('🤖 Claude AI 正在分析...', 30000);

            // 后台异步分析
            (async () => {
                try {
                    // 再次检查插件是否启用（防止在异步执行期间被禁用）
                    const currentConfig = vscode.workspace.getConfiguration('performanceAnalyzer');
                    const currentEnabled = currentConfig.get<boolean>('enabled', true);
                    const currentAutoClaudeAnalysis = currentConfig.get<boolean>('autoClaudeAnalysis', true);

                    if (!currentEnabled || !currentAutoClaudeAnalysis) {
                        console.log('ℹ️ 插件或 AI 分析已被禁用，取消本次分析');
                        vscode.window.setStatusBarMessage('');
                        return;
                    }

                    // 检查 Claude CLI 是否可用
                    const isInstalled = await claudeCLIIntegration.isClaudeInstalled();

                    if (!isInstalled) {
                        console.log('ℹ️ Claude CLI 未安装，仅使用基础分析');
                        vscode.window.setStatusBarMessage('');
                        return;
                    }

                    // 使用 Claude CLI 进行深度分析
                    const claudeAnalysis = await claudeCLIIntegration.analyzeCode(
                        code,
                        document.languageId,
                        document.uri.fsPath
                    );

                    // 分析完成后，再次确认插件仍然启用
                    const finalConfig = vscode.workspace.getConfiguration('performanceAnalyzer');
                    const finalEnabled = finalConfig.get<boolean>('enabled', true);

                    if (!finalEnabled) {
                        console.log('ℹ️ 插件已被禁用，不显示分析结果');
                        vscode.window.setStatusBarMessage('');
                        return;
                    }

                    // 合并基础分析和 AI 分析结果
                    const allIssues = [...basicIssues, ...claudeAnalysis.issues];
                    diagnosticProvider.updateDiagnostics(document, allIssues);
                    console.log('✅ AI 深度分析完成，新增', claudeAnalysis.issues.length, '个问题');

                    // 更新状态栏消息 - 准备显示报告
                    vscode.window.setStatusBarMessage('🎨 正在生成报告...', 2000);

                    // 显示 AI 分析报告
                    ReportView.show(
                        extensionContext,
                        claudeAnalysis,
                        document.uri.fsPath
                    );

                    // 显示完成通知
                    if (claudeAnalysis.overallScore !== undefined) {
                        vscode.window.showInformationMessage(
                            `🤖 Claude AI 分析完成！性能评分: ${claudeAnalysis.overallScore}/100`
                        );
                    }
                } catch (error) {
                    console.error('⚠️ Claude AI 分析失败:', error);
                    vscode.window.setStatusBarMessage('');
                    // AI 分析失败时不显示错误，因为已经有基础分析结果了
                }
            })();
        } else {
            console.log('ℹ️ AI 自动分析已禁用');
        }

        console.log('✅ 分析完成！');
    } catch (error) {
        console.error('❌ 分析出错:', error);
    }
}

async function analyzeWithClaudeCode(document: vscode.TextDocument) {
    try {
        // 检查插件是否启用
        const config = vscode.workspace.getConfiguration('performanceAnalyzer');
        const enabled = config.get<boolean>('enabled', true);

        if (!enabled) {
            vscode.window.showWarningMessage('性能分析插件已禁用，请先在设置中启用插件。');
            return;
        }

        const code = document.getText();

        // 检查 Claude CLI 是否可用
        const isInstalled = await claudeCLIIntegration.isClaudeInstalled();

        if (!isInstalled) {
            vscode.window.showErrorMessage(
                'Claude CLI 未安装！\n\n请在终端运行以下命令安装：\nnpm install -g @anthropic-ai/claude-cli\n\n然后运行 "claude" 命令登录。'
            );
            return;
        }

        // 先进行基础分析
        const basicIssues = await analyzer.analyze(code, document.languageId, document.uri);

        // 使用 Claude CLI 进行深度分析
        const claudeAnalysis = await claudeCLIIntegration.analyzeCode(
            code,
            document.languageId,
            document.uri.fsPath
        );

        // 合并结果
        const allIssues = [...basicIssues, ...claudeAnalysis.issues];
        diagnosticProvider.updateDiagnostics(document, allIssues);

        // 显示 AI 的详细分析
        if (claudeAnalysis.summary || (claudeAnalysis.recommendations && claudeAnalysis.recommendations.length > 0)) {
            const panel = vscode.window.createWebviewPanel(
                'claudeCodeAnalysis',
                '🤖 Claude AI 性能分析报告',
                vscode.ViewColumn.Beside,
                {}
            );

            panel.webview.html = getWebviewContent(
                claudeAnalysis.summary,
                claudeAnalysis.overallScore,
                claudeAnalysis.recommendations || [],
                'Claude CLI'
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Claude AI 分析失败: ${error}`);
    }
}

function isSupportedLanguage(languageId: string): boolean {
    return [
        'javascript',
        'typescript',
        'vue',
        'javascriptreact',
        'typescriptreact',
        'jsx',
        'tsx',
    ].includes(languageId);
}

function getWebviewContent(
    summary: string,
    overallScore?: number,
    recommendations: string[] = [],
    method: string = 'AI'
): string {
    const scoreColor = overallScore
        ? overallScore >= 80
            ? '#4caf50'
            : overallScore >= 60
            ? '#ff9800'
            : '#f44336'
        : '#666';

    const recommendationsHTML =
        recommendations.length > 0
            ? `
        <h2>📋 优化建议</h2>
        <ul>
            ${recommendations.map((rec) => `<li>${rec}</li>`).join('')}
        </ul>
    `
            : '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude 性能分析报告</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            background: #fafafa;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #007acc;
            margin: 0 0 10px 0;
        }
        .score {
            font-size: 48px;
            font-weight: bold;
            color: ${scoreColor};
            margin: 10px 0;
        }
        .method-badge {
            display: inline-block;
            background: #e3f2fd;
            color: #1976d2;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        h2 {
            color: #333;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #eee;
        }
        .content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code {
            background: #f0f0f0;
            padding: 2px 5px;
            border-radius: 3px;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin: 8px 0;
        }
        .warning { color: #ff9800; }
        .error { color: #f44336; }
        .info { color: #2196f3; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI 性能分析报告</h1>
        <span class="method-badge">由 ${method} 驱动</span>
        ${overallScore !== undefined ? `<div class="score">${overallScore}/100</div>` : ''}
    </div>

    <div class="content">
        <h2>📊 分析摘要</h2>
        <div id="summary">${summary.replace(/\n/g, '<br>')}</div>

        ${recommendationsHTML}
    </div>
</body>
</html>`;
}

export function deactivate() {
    if (diagnosticProvider) {
        diagnosticProvider.dispose();
    }
}
