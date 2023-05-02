import dedent from 'dedent-js';
import { describe, test } from 'vitest';

import { createTempDir, parse, testQuickFix } from '../../src/utils/test';

describe('RangerActionProvider', () => {
    describe('fixEntity', () => {
        test('makeUpperCase', async () => {
            await testQuickFix({
                before: 'Entity customer {}',
                after: 'Entity Customer {}',
            });
        });
    });

    describe('fixFilePath', () => {
        test('replaceWithForwardSlashes', async () => {
            await testQuickFix({
                before: `
                Entity Customer {
                    data: csv(".\\\\folder\\\\customer.csv")
                }`,
                after: `
                Entity Customer {
                    data: csv("./folder/customer.csv")
                }`,
            });
        });
    });

    describe('fixMapToList', () => {
        test('convertTo_MapToObject', async () => {
            await testQuickFix({
                before: `
                Entity Customer {
                    gender: "male"
                    name: map(gender => ["Max", "Anna"])
                }`,
                after: `
                Entity Customer {
                    gender: "male"
                    name: map(gender => {"val0": "Max", "val1": "Anna"})
                }`,
            });
        });
    });

    describe('Unresolved reference', () => {
        test('suggestImport', async () => {
            let tempdir = createTempDir();
            let accountFile = tempdir.createFile('Account.ranger', `Entity Account {}`);
            let addressFile = tempdir.createFile('Address.ranger', `Entity Address {}`);
            await parse({ filePath: accountFile.name });
            await parse({ filePath: addressFile.name });

            await testQuickFix({
                before: dedent`
                Entity Customer {
                    account: Account
                }`,
                after: dedent`
                from ".${accountFile.name}" import Account

                Entity Customer {
                    account: Account
                }`,
            });

            await testQuickFix({
                before: dedent`
                from ".${accountFile.name}" import Account

                Entity Customer {
                    account: Account
                    address: Address
                }`,
                after: dedent`
                from ".${accountFile.name}" import Account
                from ".${addressFile.name}" import Address

                Entity Customer {
                    account: Account
                    address: Address
                }`,
            });
        });
    });
});
