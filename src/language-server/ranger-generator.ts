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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Function values
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getFuncValue(func: ast.Func) {
    switch (func.$type) {
        case 'RandomFunc':
            return getRandomFuncValue(func);
        case 'MapFunc':
            return getMapFuncValue(func);
    }
}

const random = new Random(nativeMath);
function getRandomFuncValue(func: ast.RandomFunc) {
    if (func.range) {
        const [min, max] = [func.range.min, func.range.max];
        if (!min || !max) return undefined;
        const isFloat = ast.isFloat(min) || ast.isFloat(max);
        const randomNumber = isFloat ? random.real(min.value, max.value) : random.integer(min.value, max.value);
        return randomNumber;
    } else if (func.list) {
        const list = func.list.values;
        const randomIndex = random.integer(0, list.length - 1);
        return getValue(list[randomIndex]);
    }
}

function getMapFuncValue(func: ast.MapFunc) {
    if (ast.isMapObj(func.values)) {
        const source = getValue(func.source);
        for (let pair of func.values.pairs) {
            if (getValue(pair.key) === source) {
                const target = getValue(pair.value);
                return target;
            }
        }
        return undefined;
    }
    if (ast.isList(func.values)) {
        return undefined;
    }
}
