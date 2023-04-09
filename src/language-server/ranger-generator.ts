import { nativeMath, Random } from 'random-js';

import { DynamicObject } from '../utils/types';
import * as ast from './generated/ast';
import { resolveReference, ValueOrProperty } from './ranger-scope';

//const cache = new Map();

// TODO: implement get() and reset() mechanism using cache

/**
 * Returns the next generated value.
 */
export function getValue(element?: ValueOrProperty): unknown {
    element = resolveReference(element);
    if (element === undefined) return undefined;
    if (ast.isNull(element) || element === null) return null;
    if (ast.isPrimitive(element)) return element.value;
    if (ast.isNum(element)) return element.value;
    if (ast.isList(element)) return element.values.map(getValue);
    if (ast.isFunc(element)) return getFuncValue(element);
    // Element must be an Objekt
    let result: DynamicObject = {};
    for (let prop of element.properties) {
        result[prop.name] = getValue(prop.value);
    }
    return result;
}

/**
 * Returns the next generated value as JSON string or undefined if an error occured.
 */
export function getValueAsJson(element?: ValueOrProperty) {
    try {
        const value = getValue(element);
        return JSON.stringify(value);
    } catch {
        return undefined;
    }
}

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
    if (ast.isList(func.values)) return undefined;
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
}
