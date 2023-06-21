import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties, rangerGenerator } from '../../../../src/utils/test';

describe('now', () => {
    const document = `
    Entity Test {
        now1: now
        now2: now.minus(1 DAYS 1 MONTHS 1 WEEKS 1 YEARS).plus(1 DAYS 1 MONTHS 1 WEEKS 1 YEARS)
        tomorrow1: now.plus(1 DAYS)
        tomorrow2: now.plus(one DAYS)
        one: 1
    }`;
    const today = new Date().isoDate();
    const tomorrow = new Date().plusDays(1).isoDate();

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.now1).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/);
            expect(output.now2).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/);
            expect(output.tomorrow1).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/);
            expect(output.now1.substring(0, 10)).toBe(today);
            expect(output.now2.substring(0, 10)).toBe(today);
            expect(output.tomorrow1.substring(0, 10)).toBe(tomorrow);
            expect(output.tomorrow2.substring(0, 10)).toBe(tomorrow);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [now1] = properties(doc);
        const nowTimestamp = rangerGenerator.getValue(now1);

        expect(hover(now1)).toBe(`now1: "${nowTimestamp}"`);

        expect(hover(now1.value)?.trim()).toBe(dedent`
        now
        \n---\n
        Retrieves the current timestamp.

        Example: "${nowTimestamp}"`);
    });
});
