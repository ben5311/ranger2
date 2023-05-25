import * as ast from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class ListCompanion extends Companion<ast.List> {
    override valueGenerator(node: ast.List): ValueGenerator {
        return new ValueGenerator(() => node.values.map((val) => this.generator.getValue(val)));
    }

    override hover(node: ast.List, highlight: CodeHighlighter): string | undefined {
        return highlight(this.generator.getValueAsJson(node));
    }

    override highlight(): void {
        return;
    }
}

export type ListFunc = ast.Func & { list: ast.List };

export function isListFunc(value?: ast.Value): value is ListFunc {
    return ast.isFunc(value) && 'list' in value && ast.isList(value.list);
}
