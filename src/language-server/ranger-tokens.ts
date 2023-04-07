import { AbstractSemanticTokenProvider, AstNode, SemanticTokenAcceptor } from 'langium';

import { isDocument, isLiteral, isProperty } from './generated/ast';

export class RangerTokenProvider extends AbstractSemanticTokenProvider {
    protected override highlightElement(node: AstNode, highlight: SemanticTokenAcceptor): void | 'prune' | undefined {
        if (isProperty(node) && !isDocument(node.$container)) {
            highlight({ node: node, property: 'name', type: 'property' });
        } else if (isLiteral(node) && typeof node.literalValue === 'boolean') {
            highlight({ node: node, property: 'literalValue', type: 'keyword' });
        } else if (isLiteral(node) && typeof node.literalValue === 'number') {
            highlight({ node: node, property: 'literalValue', type: 'number' });
        }
    }
}
