import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';
import { now, today } from '../../../../src/utils/time';

describe('random(date..date)', () => {
    describe('Generate', () => {
        test('date', async () => {
            const generator = await createObjectGenerator(`
            Entity Test {
                date1: random("2020-01-01".."2020-12-31")
                date2: random("2020-01-01"..today)
                date3: random(today.."2100-12-31")
            }`);

            range(20).forEach((_) => {
                const output = generator.next();

                expect(output.date1).toMatch(/2020-\d{2}-\d{2}/);
                expect(output.date2).toMatch(/\d{4}-\d{2}-\d{2}/);
                expect(output.date3).toMatch(/\d{4}-\d{2}-\d{2}/);

                expect(output.date1 >= '2020-01-01').toBeTruthy();
                expect(output.date1 <= '2020-12-31').toBeTruthy();

                expect(output.date2 >= '2020-01-01').toBeTruthy();
                expect(output.date2 <= today()).toBeTruthy();

                expect(output.date3 >= today()).toBeTruthy();
                expect(output.date3 <= '2100-12-31').toBeTruthy();
            });
        });

        test('timestamp', async () => {
            const generator = await createObjectGenerator(`
            Entity Test {
                timestamp1: random("2020-01-01T10:00:00Z".."2020-12-31T19:00:00Z")
                timestamp2: random("2020-01-01T10:00:00Z"..now)
                timestamp3: random(now.."2100-12-31T00:00:00Z")
            }`);

            range(20).forEach((_) => {
                const output = generator.next();

                expect(output.timestamp1).toMatch(/2020-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
                expect(output.timestamp2).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
                expect(output.timestamp3).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

                expect(output.timestamp1 >= '2020-01-01T10:00:00.000Z').toBeTruthy();
                expect(output.timestamp1 <= '2020-12-31T19:00:00.000Z').toBeTruthy();

                expect(output.timestamp2 >= '2020-01-01T10:00:00.000Z').toBeTruthy();
                expect(output.timestamp2 <= now()).toBeTruthy();

                expect(output.timestamp3 >= now()).toBeTruthy();
                expect(output.timestamp3 <= '2100-12-31T00:00:00.000Z').toBeTruthy();
            });
        });
    });

    describe('Hover', () => {
        test('date', async () => {
            let doc = await parseDocument(dedent`
            Entity Test {
                date: random("2020-01-01".."2020-01-01")
            }`);

            let [date] = properties(doc);

            expect(hover(date)).toBe(`date: "2020-01-01"`);

            expect(hover(date.value)).toBe(dedent`
            random("2020-01-01".."2020-01-01")
            \n---\n
            Generates a random date between \`"2020-01-01"\` and \`"2020-01-01"\` (ends inclusive).

            Example: "2020-01-01"`);
        });

        test('timestamp', async () => {
            let doc = await parseDocument(dedent`
            Entity Test {
                timestamp: random("2020-01-01T10:00:00Z".."2020-01-01T10:00:00Z")
            }`);

            let [timestamp] = properties(doc);

            expect(hover(timestamp)).toBe(`timestamp: "2020-01-01T10:00:00.000Z"`);

            expect(hover(timestamp.value)).toBe(dedent`
            random("2020-01-01T10:00:00Z".."2020-01-01T10:00:00Z")
            \n---\n
            Generates a random timestamp between \`"2020-01-01T10:00:00Z"\` and \`"2020-01-01T10:00:00Z"\` (ends inclusive).

            Example: "2020-01-01T10:00:00.000Z"`);
        });
    });
});
