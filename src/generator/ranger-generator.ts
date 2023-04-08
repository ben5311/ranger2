import { nativeMath, Random } from 'random-js';

import * as ast from '../language-server/generated/ast';
import { resolveValue } from '../language-server/ranger-scope';
import { DynamicObject } from '../utils/types';

/**
 * Returns the next generated value.
 */
export function getValue(element?: ast.Value | ast.Property | ast.PropertyReference): unknown {
    element = resolveValue(element);
    if (element === undefined) return undefined;
    if (ast.isNull(element) || element === null) return null;
    if (ast.isLiteral(element)) return element.value;
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

const random = new Random(nativeMath);
function getFuncValue(func: ast.Func): unknown {
    if (ast.isRandom(func)) {
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
    return undefined;
}
