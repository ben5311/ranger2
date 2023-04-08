import { AbstractSemanticTokenProvider, AstNode, SemanticTokenAcceptor } from 'langium';

import { isPureProperty } from '../utils/types';
import * as ast from './generated/ast';

export class RangerTokenProvider extends AbstractSemanticTokenProvider {
    protected override highlightElement(node: AstNode, highlight: SemanticTokenAcceptor): void | 'prune' | undefined {
        if (isPureProperty(node)) {
            highlight({ node: node, property: 'name', type: 'property' });
        } else if (ast.isLiteral(node) && typeof node.value === 'boolean') {
            highlight({ node: node, property: 'value', type: 'keyword' });
        } else if (ast.isNum(node)) {
            highlight({ node: node, property: 'value', type: 'number' });
        }
    }
}
