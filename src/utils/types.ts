import './extensions';

import { ParsedPath } from 'path';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utility types
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Allows to dynamically add properties to an object in TypeScript.
 */
export interface DynamicObject {
    [key: string]: any;
}

export interface Issue {
    code: string;
    msg: string;
}

export interface Path extends ParsedPath {
    path: string;
}

/**
 * Enforce types without throwing away information about any more specific type
 * that the compiler may have inferred.
 *
 * @see https://stackoverflow.com/questions/70956050/
 *
 * @example
 * export const Issues = satisfies<Record<string, { code: string; msg: string }>>()({
 *     issue1: { code: 'issue1', msg: 'Sample issue' },
 *     issue2: { code: 'issue2', msg: 'Other issue' },
 * });
 *
 * instead of:
 *
 * export const Issues: {[key: string]: {code: string; msg: string}} = {
 *     issue1: { code: 'issue1', msg: 'Sample issue' },
 *     issue2: { code: 'issue2', msg: 'Other issue' },
 * };
 *
 * @description
 * With the first syntax, the property names are still part of the inferred type.
 * With the second syntax, the property names are lost and IntelliSense is not possible when accessing Issues' properties.
 */
export const satisfies =
    <T>() =>
    <U extends T>(u: U) =>
        u;
