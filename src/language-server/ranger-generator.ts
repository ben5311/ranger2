import { nativeMath, Random } from 'random-js';

import { DynamicObject } from '../utils/types';
import * as ast from './generated/ast';
import { resolveReference, ValueOrProperty } from './ranger-scope';

const cache = new Map();

/**
 * Returns the generated value.
 *
 * Values are cached, so all property references are resolved to the same value.
 */
export function getValue(element?: ValueOrProperty): unknown {
    let value = resolveReference(element);
    if (!cache.has(value)) {
        cache.set(value, doGetValue(value));
    }
    let cached = cache.get(value);
    return cached;
}

function doGetValue(value?: ast.Value): unknown {
    if (value === undefined) return undefined;
    if (ast.isNull(value) || value === null) return null;
    if (ast.isPrimitive(value)) return value.value;
    if (ast.isNum(value)) return value.value;
    if (ast.isList(value)) return value.values.map(getValue);
    if (ast.isFunc(value)) return getFuncValue(value);
    if (ast.isObjekt(value)) {
        let result: DynamicObject = {};
        for (let prop of value.properties) {
            result[prop.name] = getValue(prop.value);
        }
        return result;
    }
    return undefined;
}

/**
 * Returns the generated value as JSON string or undefined if an error occured.
 */
export function getValueAsJson(element?: ValueOrProperty) {
    try {
        const value = getValue(element);
        return JSON.stringify(value);
    } catch {
        return undefined;
    }
}

/**
 * Reset all generated values.
 */
export function resetValues() {
    cache.clear();
}

/**
 * Clear all generated values.
 *
 * Like resetValues() but also clears the state of Function values.
 */
export function clearValues() {
    cache.clear();
    valueGenerators.clear();
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Function values
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Stores the state of Function values.
 */
const valueGenerators = new Map<ast.Func, ValueGenerator | undefined>();
interface ValueGenerator {
    nextValue: () => unknown;
}

function getFuncValue(func: ast.Func) {
    if (!valueGenerators.has(func)) {
        valueGenerators.set(func, createValueGenerator(func));
    }
    const value = valueGenerators.get(func)?.nextValue();
    return value;
}

function createValueGenerator(func: ast.Func): ValueGenerator | undefined {
    switch (func.$type) {
        case 'RandomOfRange':
            return create_RandomOfRange_Generator(func);
        case 'RandomOfList':
            return create_RandomOfList_Generator(func);
        case 'MapToObject':
            return create_MapToObject_Generator(func);
        case 'MapToList':
            return createMapToListGenerator(func);
    }
}

const random = new Random(nativeMath);
function create_RandomOfRange_Generator(func: ast.RandomOfRange): ValueGenerator | undefined {
    const [min, max] = [func.range.min, func.range.max];
    if (!min || !max) return undefined; // can be undefined if there are parsing errors
    let randomGenerator = ast.isFloat(min) || ast.isFloat(max) ? random.real : random.integer;
    randomGenerator = randomGenerator.bind(random);
    return { nextValue: () => randomGenerator(min.value, max.value) };
}

function create_RandomOfList_Generator(func: ast.RandomOfList): ValueGenerator | undefined {
    const list = func.list.values;
    return { nextValue: () => getValue(list[random.integer(0, list.length - 1)]) };
}

function create_MapToObject_Generator(func: ast.MapToObject): ValueGenerator | undefined {
    return {
        nextValue() {
            const source = getValue(func.source);
            for (let pair of func.object.pairs) {
                if (getValue(pair.key) === source) {
                    const target = getValue(pair.value);
                    return target;
                }
            }
            return undefined;
        },
    };
}

function createMapToListGenerator(func: ast.MapToList): ValueGenerator | undefined {
    return undefined;
}

export function hasAList(value?: ast.Value): boolean {
    return !!value && 'list' in value && ast.isList(value.list);
}
