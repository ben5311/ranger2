import { AstNode } from 'langium';

import * as ast from '../../generated/ast';
import { resolveReference } from '../../ranger-scope';

/**
 * Returns true if node is a real property (and not an Entity).
 */
export function isPureProperty(node: AstNode): node is ast.Property {
    return ast.isProperty(node) && !ast.isEntity(node);
}

export function isSimpleProperty(node: AstNode): node is ast.Property {
    return ast.isProperty(node) && !ast.isObjekt(resolveReference(node.value));
}
