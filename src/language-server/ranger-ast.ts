import { AstNode } from 'langium';

import * as ast from './generated/ast';
import { resolveReference } from './ranger-scope';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ranger types
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export type RangerType = keyof ast.RangerAstType;

/**
 * Create a Mapping from AstNode types to Functions.
 *
 * ```
 * const hoverProviders: Providers<string | undefined> = {
 *     Property: this.getPropertyHover,
 *     PropertyReference: this.getPropertyReferenceHover,
 *     Literal: this.getLiteralHover,
 * };
 * return executeProvider(node, hoverProviders);   // returns string | undefined
 * ```
 * instead of:
 * ```
 * if (isProperty(node)) return this.getPropertyHover(node);
 * else if (isPropertyReference(node)) return this.getPropertyReferenceHover(nove);
 * else if (isLiteral(node)) return this.getLiteralHover(node);
 * ...
 * ```
 */

export type Providers<ReturnT = void> = {
    [Key in RangerType]?: (node: ast.RangerAstType[Key], ...params: any[]) => ReturnT;
};

export function executeProvider<R>(providers: Providers<R>, node: AstNode, ...params: any[]): R | undefined {
    const astNode: any = node; // Suppress type checker
    for (let [Type, provider] of Object.entries(providers)) {
        if (ast.reflection.isInstance(astNode, Type)) {
            const ret = provider(astNode, ...params);
            return ret;
        }
    }
    return undefined;
}

/**
 * Returns true if node is a real property (and not an Entity).
 */
export function isPureProperty(node: AstNode): node is ast.Property {
    return ast.isProperty(node) && !ast.isEntity(node);
}

export function isSimpleProperty(node: AstNode): node is ast.Property {
    return ast.isProperty(node) && !ast.isObj(resolveReference(node.value));
}
