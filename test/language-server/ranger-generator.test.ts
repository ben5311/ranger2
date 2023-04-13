import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator } from '../../src/cli/generator';

describe('ObjectGenerator', () => {
    test('Static values', async () => {
        const objectGenerator = await createObjectGenerator({
            text: `
            Entity Test {
                string: "Hello"
                bool: true
                num: 1
                nul: null
                list: [1, 2, 3]
                obj: {name: "Max"}
            }`,
        });
        const output = objectGenerator.next();
        expect(output).toStrictEqual({
            string: 'Hello',
            bool: true,
            num: 1,
            nul: null,
            list: [1, 2, 3],
            obj: { name: 'Max' },
        });
    });

    test('References', async () => {
        const objectGenerator = await createObjectGenerator({
            text: `
            Entity Test {
                num1: 1
                num2: num1
                num3: num2
                cur1: Account.currency
                cur2: account.currency
                account: Account
            }

            Entity Account {
                currency: "EUR"
            }
            `,
        });
        const output = objectGenerator.next();
        expect(output).toStrictEqual({
            num1: 1,
            num2: 1,
            num3: 1,
            cur1: 'EUR',
            cur2: 'EUR',
            account: { currency: 'EUR' },
        });
    });

    test('random(a..b)', async () => {
        const objectGenerator = await createObjectGenerator({
            text: `
            Entity Test {
                num: random(1..10)
            }`,
        });
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(output.num).toBeGreaterThanOrEqual(1);
            expect(output.num).toBeLessThanOrEqual(10);
        });
    });

    test('random([])', async () => {
        const objectGenerator = await createObjectGenerator({
            text: `
            Entity Test {
                name: random("Max", "Peter", "John")
            }`,
        });
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(['Max', 'Peter', 'John']).toContain(output.name);
        });
    });

    test('map(=>[])', async () => {
        const objectGenerator = await createObjectGenerator({
            text: `
            Entity Test {
                lowercase: random("a", "b", "c", "d")
                uppercase: map(lowercase => ["A", "B", "C", "D"])
            }`,
        });
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(['a', 'b', 'c', 'd']).toContain(output.lowercase);
            expect(output.uppercase).toBe(output.lowercase.toUpperCase());
        });
    });

    test('map(=>{})', async () => {
        const objectGenerator = await createObjectGenerator({
            text: `
            Entity Test {
                lowercase: random("a", "b", "c", "d")
                uppercase: map(lowercase => {"a":"A", "b":"B", "c":"C", "d":"D"})
            }`,
        });
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(['a', 'b', 'c', 'd']).toContain(output.lowercase);
            expect(output.uppercase).toBe(output.lowercase.toUpperCase());
        });
    });
});
