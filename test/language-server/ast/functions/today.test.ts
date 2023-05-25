import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('today()', () => {
    const document = `
    Entity Test {
        date: today()
    }`;
    const today = new Date().toISOString().substring(0, 10);

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.date).toBe(today);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [date] = properties(doc);

        expect(hover(date)).toBe(`date: "${today}"`);

        expect(hover(date.value)).toBe(dedent`
        today()
        \n---\n
        Retrieves the current date.

        It is determined once and remains constant throughout.

        Example: "${today}"`);
    });
});
