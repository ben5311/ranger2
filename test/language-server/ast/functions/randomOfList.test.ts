import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('random(a, b, c)', () => {
    test('Generate', async () => {
        const generator = await createObjectGenerator(`
        Entity Test {
            name: random("Max", "Peter", "John")
        }`);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(['Max', 'Peter', 'John']).toContain(output.name);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(dedent`
        Entity Test {
            name: random("Max")
        }`);

        let [name] = properties(doc);

        expect(hover(name)).toBe(`name: "Max"`);

        expect(hover(name.value)).toBe(dedent`
        random("Max")
        \n---\n
        Generates a random element of the provided arguments.

        Example: "Max"`);
    });
});
