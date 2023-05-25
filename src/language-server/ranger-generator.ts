import { MersenneTwister19937, nativeMath, Random } from 'random-js';

import { Companions, createCompanions } from './ast/CompanionRegistry';
import { ValueGenerator } from './ast/ValueGenerator';
import * as ast from './generated/ast';
import { resolveReference, ValueOrProperty } from './ranger-scope';

export class Generator {
    companions: Companions;
    cache: Map<ast.Value | undefined, any>;
    /** Stores the state of Function values. */
    valueGenerators: Map<ast.Value, ValueGenerator | undefined>;
    random: Random;

    constructor(seed?: number) {
        this.companions = createCompanions(this);
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
        if (value === null) return null;

        if (!this.valueGenerators.has(value)) {
            this.valueGenerators.set(value, this.createValueGenerator(value));
        }

        return this.valueGenerators.get(value)?.nextValue();
    }

    protected createValueGenerator(value: ast.Value) {
        return this.companions.get(value)?.valueGenerator(value);
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
}

export const generator = new Generator();
