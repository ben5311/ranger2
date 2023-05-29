import { Func, isFunc, isList, List, Value } from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class ListCompanion extends Companion<List> {
    override valueGenerator(list: List): ValueGenerator {
        return new ValueGenerator(() => list.values.map((val) => this.generator.getValue(val)));
    }

    override hover(list: List, highlight: CodeHighlighter): string | undefined {
        return highlight(this.generator.getValueAsJson(list));
    }

    override highlight(): void {
        return;
    }
}

export type ListFunc = Func & { list: List };

export function isListFunc(value?: Value): value is ListFunc {
    return isFunc(value) && 'list' in value && isList(value.list);
}
