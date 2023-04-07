import { AbstractSemanticTokenProvider, AstNode, SemanticTokenAcceptor } from 'langium';

import { isPureProperty } from '../utils/types';
import { isLiteral } from './generated/ast';

export class RangerTokenProvider extends AbstractSemanticTokenProvider {
    protected override highlightElement(node: AstNode, highlight: SemanticTokenAcceptor): void | 'prune' | undefined {
        if (isPureProperty(node)) {
            highlight({ node: node, property: 'name', type: 'property' });
        } else if (isLiteral(node) && typeof node.literalValue === 'boolean') {
            highlight({ node: node, property: 'literalValue', type: 'keyword' });
        } else if (isLiteral(node) && typeof node.literalValue === 'number') {
            highlight({ node: node, property: 'literalValue', type: 'number' });
        }
    }
}
