import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { RandomNormal } from '../../../../src/language-server/generated/ast';
import { Issues } from '../../../../src/language-server/ranger-validator';
import {
	createObjectGenerator,
	expectError,
	expectNoIssues,
	firstValue,
	hover,
	parseDocument,
	properties,
} from '../../../../src/utils/test';

describe('randomNormal(a..b, mean,std)', () => {
    test('Generate', async () => {
        const generator = await createObjectGenerator(`
        Entity Test {
            num1: randomNormal(120..230, mean=180, std=10)
            num2: randomNormal(1.20..2.30, mean=1.80, std=0.10)
        }`);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.num1).toBeGreaterThanOrEqual(120);
            expect(output.num1).toBeLessThanOrEqual(230);
            expect(output.num2).toBeGreaterThanOrEqual(1.2);
            expect(output.num2).toBeLessThanOrEqual(2.3);
            expect(output.num2.toString()).toMatch(/\d(\.\d\d?)?/);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(dedent`
        Entity Test {
            num: randomNormal(180..180, mean=180, std=0)
        }`);

        let [num] = properties(doc);

        expect(hover(num)).toBe(`num: 180`);

        expect(hover(num.value)).toBe(dedent`
        randomNormal(180..180, mean=180, std=0)
        \n---\n
        Generates a random number between \`180\` and \`180\` (ends inclusive) based on a
        [Normal distribution](https://en.wikipedia.org/wiki/Normal_distribution).

        #### Parameters
        * mean: The mean of the Normal distribution.
        * std: The standard deviation of the Normal distribution.

        Example: 180`);
    });

    describe('Validate', () => {
        test('MeanIsInRange ✔', async () => {
            const document = await parseDocument(`
            Entity Test {
                num: randomNormal(120..230, mean=180, std=10)
            }`);

            expectNoIssues(document);
        });

        test('MeanIsInRange ✖', async () => {
            const document = await parseDocument(`
            Entity Test {
                num: randomNormal(120..230, mean=240, std=10)
            }`);

            expectError(document, Issues.MeanOutOfBounds.code, {
                node: firstValue(document) as RandomNormal,
                property: 'mean',
            });
        });
    });
});
