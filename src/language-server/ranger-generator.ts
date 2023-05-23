import { randomUUID } from 'crypto';
import * as csv from 'csv/sync';
import fs from 'fs';
import RandExp from 'randexp';
import { MersenneTwister19937, nativeMath, Random } from 'random-js';

import { resolvePath } from '../utils/documents';
import { DynamicObject } from '../utils/types';
import * as ast from './generated/ast';
import { executeProvider, Providers } from './ranger-ast';
import { resolveReference, ValueOrProperty } from './ranger-scope';

interface ValueGenerator {
    data?: any;
    nextValue: () => unknown;
}

export class Generator {
    cache: Map<ast.Value | undefined, any>;
    /** Stores the state of Function values. */
    valueGenerators: Map<ast.Func, ValueGenerator | undefined>;
    random: Random;

    constructor(seed?: number) {
        this.cache = new Map();
        this.valueGenerators = new Map();
        this.random = new Random(seed !== undefined ? MersenneTwister19937.seed(seed) : nativeMath);
    }

    /**
     * Returns the generated value.
     *
     * Values are cached, so all property references are resolved to the same value.
     */
    getValue(element?: ValueOrProperty): unknown {
        let value = resolveReference(element);
        if (!this.cache.has(value)) {
            this.cache.set(value, this.doGetValue(value));
        }
        let cached = this.cache.get(value);
        return cached;
    }

    protected doGetValue(value?: ast.Value): unknown {
        if (value === undefined) return undefined;
        if (ast.isANull(value) || value === null) return null;
        if (ast.isLiteral(value)) return value.value;
        if (ast.isList(value)) return value.values.map((v) => this.getValue(v));
        if (ast.isFunc(value)) return this.getFuncValue(value);
        if (ast.isObj(value)) {
            let result: DynamicObject = {};
            for (let prop of value.properties) {
                result[prop.name] = this.getValue(prop.value);
            }
            return result;
        }
        if (ast.isPropertyExtractor(value)) {
            const source: any = this.getValue(value.source);
            if (source) {
                return source[value.name];
            }
        }
        return undefined;
    }

    /**
     * Returns the generated value as JSON string or undefined if an error occured.
     */
    getValueAsJson(element?: ValueOrProperty, pretty = true, onError: (error: any) => void = console.log) {
        try {
            const value = this.getValue(element);
            return JSON.stringify(value, undefined, pretty ? 2 : undefined);
        } catch (error) {
            onError(error);
            return undefined;
        }
    }

    protected getFuncValue(func: ast.Func) {
        if (!this.valueGenerators.has(func)) {
            this.valueGenerators.set(func, this.createValueGenerator(func));
        }
        const value = this.valueGenerators.get(func)!.nextValue();
        return value;
    }

    /**
     * Reset all generated values.
     */
    resetValues() {
        this.cache.clear();
    }

    /**
     * Clear all generated values.
     *
     * Like resetValues() but also clears the state of Function values.
     */
    clearValues() {
        this.cache.clear();
        this.valueGenerators.clear();
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Function values
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected createValueGenerator(func: ast.Func): ValueGenerator | undefined {
        const providers: Providers<ValueGenerator | undefined> = {
            RandomOfRange: this.create_RandomOfRange_Generator,
            RandomOfList: this.create_RandomOfList_Generator,
            MapToObject: this.create_MapToObject_Generator,
            MapToList: this.create_MapToList_Generator,
            CsvFunc: this.create_Csv_Generator,
            SequenceFunc: this.create_Sequence_Generator,
            UuidFunc: this.create_Uuid_Generator,
            Regex: this.create_Regex_Generator,
            TodayFunc: this.create_Today_Generator,
            NowFunc: this.create_Now_Generator,
        };
        return executeProvider(providers, func, this);
    }

    protected create_RandomOfRange_Generator(func: ast.RandomOfRange, g: Generator): ValueGenerator | undefined {
        const [minVal, maxVal] = [func.range.min, func.range.max];
        if (!minVal || !maxVal) return undefined; // can be undefined if there are parsing errors

        const minPrecision = numRegex.exec(minVal.$cstNode?.text || '')?.[2]?.length || 0;
        const maxPrecision = numRegex.exec(maxVal.$cstNode?.text || '')?.[2]?.length || 0;
        const decimalPlaces = Math.max(minPrecision, maxPrecision);
        const [min, max] = [minVal.value, maxVal.value];

        let randomGenerator = decimalPlaces ? g.random.real : g.random.integer;
        randomGenerator = randomGenerator.bind(g.random);
        return {
            nextValue: () => {
                const randomNumber = randomGenerator(min, max);
                return Number(randomNumber.toFixed(decimalPlaces));
            },
        };
    }

    protected create_RandomOfList_Generator(func: ast.RandomOfList, g: Generator): ValueGenerator | undefined {
        const list = func.list.values;
        return {
            nextValue() {
                const randomIndex = g.random.integer(0, list.length - 1);
                this.data = randomIndex;
                return g.getValue(list[randomIndex]);
            },
        };
    }

    protected create_MapToObject_Generator(func: ast.MapToObject, g: Generator): ValueGenerator | undefined {
        return {
            nextValue() {
                const source = g.getValue(func.source);
                for (let pair of func.object.pairs) {
                    if (g.getValue(pair.key) === source) {
                        const target = g.getValue(pair.value);
                        return target;
                    }
                }
                return undefined;
            },
        };
    }

    protected create_MapToList_Generator(func: ast.MapToList, g: Generator): ValueGenerator | undefined {
        const sourceFunc = resolveReference(func.source);
        if (!isListFunc(sourceFunc)) return undefined;

        return {
            nextValue() {
                g.getValue(sourceFunc); // Ensure that sourceFunc's index is computed
                const sourceIndex = g.valueGenerators.get(sourceFunc)?.data;
                if (sourceIndex === undefined) {
                    return undefined;
                }
                this.data = sourceIndex;

                return g.getValue(func.list.values[sourceIndex]);
            },
        };
    }

    protected create_Csv_Generator(func: ast.CsvFunc, g: Generator): ValueGenerator | undefined {
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
                const randomIndex = g.random.integer(0, rows.length - 1);
                return rows[randomIndex];
            },
        };
    }

    protected create_Sequence_Generator(func: ast.SequenceFunc): ValueGenerator | undefined {
        let number = func.start?.value || 1;
        return {
            nextValue: () => number++,
        };
    }

    protected create_Uuid_Generator(): ValueGenerator | undefined {
        return {
            nextValue: () => randomUUID(), // TODO: Apply seed to random UUID generator
        };
    }

    protected create_Regex_Generator(regex: ast.Regex): ValueGenerator | undefined {
        const regexGen = new RandExp(regex.value);
        return {
            nextValue: () => regexGen.gen(),
        };
    }

    protected create_Today_Generator(): ValueGenerator | undefined {
        const today = new Date().toISOString().substring(0, 10);
        return {
            nextValue: () => today,
        };
    }

    protected create_Now_Generator(): ValueGenerator | undefined {
        const now = new Date().toISOString();
        return {
            nextValue: () => now,
        };
    }
}

export const generator = new Generator();

export const numRegex = new RegExp(/[+-]?[0-9]+(\.([0-9]+))?/);

export type ListFunc = ast.Func & { list: ast.List };

export function isListFunc(value?: ast.Value): value is ListFunc {
    return ast.isFunc(value) && 'list' in value && ast.isList(value.list);
}
