import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

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

describe('map(=>[])', () => {
    test('Generate', async () => {
        const generator = await createObjectGenerator(`
        Entity Test {
            lowercase: random("a", "b", "c", "d")
            uppercase: map(lowercase => ["A", "B", "C", "D"])
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
            firstname: map(gender => ["Max"])
        }`);

        let [_gender, firstname] = properties(doc);

        expect(hover(firstname)).toBe(`firstname: "Max"`);

        expect(hover(firstname.value)).toBe(dedent`
        map(gender => ["Max"])
        \n---\n
        Evaluates the value of \`gender\` and chooses based on the result from possible values \\
        on the right hand side.

        For example, if \`gender\` matches \`"male"\`,
        \`"Max"\` is returned.

        Example: "Max"`);
    });

    describe('Validate', () => {
        test('IsBasedOnAList ✔', async () => {
            const document = await parseDocument(`
            Entity Customer {
                gender: random("male", "female")
                name: map(gender => ["Max", "Anna"])
            }`);

            expectNoIssues(document);
        });

        test('IsBasedOnAList ✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                gender: "male"
                name: map(gender => ["Max", "Anna"])
            }`);

            expectError(document, Issues.MapToList_NotBasedOnAListFunc.code, {
                node: properties(document)[1].value,
                property: 'source',
            });
        });

        test('NoCircularReference ✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                name: map(name => [1, 2, 3])
            }`);

            expectError(document, Issues.CircularReference.code, {
                node: firstValue(document),
                property: 'source',
            });
        });
    });
});
