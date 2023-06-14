import { AstNode } from 'langium';

import { isEntity, isObjekt, isProperty, Property } from '../../generated/ast';
import { resolveReference } from '../../ranger-scope';

/**
 * Returns true if node is a real property (and not an Entity).
 */
export function isPureProperty(node: AstNode): node is Property {
    return isProperty(node) && !isEntity(node);
}

export function isSimpleProperty(node: AstNode): node is Property {
    return isProperty(node) && !isObjekt(resolveReference(node.value));
}
