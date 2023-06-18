import { describe, expect, test } from 'vitest';

import { Issues } from '../../../src/language-server/ranger-validator';
import {
    createObjectGenerator,
    createTempDir,
    expectError,
    firstProperty,
    hover,
    parseDocument,
    properties,
} from '../../../src/utils/test';

describe('References', () => {
    const document = `
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
    }`;

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        const output = generator.next();

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

    test('Hover', async () => {
        const doc = await parseDocument(document);

        let [num1, num2, num3, num4, cur1, cur2, account] = properties(doc);

        expect(hover(num1)).toBe('num1: 1');
        expect(hover(num2)).toBe('num2: 1');
        expect(hover(num3)).toBe('num3: 1');
        expect(hover(num4)).toBe('num4: 1');
        expect(hover(cur1)).toBe('cur1: "EUR"');
        expect(hover(cur2)).toBe('cur2: "EUR"');
        expect(hover(account)).toBe('account: {\n  "currency": "EUR"\n}');

        expect(hover(num1.value)).toBe('1 : number');
        expect(hover(num2.value)).toBe('num1: 1');
        expect(hover(num3.value)).toBe('num2: 1');
        expect(hover(num4.value)).toBe('num3: 1');
        expect(hover(cur1.value)).toBe('currency: "EUR"');
        expect(hover(cur2.value)).toBe('currency: "EUR"');
        expect(hover(account.value)).toBe('Account: {\n  "currency": "EUR"\n}');
    });

    describe('Validate', () => {
        test('NoCircularReferences ✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                name: name
            }`);

            expectError(document, Issues.CircularReference.code, {
                node: firstProperty(document),
                property: 'value',
            });
        });

        test('NoCircularReferences ✖✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                first: second
                second: first
            }`);

            let [first, second] = properties(document);

            expectError(document, Issues.CircularReference.code, {
                node: first,
                property: 'value',
            });
            expectError(document, Issues.CircularReference.code, {
                node: second,
                property: 'value',
            });
        });

        test('NoCircularReferences ✖✖✖', async () => {
            const document = await parseDocument(`
            Entity Account {
                balance: 1000
                account: {
                    ref1: Account
                    ref2: Account.account
                }
            }`);

            let account = properties(document)[1];
            let [ref1, ref2] = properties(account);

            expectError(document, Issues.CircularReference.code, {
                node: ref1,
                property: 'value',
            });
            expectError(document, Issues.CircularReference.code, {
                node: ref2,
                property: 'value',
            });
        });

        test('NoCircularReferences ✖✖✖✖', async () => {
            const document = await parseDocument(`
            Entity Account {
                account: Customer.account
            }
            Entity Customer {
                account: Account
            }`);

            expectError(document, Issues.CircularReference.code, {
                node: firstProperty(document),
                property: 'value',
            });
        });

        test('NoCircularReferences ✖✖✖✖✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                account: Account
            }
            Entity Account {
                customer: Customer
            }`);

            expectError(document, Issues.CircularReference.code, {
                node: firstProperty(document),
                property: 'value',
            });
        });

        test('NoCircularReferences ✖✖✖✖✖✖', async () => {
            let tempdir = createTempDir();
            tempdir.createFile(
                'Customer.ranger',
                `
                from "./Account.ranger" import Account

                Entity Customer {
                    account: Account
                }`,
            );
            const accountFile = tempdir.createFile(
                'Account.ranger',
                `
                from "./Customer.ranger" import Customer

                Entity Account {
                    customer: Customer
                }`,
            );

            const document = await parseDocument({
                filePath: accountFile.name,
                text: accountFile.data,
            });

            expectError(document, Issues.CircularReference.code, {
                node: firstProperty(document),
                property: 'value',
            });
        });
    });
});
