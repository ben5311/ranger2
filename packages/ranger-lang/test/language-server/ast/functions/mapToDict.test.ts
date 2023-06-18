import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('map(=>{})', () => {
    test('Generate', async () => {
        const generator = await createObjectGenerator(`
        Entity Test {
            lowercase: random("a", "b", "c", "d")
            uppercase: map(lowercase => {"a":"A", "b":"B", "c":"C", "d":"D"})
        }`);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(['a', 'b', 'c', 'd']).toContain(output.lowercase);
            expect(output.uppercase).toBe(output.lowercase.toUpperCase());
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(dedent`
        Entity Customer {
            gender: random("male")
            firstname: map(gender => {"male": "Max"})
        }`);

        let [_gender, firstname] = properties(doc);

        expect(hover(firstname)).toBe(`firstname: "Max"`);

        expect(hover(firstname.value)).toBe(dedent`
        map(gender => {"male": "Max"})
        \n---\n
        Evaluates the value of \`gender\` and chooses based on the result from possible values \\
        on the right hand side.

        For example, if \`gender\` matches \`"male"\`,
        \`"Max"\` is returned.

        Example: "Max"`);
    });
});
