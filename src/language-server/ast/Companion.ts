import { AstNode, SemanticTokenAcceptor } from 'langium';

import { Generator } from '../ranger-generator';
import { CodeHighlighter } from './CodeHighlighter';
import { ValueGenerator } from './ValueGenerator';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Companion
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export abstract class Companion<T extends AstNode> {
    constructor(protected generator: Generator) {}

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
