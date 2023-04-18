import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import * as cli from '../../src/cli/generator';
import { Objekt } from '../../src/language-server/generated/ast';
import { resolvePath } from '../../src/utils/documents';
import { createTempFile, escapePath, validate } from '../../src/utils/test';

function createObjectGenerator(doc: { text: string; filePath?: string }) {
    return cli.createObjectGenerator({ filePath: doc.filePath || 'Test.ranger', text: doc.text });
}

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

    test('random(a..b.00)', async () => {
        const objectGenerator = await createObjectGenerator({
            text: `
            Entity Test {
                num: random(10.01..10.09)
            }`,
        });
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            const num: number = output.num;
            expect(num).toBeGreaterThanOrEqual(10.01);
            expect(num).toBeLessThanOrEqual(10.09);
            expect(num.toString()).toMatch(/\d{2}\.\d{2}/);
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

    test('csv()', async () => {
        const csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });
        const filePath = escapePath(csvFile.name);
        const objectGenerator = await createObjectGenerator({
            text: `
            Entity Test {
                data: csv("${filePath}", delimiter=",")
            }`,
        });
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(output).toStrictEqual({
                data: {
                    first: '1',
                    second: '2',
                    third: '3',
                },
            });
        });
    });

    test('Resolve file path relative to Document', async () => {
        const { result } = await validate({
            text: `Entity Test { dummy: "Hello World" }`,
            filePath: '/workdir/app/Test.ranger',
        });
        const dummy = (result.entities[0].value as Objekt).properties[0];
        const resolve = (path, node) => resolvePath(path, node)!.replace(/\\/g, '/');

        expect(resolve('data.csv', dummy)).toBe('/workdir/app/data.csv');
        expect(resolve('../data.csv', dummy)).toBe('/workdir/data.csv');
        expect(resolve('sub/dir', dummy)).toBe('/workdir/app/sub/dir');
        expect(resolve('/sub/dir', dummy)).toBe('/sub/dir');
    });
});
