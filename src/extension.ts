import * as vscode from 'vscode';
import { PerformanceAnalyzer } from './analyzer';
import { DiagnosticProvider } from './diagnostics';
import { ClaudeCodeIntegration } from './claude-code-integration';

let diagnosticProvider: DiagnosticProvider;
let analyzer: PerformanceAnalyzer;
let claudeCodeIntegration: ClaudeCodeIntegration;

export function activate(context: vscode.ExtensionContext) {
    console.log('Frontend Performance Analyzer is now active!');

    // 初始化组件
    analyzer = new PerformanceAnalyzer();
    diagnosticProvider = new DiagnosticProvider();
    claudeCodeIntegration = new ClaudeCodeIntegration();

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

    // 注册命令：使用 Claude Code CLI 深度分析
    const claudeCodeAnalyzeCommand = vscode.commands.registerCommand(
        'performanceAnalyzer.analyzeWithClaudeCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('没有打开的文件');
                return;
            }

            // 检查 MCP 服务是否可用
            const isInstalled = await claudeCodeIntegration.isClaudeCodeInstalled();
            if (!isInstalled) {
                const result = await vscode.window.showErrorMessage(
                    'MCP 服务未就绪。请确保已安装相关依赖。',
                    '了解更多'
                );
                if (result === '了解更多') {
                    vscode.env.openExternal(vscode.Uri.parse('https://modelcontextprotocol.io'));
                }
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'AI 正在深度分析代码性能（MCP）...',
                    cancellable: false,
                },
                async () => {
                    await analyzeWithClaudeCode(editor.document);
                }
            );

            vscode.window.showInformationMessage('AI 分析完成！');
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

    // 监听文档打开
    const onDidOpen = vscode.workspace.onDidOpenTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('performanceAnalyzer');
        const enabled = config.get<boolean>('enabled', true);

        if (enabled && isSupportedLanguage(document.languageId)) {
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
        onDidOpen,
        onDidChangeConfiguration,
        diagnosticProvider.diagnosticCollection
    );

    // 分析已打开的文档
    vscode.workspace.textDocuments.forEach((document) => {
        if (isSupportedLanguage(document.languageId)) {
            analyzeDocument(document);
        }
    });
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

        // 检查是否启用 AI 深度分析
        const autoClaudeAnalysis = config.get<boolean>('autoClaudeAnalysis', true);

        if (autoClaudeAnalysis) {
            try {
                console.log('🤖 开始 AI 深度分析...');
                const isInstalled = await claudeCodeIntegration.isClaudeCodeInstalled();

                if (isInstalled) {
                    // 使用 MCP 进行深度分析
                    const claudeAnalysis = await claudeCodeIntegration.analyzeCode(
                        code,
                        document.languageId,
                        document.uri.fsPath
                    );

                    // 合并基础分析和 AI 分析结果
                    const allIssues = [...basicIssues, ...claudeAnalysis.issues];
                    diagnosticProvider.updateDiagnostics(document, allIssues);
                    console.log('✅ AI 深度分析完成，新增', claudeAnalysis.issues.length, '个问题');
                } else {
                    console.log('ℹ️ MCP 服务未就绪，仅使用基础分析');
                    diagnosticProvider.updateDiagnostics(document, basicIssues);
                }
            } catch (error) {
                console.error('⚠️ AI 深度分析失败，使用基础分析结果:', error);
                diagnosticProvider.updateDiagnostics(document, basicIssues);
            }
        } else {
            console.log('ℹ️ AI 自动分析已禁用');
            diagnosticProvider.updateDiagnostics(document, basicIssues);
        }

        console.log('✅ 分析完成！');
    } catch (error) {
        console.error('❌ 分析出错:', error);
    }
}

async function analyzeWithClaudeCode(document: vscode.TextDocument) {
    try {
        const code = document.getText();

        // 先进行基础分析
        const basicIssues = await analyzer.analyze(code, document.languageId, document.uri);

        // 使用 Claude Code 进行深度分析
        const claudeCodeAnalysis = await claudeCodeIntegration.analyzeCode(
            code,
            document.languageId,
            document.uri.fsPath
        );

        // 合并结果
        const allIssues = [...basicIssues, ...claudeCodeAnalysis.issues];

        diagnosticProvider.updateDiagnostics(document, allIssues);

        // 显示 AI 的详细分析
        if (claudeCodeAnalysis.summary) {
            const panel = vscode.window.createWebviewPanel(
                'claudeCodeAnalysis',
                'AI 性能分析报告（MCP）',
                vscode.ViewColumn.Beside,
                {}
            );

            panel.webview.html = getWebviewContent(claudeCodeAnalysis.summary);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`AI 分析失败: ${error}`);
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

function getWebviewContent(summary: string): string {
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
        }
        h1 { color: #007acc; }
        h2 { color: #333; margin-top: 30px; }
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
        .warning { color: #ff9800; }
        .error { color: #f44336; }
        .info { color: #2196f3; }
    </style>
</head>
<body>
    <h1>🤖 Claude AI 性能分析报告</h1>
    <div id="content">${summary.replace(/\n/g, '<br>')}</div>
</body>
</html>`;
}

export function deactivate() {
    if (diagnosticProvider) {
        diagnosticProvider.dispose();
    }
    if (claudeCodeIntegration) {
        claudeCodeIntegration.dispose();
    }
}
