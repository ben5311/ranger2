import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { TodayFunc } from '../../../../src/language-server/generated/ast';
import { Issues } from '../../../../src/language-server/ranger-validator';
import {
    createObjectGenerator,
    expectError,
    expectNoIssues,
    hover,
    parseDocument,
    properties,
    secondValue,
} from '../../../../src/utils/test';

describe('today', () => {
    const document = `
    Entity Test {
        today1: today
        today2: today.minus(1 DAYS 1 MONTHS 1 WEEKS 1 YEARS).plus(1 DAYS 1 MONTHS 1 WEEKS 1 YEARS)
        tomorrow1: today.plus(1 DAYS)
        tomorrow2: today.plus(one DAYS)
        one: 1
    }`;
    const today = new Date().isoDate();
    const tomorrow = new Date().plusDays(1).isoDate();

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.today1).toBe(today);
            expect(output.today2).toBe(today);
            expect(output.tomorrow1).toBe(tomorrow);
            expect(output.tomorrow2).toBe(tomorrow);
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

        Example: "${today}"`);
    });

    describe('Validate', () => {
        test('HasValidDuration ✔', async () => {
            const document = await parseDocument(`
            Entity Test {
                numDays: random(1..100)
                date: today.plus(numDays DAYS)
            }`);

            expectNoIssues(document);
        });

        test('HasValidDuration ✖', async () => {
            const document = await parseDocument(`
            Entity Test {
                numDays: random("John", "Doe")
                date: today.plus(numDays DAYS)
            }`);

            expectError(document, Issues.InvalidDuration.code, {
                node: (secondValue(document) as TodayFunc).plusDuration!,
                property: 'days',
            });
        });
    });
});
