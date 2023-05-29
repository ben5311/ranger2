import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties, rangerGenerator } from '../../../../src/utils/test';

describe('uuid()', () => {
    const document = `
    Entity Test {
        id: uuid()
    }`;

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.id).toMatch(/\w{8}-\w{4}-4\w{3}-[89AB]\w{3}-\w{12}/i);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [uuid] = properties(doc);
        const uuidValue = rangerGenerator.getValue(uuid);

        expect(hover(uuid)).toBe(`id: "${uuidValue}"`);

        expect(hover(uuid.value)).toBe(dedent`
        uuid()
        \n---\n
        Generates a random [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier).

        Example: "${uuidValue}"`);
    });
});
