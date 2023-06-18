import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('sequence()', () => {
    const document = `
    Entity Test {
        num1: sequence(1)
        num2: sequence(11)
    }`;

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(1, 20).forEach((i) => {
            const output = generator.next();

            expect(output.num1).toBe(i);
            expect(output.num2).toBe(10 + i);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [num1, num2] = properties(doc);

        expect(hover(num1)).toBe('num1: 1');
        expect(hover(num2)).toBe('num2: 11');

        expect(hover(num1.value)).toBe(dedent`
        sequence(1)
        \n---\n
        Generates number sequence \`1, 2, 3, ...\`

        Example: 1`);

        expect(hover(num2.value)).toBe(dedent`
        sequence(11)
        \n---\n
        Generates number sequence \`11, 12, 13, ...\`

        Example: 11`);
    });
});
