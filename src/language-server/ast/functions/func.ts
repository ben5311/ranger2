import dedent from 'dedent-js';
import { SemanticTokenAcceptor } from 'langium';

import * as ast from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';

export type FuncHover = { signature?: string; description?: string } | undefined;

export abstract class FuncCompanion<FuncType extends ast.Func> extends Companion<FuncType> {
    override hover(node: FuncType, highlight: CodeHighlighter): string | undefined {
        const hover = this.funcHover(node, highlight);

        let result = dedent`
        ${highlight(hover?.signature || node.$cstNode?.text)}
        \n---\n
        ${hover?.description}

        ${highlight(`Example: ${this.generator.getValueAsJson(node)}`)}`;

        return result;
    }

    override highlight(node: ast.Func, highlight: SemanticTokenAcceptor): void {
        const match = node.$cstNode?.text?.match(/([\w_]+)\(/);
        if (match) highlight({ node, keyword: match[1], type: 'keyword' });
    }

    abstract funcHover(node: FuncType, highlight: CodeHighlighter): FuncHover;
}
