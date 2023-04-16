import * as csv from 'csv/sync';
import fs from 'fs';
import { nativeMath, Random } from 'random-js';

import { resolvePath } from '../utils/documents';
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
export function getValueAsJson(element?: ValueOrProperty, pretty = true) {
    try {
        const value = getValue(element);
        return JSON.stringify(value, undefined, pretty ? 2 : undefined);
    } catch (error) {
        console.log(error);
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
    data?: any;
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
            return create_MapToList_Generator(func);
        case 'CsvFunc':
            return create_CsvFunc_Generator(func);
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
    return {
        nextValue() {
            const randomIndex = random.integer(0, list.length - 1);
            this.data = randomIndex;
            return getValue(list[randomIndex]);
        },
    };
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

function create_MapToList_Generator(func: ast.MapToList): ValueGenerator | undefined {
    const sourceFunc = resolveReference(func.source);
    if (!isListFunc(sourceFunc)) return undefined;

    return {
        nextValue() {
            getValue(sourceFunc); // Ensure that sourceFunc's index is computed
            const sourceIndex = valueGenerators.get(sourceFunc as ast.Func)?.data;
            if (sourceIndex === undefined) {
                return undefined;
            }
            this.data = sourceIndex;

            return getValue(func.list.values[sourceIndex]);
        },
    };
}

export function isListFunc(value?: ast.Value): boolean {
    return ast.isFunc(value) && 'list' in value && ast.isList(value.list);
}

function create_CsvFunc_Generator(func: ast.CsvFunc): ValueGenerator | undefined {
    const filePath = resolvePath(func.filePath.value, func)!;
    const data = fs.readFileSync(filePath, 'utf-8');
    if (!func.delimiter) {
        const numCommas = data.match(/,/g)?.length;
        const numColons = data.match(/;/g)?.length;
        const delimiter = Number(numCommas) >= Number(numColons) ? ',' : ';';
        func.delimiter = delimiter;
    }
    const rows: any[] = csv.parse(data, { delimiter: func.delimiter, columns: !func.noHeader });
    return {
        nextValue() {
            const randomIndex = random.integer(0, rows.length - 1);
            return rows[randomIndex];
        },
    };
}
