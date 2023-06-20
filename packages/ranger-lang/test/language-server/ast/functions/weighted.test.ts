import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('weighted(a, b, c)', () => {
    test('Generate', async () => {
        const generator = await createObjectGenerator(`
        Entity Test {
            name: weighted("Max":70, "Peter":20, "John":10)
        }`);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(['Max', 'Peter', 'John']).toContain(output.name);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(dedent`
        Entity Test {
            name: weighted("Max":100, "Peter":0, "John":0)
        }`);

        let [name] = properties(doc);

        expect(hover(name)).toBe(`name: "Max"`);

        expect(hover(name.value)).toBe(dedent`
        weighted("Max":100, "Peter":0, "John":0)
        \n---\n
        Generates a weighted random value of \`["Max", "Peter", "John"]\`.

        For example, with a probablity of \`100%\`,
        \`"Max"\` is returned.

        Example: "Max"`);
    });
});
