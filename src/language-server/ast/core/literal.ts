import { SemanticTokenAcceptor } from 'langium';

import * as ast from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class LiteralCompanion extends Companion<ast.Literal> {
    override valueGenerator(node: ast.Literal): ValueGenerator {
        const value = ast.isANull(node) ? null : node.value;
        return new ValueGenerator(() => value);
    }

    override hover(node: ast.Literal, highlight: CodeHighlighter): string | undefined {
        let type = node.$type.substring(1).toLowerCase(); // Strip leading A from AString, ANumber, ...
        let value = node.$cstNode?.text;

        if (type === 'null') {
            return highlight('null');
        } else {
            return highlight(`${value} : ${type}`);
        }
    }

    override highlight(node: ast.Literal, highlight: SemanticTokenAcceptor): void {
        switch (node.$type) {
            case 'ANumber':
                return highlight({ node, property: 'value', type: 'number' });
            case 'ABoolean':
            case 'ANull':
                return highlight({ node, property: 'value', type: 'keyword' });
            case 'AString':
            case 'ADate':
            case 'ATimestamp':
            case 'AFilePath':
                return highlight({ node, property: 'value', type: 'string' });
        }
    }
}
