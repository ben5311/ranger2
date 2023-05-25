import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('random(a..b)', () => {
    test('Generate', async () => {
        const generator = await createObjectGenerator(`
        Entity Test {
            num1: random(1..10)
            num2: random(10.01..10.09)
        }`);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.num1).toBeGreaterThanOrEqual(1);
            expect(output.num1).toBeLessThanOrEqual(10);
            expect(output.num2).toBeGreaterThanOrEqual(10.01);
            expect(output.num2).toBeLessThanOrEqual(10.09);
            expect(output.num2.toString()).toMatch(/\d{2}\.\d{2}/);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(dedent`
        Entity Test {
            num: random(18..18)
        }`);

        let [num] = properties(doc);

        expect(hover(num)).toBe(`num: 18`);

        expect(hover(num.value)).toBe(dedent`
        random(18..18)
        \n---\n
        Generates a random number between \`18\` and \`18\` (ends inclusive).

        Example: 18`);
    });
});
