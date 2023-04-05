import { isList, isLiteral, isNull, Property, PropertyReference, Value } from '../language-server/generated/ast';
import { resolveValue } from '../language-server/ranger-scope';
import { DynamicObject } from '../utils/types';

/**
 * Returns the next generated value.
 */
export function getValue(element?: Value | Property | PropertyReference): unknown {
    element = resolveValue(element);
    if (isNull(element) || !element) return null;
    if (isLiteral(element)) return element.literalValue;
    if (isList(element)) return element.values.map(getValue);
    // Element must be an Objekt
    let result: DynamicObject = {};
    for (let prop of element.properties) {
        result[prop.name] = getValue(prop.value);
    }
    return result;
}
