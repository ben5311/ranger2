import { AstNode } from 'langium';

import * as ast from '../generated/ast';

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

export type RangerType = keyof ast.RangerAstType;

export type Providers<ReturnT = void> = {
    [Key in keyof ast.RangerAstType]?: (node: ast.RangerAstType[Key], ...params: any[]) => ReturnT;
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
