import { SemanticTokenAcceptor } from 'langium';

import { isANull, Literal } from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class LiteralCompanion extends Companion<Literal> {
    override valueGenerator(literal: Literal): ValueGenerator {
        const value = getLiteralValue(literal);
        return new ValueGenerator(() => value);
    }

    override hover(literal: Literal, highlight: CodeHighlighter): string | undefined {
        let type = literal.$type.substring(1).toLowerCase(); // Strip leading A from AString, ANumber, ...
        let value = literal.$cstNode?.text;

        if (type === 'null') {
            return highlight('null');
        } else {
            return highlight(`${value} : ${type}`);
        }
    }

    override highlight(literal: Literal, highlight: SemanticTokenAcceptor): void {
        switch (literal.$type) {
            case 'ANumber':
                return highlight({ node: literal, property: 'value', type: 'number' });
            case 'ABoolean':
            case 'ANull':
                return highlight({ node: literal, property: 'value', type: 'keyword' });
            case 'AString':
            case 'ADate':
            case 'ATimestamp':
            case 'AFilePath':
                return highlight({ node: literal, property: 'value', type: 'string' });
        }
    }
}

export function getLiteralValue(literal: Literal) {
    return isANull(literal) ? null : literal.value;
}
