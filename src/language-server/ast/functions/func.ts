import dedent from 'dedent-js';
import { SemanticTokenAcceptor } from 'langium';

import { Func } from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';

export type FuncHover = { signature?: string; description?: string } | undefined;

export abstract class FuncCompanion<FuncType extends Func> extends Companion<FuncType> {
    override hover(func: FuncType, highlight: CodeHighlighter): string | undefined {
        const hover = this.funcHover(func, highlight);

        let result = dedent`
        ${highlight(hover?.signature || func.$cstNode?.text)}
        \n---\n
        ${hover?.description}

        ${highlight(`Example: ${this.generator.getValueAsJson(func)}`)}`;

        return result;
    }

    override highlight(func: Func, highlight: SemanticTokenAcceptor): void {
        const match = func.$cstNode?.text?.match(/([\w_]+)\(/);
        if (match) highlight({ node: func, keyword: match[1], type: 'keyword' });
    }

    abstract funcHover(func: FuncType, highlight: CodeHighlighter): FuncHover;
}
