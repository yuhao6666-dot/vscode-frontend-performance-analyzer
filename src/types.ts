export enum IssueType {
    LargeLoop = 'largeLoop',
    NestedLoop = 'nestedLoop',
    FrequentDomManipulation = 'frequentDomManipulation',
    InefficientRendering = 'inefficientRendering',
    MemoryLeak = 'memoryLeak',
    BlockingOperation = 'blockingOperation',
    UnoptimizedImage = 'unoptimizedImage',
    LargeBundle = 'largeBundle',
    LargeData = 'largeData',
    LargeFile = 'largeFile',
}

export enum IssueSeverity {
    Error = 'Error',
    Warning = 'Warning',
    Information = 'Information',
    Hint = 'Hint',
}

export interface PerformanceIssue {
    type: IssueType;
    severity: IssueSeverity;
    message: string;
    line: number;
    column?: number;
    suggestion?: string;
    codeSnippet?: string;
}

export interface ClaudeAnalysisResult {
    issues: PerformanceIssue[];
    summary: string;
    overallScore?: number;
    recommendations?: string[];
}
