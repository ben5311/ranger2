import {
    isList,
    isLiteral,
    isNull,
    isProperty,
    isPropertyReference,
    Property,
    PropertyReference,
    Value,
} from '../language-server/generated/ast';
import { DynamicObject } from '../utils/types';

/**
 * Returns the next generated value.
 */
export function getValue(element?: Value | Property | PropertyReference): unknown {
    while (isProperty(element) || isPropertyReference(element)) {
        element = isProperty(element) ? element.value : element.element.ref;
    }
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
