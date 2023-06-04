import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('today', () => {
    const document = `
    Entity Test {
        today1: today
        today2: today.minus(1 DAYS 1 MONTHS 1 WEEKS 1 YEARS).plus(1 DAYS 1 MONTHS 1 WEEKS 1 YEARS)
        tomorrow: today.plus(1 DAYS)
    }`;
    const today = new Date().isoDate();
    const tomorrow = new Date().plusDays(1).isoDate();

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.today1).toBe(today);
            expect(output.today2).toBe(today);
            expect(output.tomorrow).toBe(tomorrow);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [today1] = properties(doc);

        expect(hover(today1)).toBe(`today1: "${today}"`);

        expect(hover(today1.value)).toBe(dedent`
        today
        \n---\n
        Retrieves the current date.

        It is determined once and remains constant throughout.

        Example: "${today}"`);
    });
});
