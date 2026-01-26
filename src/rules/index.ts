import { NodePath } from '@babel/traverse';
import { PerformanceIssue } from '../types';
import { LoopRule } from './loop-rule';
import { DomManipulationRule } from './dom-manipulation-rule';
import { RenderingRule } from './rendering-rule';
import { MemoryLeakRule } from './memory-leak-rule';
import { BlockingOperationRule } from './blocking-operation-rule';
import { ReactHooksRule } from './react-hooks-rule';
import { AsyncOperationRule } from './async-operation-rule';
import { NetworkRequestRule } from './network-request-rule';
import { WebVitalsRule } from './web-vitals-rule';

export interface Rule {
    name: string;
    check(path: NodePath, code: string): PerformanceIssue[];
}

export const rules: Rule[] = [
    new LoopRule(),
    new DomManipulationRule(),
    new RenderingRule(),
    new MemoryLeakRule(),
    new BlockingOperationRule(),
    new ReactHooksRule(),
    new AsyncOperationRule(),
    new NetworkRequestRule(),
    new WebVitalsRule(),
];
