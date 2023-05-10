import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import * as cli from '../../src/cli/generator';
import { createTempDir, createTempFile } from '../../src/utils/test';

function createObjectGenerator(doc: string | { text: string; filePath: string }) {
    doc = typeof doc === 'object' ? doc : { filePath: 'Test.ranger', text: doc };
    return cli.createObjectGenerator(doc);
}

describe('ObjectGenerator', () => {
    test('Static values', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            string: "Hello"
            bool: true
            num: 1.5
            nul: null
            list: [1, 2, 3]
            obj: {name: "Max"}
        }`);
        const output = objectGenerator.next();
        expect(output).toStrictEqual({
            string: 'Hello',
            bool: true,
            num: 1.5,
            nul: null,
            list: [1, 2, 3],
            obj: { name: 'Max' },
        });
    });

    test('References', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            num1: 1
            num2: num1
            num3: num2
            num4: Test.num3
            cur1: Account.currency
            cur2: account.currency
            account: Account
        }

        Entity Account {
            currency: "EUR"
        }`);
        const output = objectGenerator.next();
        expect(output).toStrictEqual({
            num1: 1,
            num2: 1,
            num3: 1,
            num4: 1,
            cur1: 'EUR',
            cur2: 'EUR',
            account: { currency: 'EUR' },
        });
    });

    test('Import', async () => {
        let accountFile = createTempFile({ postfix: '.ranger', data: `Entity Account { currency: "EUR"}` });
        const objectGenerator = await createObjectGenerator(`
        from "${accountFile.name}" import Account
        Entity User {
            name: "John"
            account: Account
        }`);

        const output = objectGenerator.next();
        expect(output).toStrictEqual({
            name: 'John',
            account: { currency: 'EUR' },
        });
    });

    test('Multiple Imports', async () => {
        let accountFile = createTempFile({
            postfix: '.ranger',
            data: `
            Entity Account { currency: "EUR" }
            Entity Person { name: "John" }
            `,
        });
        let objectGenerator = await createObjectGenerator(`
        from "${accountFile.name}" import Account, Person
        Entity User {
            name: Person.name
            account: Account
        }`);
        let output = objectGenerator.next();
        expect(output).toStrictEqual({
            name: 'John',
            account: { currency: 'EUR' },
        });

        objectGenerator = await createObjectGenerator(`
        from "${accountFile.name}" import Account
        from "${accountFile.name}" import Person
        Entity User {
            name: Person.name
            account: Account
        }`);
        output = objectGenerator.next();
        expect(output).toStrictEqual({
            name: 'John',
            account: { currency: 'EUR' },
        });
    });

    test('random(a..b)', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            num: random(1..10)
        }`);
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(output.num).toBeGreaterThanOrEqual(1);
            expect(output.num).toBeLessThanOrEqual(10);
        });
    });

    test('random(a..b.00)', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            num: random(10.01..10.09)
        }`);
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            const num: number = output.num;
            expect(num).toBeGreaterThanOrEqual(10.01);
            expect(num).toBeLessThanOrEqual(10.09);
            expect(num.toString()).toMatch(/\d{2}\.\d{2}/);
        });
    });

    test('random([])', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            name: random("Max", "Peter", "John")
        }`);
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(['Max', 'Peter', 'John']).toContain(output.name);
        });
    });

    test('map(=>[])', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            lowercase: random("a", "b", "c", "d")
            uppercase: map(lowercase => ["A", "B", "C", "D"])
        }`);
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(['a', 'b', 'c', 'd']).toContain(output.lowercase);
            expect(output.uppercase).toBe(output.lowercase.toUpperCase());
        });
    });

    test('map(=>{})', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            lowercase: random("a", "b", "c", "d")
            uppercase: map(lowercase => {"a":"A", "b":"B", "c":"C", "d":"D"})
        }`);
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(['a', 'b', 'c', 'd']).toContain(output.lowercase);
            expect(output.uppercase).toBe(output.lowercase.toUpperCase());
        });
    });

    test('csv()', async () => {
        const csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            data: csv("${csvFile.name}", delimiter=",")
            first: data.first
        }`);
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(output).toStrictEqual({
                data: {
                    first: '1',
                    second: '2',
                    third: '3',
                },
                first: '1',
            });
        });
    });

    test('Relative paths', async () => {
        const tempDir = createTempDir();
        tempDir.createFile('data/data.csv', 'first,second,third\r\n1,2,3');

        const objectGenerator = await createObjectGenerator({
            filePath: `${tempDir.name}/Test.ranger`,
            text: `
            Entity Test {
                data: csv("./data/data.csv", delimiter=",")
            }`,
        });

        const output = objectGenerator.next();
        expect(output).toStrictEqual({
            data: {
                first: '1',
                second: '2',
                third: '3',
            },
        });
    });

    test('sequence()', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            num1: sequence(1)
            num2: sequence(11)
        }`);
        range(1, 20).forEach((i) => {
            const output = objectGenerator.next();
            expect(output.num1).toBe(i);
            expect(output.num2).toBe(10 + i);
        });
    });

    test('uuid()', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            id: uuid()
        }`);
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(output.id).toMatch(/\w{8}-\w{4}-4\w{3}-[89AB]\w{3}-\w{12}/i);
        });
    });

    test('regex()', async () => {
        const objectGenerator = await createObjectGenerator(`
        Entity Test {
            iban: /DE\\d{20}/
            email: /john\\.doe@(gmail|outlook)\\.com/
        }`);
        range(20).forEach((_) => {
            const output = objectGenerator.next();
            expect(output.iban).toMatch(/DE\d{20}/);
            expect(output.email).toMatch(/john\.doe@(gmail|outlook)\.com/);
        });
    });
});
