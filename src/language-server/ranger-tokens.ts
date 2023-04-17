import { AbstractSemanticTokenProvider, AstNode, SemanticTokenAcceptor } from 'langium';

import { isPureProperty } from '../utils/types';
import * as ast from './generated/ast';

export class RangerTokenProvider extends AbstractSemanticTokenProvider {
    protected override highlightElement(node: AstNode, highlight: SemanticTokenAcceptor): void | 'prune' | undefined {
        if (ast.isNull(node)) {
            highlight({ node, keyword: 'null', type: 'keyword' });
        } else if (ast.isPrimitive(node) && typeof node.value === 'boolean') {
            highlight({ node, property: 'value', type: 'keyword' });
        } else if (ast.isPrimitive(node) && typeof node.value === 'string') {
            highlight({ node, property: 'value', type: 'string' });
        } else if (ast.isNum(node)) {
            highlight({ node, property: 'value', type: 'number' });
        } else if (isPureProperty(node)) {
            highlight({ node, property: 'name', type: 'property' });
        } else if (ast.isEntity(node)) {
            highlight({ node, keyword: 'Entity', type: 'keyword' });
        } else if (ast.isFunc(node)) {
            const match = node.$cstNode?.text?.match(/([\w_]+)\(/);
            if (match) highlight({ node, keyword: match[1], type: 'keyword' });
        }
    }
}
