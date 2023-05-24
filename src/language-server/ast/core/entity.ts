import { SemanticTokenAcceptor } from 'langium';

import * as ast from '../../generated/ast';
import { PropertyCompanion } from './property';

export class EntityCompanion extends PropertyCompanion {
    override highlight(node: ast.Entity, highlight: SemanticTokenAcceptor): void {
        highlight({ node, keyword: 'Entity', type: 'keyword' });
    }
}
