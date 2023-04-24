import { AstNode } from 'langium';

import { isEntity, isObjekt, isProperty, Property, RangerAstType, reflection } from '../language-server/generated/ast';
import { resolveReference } from '../language-server/ranger-scope';

/**
 * Allows to enforce types without throwing away information about any more specific type
 * that the compiler may have inferred.
 * See https://stackoverflow.com/questions/70956050/
 *
 * Example:
 * --------
 * export const Issues = satisfies<Record<string, { code: string; msg: string }>>()({
 *     issue1: { code: 'issue1', msg: 'Sample issue' },
 *     issue2: { code: 'issue2', msg: 'Other issue' },
 * });
 *
 * instead of:
 * -----------
 * export const Issues: {[key: string]: {code: string; msg: string}} = {
 *     issue1: { code: 'issue1', msg: 'Sample issue' },
 *     issue2: { code: 'issue2', msg: 'Other issue' },
 * };
 *
 * With the first syntax, the property names are still part of the inferred type.
 * With the second syntax, the property names are lost and IntelliSense is not possible when accessing Issues' properties.
 */
export const satisfies =
    <T>() =>
    <U extends T>(u: U) =>
        u;

/**
 * Allows to dynamically add properties to an object.
 */
export interface DynamicObject {
    [key: string]: any;
}

/**
 * Allows to create a Mapping of AstNode types to Functions.
 *
 * Example:
 * --------
 * const hoverProviders: Providers<string | undefined> = {
 *     Property: this.getPropertyHover,
 *     PropertyReference: this.getPropertyReferenceHover,
 *     Null: this.getNullHover,
 *     Literal: this.getLiteralHover,
 *     FilePath: this.getLiteralHover,
 *     Objekt: this.getObjektHover,
 *     List: this.getListHover,
 *     Func: this.getFuncHover,
 + };
 * return executeProvider(node, hoverProviders);   // returns string | undefined
 *
 * instead of:
 * -----------
 * if (ast.isProperty(node)) return this.getPropertyHover(node);
 * else if (ast.isPropertyReference(node)) return this.getPropertyReferenceHover(nove);
 * else if (ast.isNull(node)) return this.getNullHover(node);
 * else if (ast.isLiteral(node)) return this.getLiteralHover(node);
 * ...
 */
export type Providers<ReturnT> = { [K in keyof RangerAstType]?: (node: RangerAstType[K], ...params: any[]) => ReturnT };

export function executeProvider<R>(node: AstNode, providers: Providers<R>, ...params: any[]): R | undefined {
    const astNode: any = node; // Suppress type checker
    for (let [Type, provider] of Object.entries(providers)) {
        if (reflection.isInstance(astNode, Type)) {
            const ret = provider(astNode, ...params);
            return ret;
        }
    }
    return undefined;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Extension methods
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

declare global {
    interface Array<T> {
        first(): T | undefined;
        groupBy<KeyT>(this: T[], key: (element: T) => KeyT): Map<KeyT, T[]>;
        lastIndex(): number;
    }
    interface Map<K, V> {
        valuesArray(): V[];
    }
}
Array.prototype.first = function () {
    return this.length >= 1 ? this[0] : undefined;
};
Array.prototype.groupBy = function (keyFn) {
    return this.reduce(function (accumulator: Map<any, any[]>, currentVal) {
        let key = keyFn(currentVal);
        if (!accumulator.get(key)) {
            accumulator.set(key, []);
        }
        accumulator.get(key)!.push(currentVal);
        return accumulator;
    }, new Map<any, any[]>());
};
Array.prototype.lastIndex = function () {
    return this.length - 1;
};
Map.prototype.valuesArray = function () {
    return Array.from(this.values());
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utils
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface Issue {
    code: string;
    msg: string;
}

/**
 * Returns true if node is a real property (and not an Entity).
 */
export function isPureProperty(node: AstNode): node is Property {
    return isProperty(node) && !isEntity(node);
}

export function isSimpleProperty(node: AstNode): node is Property {
    return isProperty(node) && !isObjekt(resolveReference(node.value));
}
