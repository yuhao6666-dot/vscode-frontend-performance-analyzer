import * as vscode from 'vscode';
import { PerformanceIssue, IssueSeverity } from './types';

export class DiagnosticProvider {
    public diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('performanceAnalyzer');
    }

    updateDiagnostics(document: vscode.TextDocument, issues: PerformanceIssue[]) {
        const diagnostics: vscode.Diagnostic[] = issues.map((issue) => {
            const line = Math.max(0, issue.line);
            const range = new vscode.Range(
                new vscode.Position(line, issue.column || 0),
                new vscode.Position(line, issue.column ? issue.column + 50 : 1000)
            );

            const diagnostic = new vscode.Diagnostic(
                range,
                issue.message,
                this.mapSeverity(issue.severity)
            );

            diagnostic.source = 'Performance Analyzer';
            diagnostic.code = issue.type;

            // 添加建议
            if (issue.suggestion) {
                diagnostic.relatedInformation = [
                    new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(document.uri, range),
                        `💡 建议: ${issue.suggestion}`
                    ),
                ];
            }

            return diagnostic;
        });

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    clear() {
        this.diagnosticCollection.clear();
    }

    dispose() {
        this.diagnosticCollection.dispose();
    }

    private mapSeverity(severity: IssueSeverity): vscode.DiagnosticSeverity {
        const config = vscode.workspace.getConfiguration('performanceAnalyzer');
        const configSeverity = config.get<string>('severity', 'Warning');

        // 如果配置了全局严重程度，使用配置的值
        if (severity === IssueSeverity.Warning || severity === IssueSeverity.Information) {
            switch (configSeverity) {
                case 'Error':
                    return vscode.DiagnosticSeverity.Error;
                case 'Warning':
                    return vscode.DiagnosticSeverity.Warning;
                case 'Information':
                    return vscode.DiagnosticSeverity.Information;
                case 'Hint':
                    return vscode.DiagnosticSeverity.Hint;
            }
        }

        // 否则使用原始严重程度
        switch (severity) {
            case IssueSeverity.Error:
                return vscode.DiagnosticSeverity.Error;
            case IssueSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            case IssueSeverity.Information:
                return vscode.DiagnosticSeverity.Information;
            case IssueSeverity.Hint:
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Warning;
        }
    }
}
