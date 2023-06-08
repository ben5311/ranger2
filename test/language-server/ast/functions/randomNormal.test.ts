import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('randomNormal(mean,std)', () => {
    test('Generate', async () => {
        const generator = await createObjectGenerator(`
        Entity Test {
            num1: randomNormal(mean=180, std=10)
            num2: randomNormal(mean=1.80, std=0.10)
        }`);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.num1).toBeGreaterThanOrEqual(120);
            expect(output.num1).toBeLessThanOrEqual(240);
            expect(output.num2).toBeGreaterThanOrEqual(1.2);
            expect(output.num2).toBeLessThanOrEqual(2.4);
            expect(output.num2.toString()).toMatch(/\d\.\d\d?/);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(dedent`
        Entity Test {
            num: randomNormal(mean=180, std=0)
        }`);

        let [num] = properties(doc);

        expect(hover(num)).toBe(`num: 180`);

        expect(hover(num.value)).toBe(dedent`
        randomNormal(mean=180, std=0)
        \n---\n
        Generates random values based on a [Normal distribution](https://en.wikipedia.org/wiki/Normal_distribution).

        #### Parameters
        * mean: The mean of the Normal distribution.
        * std: The standard deviation of the Normal distribution.

        Example: 180`);
    });
});
