import { AstNode, SemanticTokenAcceptor, ValidationCheck } from 'langium';

import { RangerAstType } from '../generated/ast';
import { RangerGenerator } from '../ranger-generator';
import { RangerServices } from '../ranger-module';
import { CodeHighlighter } from './CodeHighlighter';
import { ValueGenerator } from './ValueGenerator';

export abstract class Companion<T extends AstNode> {
    checks: ValidationCheck<T>[] = [];
    generator: RangerGenerator;

    constructor(protected services: RangerServices) {
        this.generator = services.generator.Generator;
    }

    /**
     * Create the ValueGenerator for this node.
     */
    abstract valueGenerator(node: T): ValueGenerator | undefined;

    /**
     * Compute the Hover for this node.
     */
    abstract hover(node: T, highlight: CodeHighlighter): string | undefined;

    /**
     * Highlight semantic tokens for this node.
     */
    abstract highlight(node: T, highlight: SemanticTokenAcceptor): void;
}

export type CheckType = keyof RangerAstType | 'default';

/**
 * Check Decorator
 */
export function Check(target: Companion<any>, propertyKey: string, propertyDescriptor: PropertyDescriptor) {
    target.checks = target.checks || [];
    target.checks.push(propertyDescriptor.value);
}
